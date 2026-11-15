"""One planner run end to end: simulate, build the decision process, solve, train, score, replay."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

import numpy as np

from app.core.config import RotationSimSettings
from app.modules.cases import service as cases_service
from app.modules.rotation_planner import kernel, mdp, stats
from app.modules.rotation_planner.schemas import (
    Action,
    BootstrapMethod,
    CampaignReplay,
    Conclusion,
    ConvergencePoint,
    DecisionCell,
    EnsoTransition,
    HeldOutComparison,
    Itinerary,
    OutcomeValues,
    PlannerSource,
    PolicyKind,
    PolicyResult,
    PriorityWeights,
    RotationPlanRequest,
    RotationPlanResult,
    RotationPlanSetup,
    SplitReplay,
    StageId,
    UnavailableStrategy,
    Verdict,
)

STAGE_UNITS: dict[StageId, str] = {
    "simulate": "campaigns",
    "build_mdp": "states",
    "solve_optimal": "states",
    "train_agent": "episodes",
    "score_fixed": "rotations",
    "backtest": "campaigns",
}

EPISODES_PER_CAMPAIGN = 30_000
CHECKPOINTS = 40
# Independent agents, trained one after another: the spread of their curves shows that
# reaching the optimum does not depend on one lucky random seed.
AGENT_SEEDS = (2026, 2027, 2028, 2029, 2030)

# Two policies play alike when their scores differ by less than this on every held-out campaign.
IDENTICAL_TOLERANCE = 1e-9
# The baseline that plans for gross margin alone.
MARGIN_ONLY_WEIGHTS: mdp.FloatArray = np.array([1.0, 0.0, 0.0, 0.0, 0.0])

# The case labels the simulator can play, as (winter, summer) itineraries.
SEQUENCE_ITINERARIES: dict[str, tuple[Action, Action]] = {
    "Maize": ("fallow", "maize"),
    "Soybean": ("fallow", "soybean_first"),
    "Wheat / second soybean": ("wheat", "soybean_second"),
}
ITINERARY_LABELS: dict[tuple[Action, Action], str] = {
    ("fallow", "fallow"): "Fallow",
    ("fallow", "soybean_first"): "Soybean",
    ("fallow", "maize"): "Maize",
    ("wheat", "fallow"): "Wheat",
    ("wheat", "soybean_second"): "Wheat + second soybean",
}


class SimulatorDataError(Exception):
    """The simulator inputs are missing (scripts/rotation_sim/install.sh)."""


class ProgressReporter(Protocol):
    def start_stage(self, stage_id: StageId, total: int, unit: str) -> None: ...
    def advance(self, stage_id: StageId, completed: int) -> None: ...
    def finish_stage(self, stage_id: StageId) -> None: ...
    def set_optimal_score(self, score: float) -> None: ...
    def add_checkpoint(self, point: ConvergencePoint) -> None: ...


@dataclass(frozen=True)
class Unavailable:
    reason: str


@dataclass(frozen=True)
class NamedStrategy:
    strategy_id: str
    label: str
    is_current: bool
    note: str | None
    cycle: tuple[int, ...]  # itinerary indices, one per campaign


@dataclass(frozen=True)
class Candidate:
    """A policy to replay: how to decide, and what the decision process expects of it."""

    policy_id: str
    kind: PolicyKind
    label: str
    is_current: bool
    note: str | None
    cycle: tuple[int, ...] | None
    expected_score: float
    replay: kernel.ReplayPolicy


def ensure_inputs() -> None:
    settings = RotationSimSettings()
    if not (settings.rotation_sim_data_dir / "fields.json").is_file():
        raise SimulatorDataError(
            f"No simulator inputs in {settings.rotation_sim_data_dir}; run "
            "scripts/rotation_sim/install.sh"
        )


def describe_setup(region_id: str) -> RotationPlanSetup:
    """The region as the simulator sees it. Raises `kernel.UnknownFieldError` without a field."""
    sim = kernel.RegionSimulator.load(region_id)
    _, unavailable = _named_strategies(region_id, sim)
    june, august = sim.latest_enso()
    return RotationPlanSetup(
        region_id=region_id,
        soil_capacity_mm=sim.field.taw_mm,
        water_levels=kernel.N_WATER_LEVELS,
        initial_water_fraction=sim.initial_water_fraction,
        itineraries=[_itinerary(pair) for pair in sim.itineraries],
        unavailable_strategies=unavailable,
        latest_enso_june=june,
        latest_enso_august=august,
        sources=_sources(sim),
    )


def resolve_sequence(
    sequence: list[str], itineraries: tuple[tuple[Action, Action], ...], department: str
) -> tuple[int, ...] | Unavailable:
    """Map a case strategy's campaign labels to itinerary indices, or say why it cannot be."""
    cycle: list[int] = []
    for label in sequence:
        itinerary = SEQUENCE_ITINERARIES.get(label)
        if itinerary is None:
            if "cover crop" in label.lower():
                return Unavailable(
                    "Cover crops are not modelled by the simulator, which only knows wheat, "
                    "soybean and maize."
                )
            return Unavailable(f"The simulator has no itinerary for '{label}'.")
        if itinerary not in itineraries:
            if itinerary[1] == "soybean_second":
                return Unavailable(
                    f"Second soybean is not simulated for {department}: the MAGyP department "
                    "record has too few campaigns or repeats the first-soybean figure."
                )
            return Unavailable(f"'{label}' is not simulated for {department}.")
        cycle.append(itineraries.index(itinerary))
    return tuple(cycle)


def run(
    region_id: str, request: RotationPlanRequest, progress: ProgressReporter
) -> RotationPlanResult:
    weights = mdp.normalize_weights(
        [
            request.weights.margin_usd_ha,
            request.weights.deficit_mm,
            request.weights.bare_days,
            request.weights.bare_rain_mm,
            request.weights.drainage_mm,
        ]
    )
    horizon = request.horizon_campaigns
    sim = kernel.RegionSimulator.load(region_id)

    progress.start_stage("simulate", sim.n_simulated_campaigns, STAGE_UNITS["simulate"])
    training = sim.build_kernel(lambda done: progress.advance("simulate", done))
    progress.finish_stage("simulate")

    outcome_scales = mdp.scales(training)
    process = mdp.Process(training, weights, outcome_scales, horizon, sim.initial_level)
    progress.start_stage("build_mdp", process.n_states, STAGE_UNITS["build_mdp"])
    progress.finish_stage("build_mdp")

    # Two baselines are optima of other processes on the same kernel: planning one campaign at
    # a time, and planning the whole horizon for margin alone.
    margin_only = bool(np.array_equal(weights, MARGIN_ONLY_WEIGHTS))
    one_campaign = (
        mdp.Process(training, weights, outcome_scales, 1, sim.initial_level)
        if horizon > 1
        else None
    )
    margin_process = (
        None
        if margin_only
        else mdp.Process(training, MARGIN_ONLY_WEIGHTS, outcome_scales, horizon, sim.initial_level)
    )
    solved = [p for p in (process, one_campaign, margin_process) if p is not None]
    progress.start_stage(
        "solve_optimal", sum(p.n_states for p in solved), STAGE_UNITS["solve_optimal"]
    )
    states_solved = 0

    def solve(target: mdp.Process) -> mdp.Solution:
        nonlocal states_solved
        before = states_solved
        solution = target.solve(
            lambda layers: progress.advance(
                "solve_optimal", before + layers * target.states_per_layer
            )
        )
        states_solved += target.n_states
        return solution

    optimum = solve(process)
    one_campaign_solution = None if one_campaign is None else solve(one_campaign)
    margin_solution = None if margin_process is None else solve(margin_process)
    progress.finish_stage("solve_optimal")
    optimal_expected = process.optimal_value(optimum) / horizon
    progress.set_optimal_score(optimal_expected)

    episodes = EPISODES_PER_CAMPAIGN * horizon
    progress.start_stage("train_agent", episodes * len(AGENT_SEEDS), STAGE_UNITS["train_agent"])
    agents: list[mdp.Tables] = []
    final_agreement = 0.0
    for index, seed in enumerate(AGENT_SEEDS):

        def checkpoint(done: int, tables: mdp.Tables, index: int = index) -> None:
            nonlocal final_agreement
            agreement = process.agreement(tables, optimum)
            if index == 0:
                final_agreement = agreement
            progress.advance("train_agent", index * episodes + done)
            progress.add_checkpoint(
                ConvergencePoint(
                    seed=index,
                    episodes=done,
                    agent_score=process.evaluate(mdp.greedy(tables)) / horizon,
                    agreement_share=agreement,
                )
            )

        agents.append(process.train_q(episodes, CHECKPOINTS, seed, checkpoint))
    agent = agents[0]
    progress.finish_stage("train_agent")

    named, unavailable = _named_strategies(region_id, sim)
    cycles = mdp.enumerate_cycles(len(sim.itineraries))
    progress.start_stage("score_fixed", len(cycles) + len(named), STAGE_UNITS["score_fixed"])
    best_cycle, best_expected = cycles[0], -np.inf
    for done, cycle in enumerate(cycles, start=1):
        # The rotation is entered at the campaign that suits it best, chosen on training only.
        entered = max(mdp.rotations(cycle), key=lambda c: process.evaluate(process.cycle_policy(c)))
        expected = process.evaluate(process.cycle_policy(entered)) / horizon
        if expected > best_expected:
            best_cycle, best_expected = entered, expected
        progress.advance("score_fixed", done)
    named_expected: list[float] = []
    for done, strategy in enumerate(named, start=len(cycles) + 1):
        named_expected.append(process.evaluate(process.cycle_policy(strategy.cycle)) / horizon)
        progress.advance("score_fixed", done)
    progress.finish_stage("score_fixed")

    myopic_candidates: list[Candidate] = []
    if one_campaign_solution is not None:
        one_campaign_policy = mdp.greedy(one_campaign_solution.q)
        myopic_candidates.append(
            Candidate(
                "myopic",
                "myopic",
                "One campaign at a time (greedy)",
                False,
                "Plans only the coming campaign: the exact optimum for a one-campaign horizon, "
                "applied again at every campaign.",
                None,
                process.evaluate(mdp.repeat_policy(one_campaign_policy, horizon)) / horizon,
                adaptive_policy(one_campaign_policy),
            )
        )
    margin_candidates: list[Candidate] = []
    if margin_solution is not None:
        margin_policy = mdp.greedy(margin_solution.q)
        margin_candidates.append(
            Candidate(
                "margin_only",
                "margin_only",
                "Margin only",
                False,
                "The optimum for the same horizon when only gross margin counts, scored here "
                "with your priorities.",
                None,
                process.evaluate(margin_policy) / horizon,
                adaptive_policy(margin_policy),
            )
        )
    candidates = [
        Candidate(
            "optimal",
            "optimal",
            "Optimal policy (exact solution)",
            False,
            None,
            None,
            optimal_expected,
            adaptive_policy(mdp.greedy(optimum.q)),
        ),
        Candidate(
            "agent",
            "agent",
            "Q-learning agent",
            False,
            None,
            None,
            process.evaluate(mdp.greedy(agent)) / horizon,
            adaptive_policy(mdp.greedy(agent)),
        ),
        *myopic_candidates,
        Candidate(
            "best_fixed",
            "best_fixed",
            _cycle_label(best_cycle, sim.itineraries),
            False,
            f"Best of {len(cycles)} repeating cycles of up to {mdp.MAX_CYCLE_LENGTH} campaigns "
            "by expected score on training campaigns only.",
            best_cycle,
            best_expected,
            fixed_policy(best_cycle, sim.itinerary_winter),
        ),
        *margin_candidates,
        *(
            Candidate(
                f"named:{strategy.strategy_id}",
                "named",
                strategy.label,
                strategy.is_current,
                strategy.note,
                strategy.cycle,
                expected,
                fixed_policy(strategy.cycle, sim.itinerary_winter),
            )
            for strategy, expected in zip(named, named_expected, strict=True)
        ),
    ]

    split_years = (sim.train_years, sim.test_years)
    progress.start_stage(
        "backtest",
        len(candidates) * sum(len(years) for years in split_years),
        STAGE_UNITS["backtest"],
    )
    replayed = 0

    def count_campaign() -> None:
        nonlocal replayed
        replayed += 1
        progress.advance("backtest", replayed)

    def replay_split(candidate: Candidate, years: tuple[int, ...]) -> SplitReplay:
        return _replay_split(sim, candidate.replay, years, weights, outcome_scales, count_campaign)

    policies = [
        PolicyResult(
            policy_id=candidate.policy_id,
            kind=candidate.kind,
            label=candidate.label,
            is_current=candidate.is_current,
            note=candidate.note,
            sequence=_sequence(candidate.cycle, sim.itineraries),
            expected_score=candidate.expected_score,
            train=replay_split(candidate, sim.train_years),
            test=replay_split(candidate, sim.test_years),
        )
        for candidate in candidates
    ]
    progress.finish_stage("backtest")

    by_id = {policy.policy_id: policy for policy in policies}
    optimal_result, agent_result, best_result = (
        by_id["optimal"],
        by_id["agent"],
        by_id["best_fixed"],
    )
    verdict = Verdict(
        best_fixed_policy_id=best_result.policy_id,
        optimal_minus_best_fixed_expected=optimal_result.expected_score
        - best_result.expected_score,
        optimal_minus_best_fixed_train=optimal_result.train.mean_score
        - best_result.train.mean_score,
        agent_minus_optimal_expected=agent_result.expected_score - optimal_result.expected_score,
        agent_agreement_share=final_agreement,
        held_out=[
            _held_out(optimal_result, policy)
            for policy in policies
            if policy.policy_id != optimal_result.policy_id
        ],
    )
    return RotationPlanResult(
        horizon_campaigns=horizon,
        weights=PriorityWeights(
            margin_usd_ha=float(weights[0]),
            deficit_mm=float(weights[1]),
            bare_days=float(weights[2]),
            bare_rain_mm=float(weights[3]),
            drainage_mm=float(weights[4]),
        ),
        outcome_scales=_outcome_values(outcome_scales),
        soil_capacity_mm=sim.field.taw_mm,
        water_levels=kernel.N_WATER_LEVELS,
        episodes=episodes,
        policies=policies,
        decisions=_decision_cells(process, sim, optimum, agent),
        unavailable_strategies=unavailable,
        verdict=verdict,
        bootstrap=_bootstrap_method(len(sim.test_years)),
        enso_transitions=_enso_transitions(process),
        sources=_sources(sim),
    )


def _named_strategies(
    region_id: str, sim: kernel.RegionSimulator
) -> tuple[list[NamedStrategy], list[UnavailableStrategy]]:
    try:
        case = cases_service.get_case(region_id)
    except cases_service.CaseNotFoundError:
        return [], []
    named: list[NamedStrategy] = []
    unavailable: list[UnavailableStrategy] = []
    for strategy in case.compare.strategies:
        resolved = resolve_sequence(strategy.sequence, sim.itineraries, sim.field.department)
        if isinstance(resolved, Unavailable):
            unavailable.append(
                UnavailableStrategy(
                    strategy_id=strategy.strategy_id,
                    label=strategy.label,
                    reason=resolved.reason,
                )
            )
        else:
            named.append(
                NamedStrategy(
                    strategy.strategy_id,
                    strategy.label,
                    strategy.is_current,
                    strategy.current_note,
                    resolved,
                )
            )
    return named, unavailable


def adaptive_policy(policy: mdp.Policy) -> kernel.ReplayPolicy:
    """Re-plan every campaign with the first-campaign table (receding horizon)."""

    def choose_winter(index: int, water_fraction: float, june_phase: int) -> int:
        level = mdp.water_level(water_fraction, kernel.N_WATER_LEVELS)
        return int(policy.winter[0, level, june_phase])

    def choose_summer(index: int, water_fraction: float, winter: int, august_phase: int) -> int:
        level = mdp.water_level(water_fraction, kernel.N_WATER_LEVELS)
        return int(policy.itinerary[0, level, winter, august_phase])

    return kernel.ReplayPolicy(choose_winter, choose_summer)


def fixed_policy(cycle: tuple[int, ...], itinerary_winter: mdp.IntArray) -> kernel.ReplayPolicy:
    """Repeat `cycle` campaign after campaign, whatever the state."""

    def choose_winter(index: int, water_fraction: float, june_phase: int) -> int:
        return int(itinerary_winter[cycle[index % len(cycle)]])

    def choose_summer(index: int, water_fraction: float, winter: int, august_phase: int) -> int:
        return cycle[index % len(cycle)]

    return kernel.ReplayPolicy(choose_winter, choose_summer)


def _replay_split(
    sim: kernel.RegionSimulator,
    policy: kernel.ReplayPolicy,
    years: tuple[int, ...],
    weights: mdp.FloatArray,
    outcome_scales: mdp.FloatArray,
    on_campaign: Callable[[], None],
) -> SplitReplay:
    replayed = sim.replay(years[0], len(years), policy, on_campaign)
    scores = [float(mdp.scalarize(r.outcomes, weights, outcome_scales)) for r in replayed]
    mean_outcomes = np.mean([r.outcomes for r in replayed], axis=0)
    margins = np.array([r.outcomes[0] for r in replayed])  # outcome 0 is the gross margin
    lower_tail_margin, lower_tail_campaigns = stats.lower_tail_mean(margins)
    return SplitReplay(
        first_year=years[0],
        last_year=years[-1],
        mean_score=float(np.mean(scores)),
        mean_outcomes=_outcome_values(mean_outcomes),
        lower_tail_margin_usd_ha=lower_tail_margin,
        lower_tail_campaigns=lower_tail_campaigns,
        campaigns=[
            CampaignReplay(
                campaign_start_year=r.year,
                enso_june=kernel.ENSO_PHASES[r.june_phase],
                enso_august=kernel.ENSO_PHASES[r.august_phase],
                water_start_fraction=r.water_start_fraction,
                itinerary=_itinerary(sim.itineraries[r.itinerary]),
                score=score,
                outcomes=_outcome_values(r.outcomes),
            )
            for r, score in zip(replayed, scores, strict=True)
        ],
    )


def _held_out(optimal: PolicyResult, baseline: PolicyResult) -> HeldOutComparison:
    """Optimal minus `baseline` on the held-out campaigns, paired campaign by campaign."""
    pairs = list(zip(optimal.test.campaigns, baseline.test.campaigns, strict=True))
    if any(a.campaign_start_year != b.campaign_start_year for a, b in pairs):
        raise ValueError("The two policies were not replayed over the same campaigns")
    differences = np.array([a.score - b.score for a, b in pairs])
    low, high = stats.block_interval(differences)
    conclusion: Conclusion
    if np.abs(differences).max() < IDENTICAL_TOLERANCE:
        conclusion = "identical"
    elif low > 0:
        conclusion = "better"
    elif high < 0:
        conclusion = "worse"
    else:
        conclusion = "inconclusive"
    ours, theirs = optimal.test.mean_outcomes, baseline.test.mean_outcomes
    return HeldOutComparison(
        baseline_policy_id=baseline.policy_id,
        mean_score_difference=optimal.test.mean_score - baseline.test.mean_score,
        interval_low=low,
        interval_high=high,
        conclusion=conclusion,
        campaigns_won=int((differences > 0).sum()),
        campaigns=len(pairs),
        outcome_differences=OutcomeValues(
            margin_usd_ha=ours.margin_usd_ha - theirs.margin_usd_ha,
            deficit_mm=ours.deficit_mm - theirs.deficit_mm,
            bare_days=ours.bare_days - theirs.bare_days,
            bare_rain_mm=ours.bare_rain_mm - theirs.bare_rain_mm,
            drainage_mm=ours.drainage_mm - theirs.drainage_mm,
        ),
        lower_tail_margin_difference_usd_ha=optimal.test.lower_tail_margin_usd_ha
        - baseline.test.lower_tail_margin_usd_ha,
    )


def _bootstrap_method(n_campaigns: int) -> BootstrapMethod:
    blocks = stats.n_blocks(n_campaigns)
    return BootstrapMethod(
        confidence=stats.CONFIDENCE,
        block_campaigns=stats.BLOCK_CAMPAIGNS,
        blocks=blocks,
        resamples=blocks**blocks,
    )


def _enso_transitions(process: mdp.Process) -> list[EnsoTransition]:
    """All nine June x August phase pairs with their training campaigns, zeros included."""
    counts = process.phase_transitions()
    return [
        EnsoTransition(enso_june=june, enso_august=august, training_campaigns=int(counts[j, a]))
        for j, june in enumerate(kernel.ENSO_PHASES)
        for a, august in enumerate(kernel.ENSO_PHASES)
    ]


def _decision_cells(
    process: mdp.Process,
    sim: kernel.RegionSimulator,
    optimum: mdp.Solution,
    agent: mdp.Tables,
) -> list[DecisionCell]:
    """First-campaign decisions of the optimum and the agent, in every state."""
    levels = kernel.N_WATER_LEVELS
    chosen = mdp.greedy(agent)
    cells: list[DecisionCell] = []
    for level in range(levels):
        fraction = level / (levels - 1)
        for phase, enso in enumerate(kernel.ENSO_PHASES):
            q, best = optimum.q.june[0, level, phase], optimum.v_june[0, level, phase]
            agent_choice = int(chosen.winter[0, level, phase])
            agrees = bool(q[agent_choice] >= best - mdp.TIE_TOLERANCE)
            # A tie of optimal actions is reported as the agent's own: both are optimal.
            optimal_choice = agent_choice if agrees else int(q.argmax())
            cells.append(
                DecisionCell(
                    decision="june",
                    winter=None,
                    water_fraction=fraction,
                    enso=enso,
                    optimal_action=sim.winters[optimal_choice],
                    agent_action=sim.winters[agent_choice],
                    agrees=agrees,
                    training_campaigns=int(process.phase_counts_june[phase]),
                )
            )
    for level in range(levels):
        fraction = level / (levels - 1)
        for winter_index, winter in enumerate(sim.winters):
            for phase, enso in enumerate(kernel.ENSO_PHASES):
                q = optimum.q.august[0, level, winter_index, phase]
                best = optimum.v_august[0, level, winter_index, phase]
                agent_choice = int(chosen.itinerary[0, level, winter_index, phase])
                agrees = bool(q[agent_choice] >= best - mdp.TIE_TOLERANCE)
                optimal_choice = agent_choice if agrees else int(q.argmax())
                cells.append(
                    DecisionCell(
                        decision="august",
                        winter=winter,
                        water_fraction=fraction,
                        enso=enso,
                        optimal_action=sim.itineraries[optimal_choice][1],
                        agent_action=sim.itineraries[agent_choice][1],
                        agrees=agrees,
                        training_campaigns=int(process.phase_counts_august[phase]),
                    )
                )
    return cells


def _sources(sim: kernel.RegionSimulator) -> list[PlannerSource]:
    field = sim.field
    train = kernel.campaign_range(sim.train_years[0], sim.train_years[-1])
    everything = kernel.campaign_range(sim.train_years[0], sim.test_years[-1])
    point = f"lat {field.latitude_deg:.2f}, lon {field.longitude_deg:.2f}"
    sowing_sourced = sim.sowing_sourced
    return [
        PlannerSource(
            source_id="nasa-power",
            dataset="NASA POWER daily weather, community AG",
            provider="NASA POWER",
            period=f"Campaigns {everything}",
            location=f"Grid cell of about 55 km around {point} ({field.name})",
            used_for="Daily rain and reference evapotranspiration for the soil water balance",
        ),
        PlannerSource(
            source_id="soilgrids",
            dataset="SoilGrids 2.0 water content at 33 and 1500 kPa, 0 to 60 cm",
            provider="ISRIC - World Soil Information",
            period="Static modelled map",
            location=f"250 m pixel at {point}; the rooting depth is an assumption",
            used_for=f"Soil water capacity ({field.taw_mm:g} mm), the size of the water bucket",
        ),
        PlannerSource(
            source_id="magyp",
            dataset="Estimaciones agrícolas, 90th percentile of department yields",
            provider="MAGyP (Argentina)",
            period=f"Campaigns {train}",
            location=f"Department {field.department} ({field.department_id}), {field.province}",
            used_for="Attainable yield of each crop; a crop without a record is not simulated",
        ),
        PlannerSource(
            source_id="noaa-oni",
            dataset="Oceanic Niño Index: February-April on June 1, July-September in August",
            provider="NOAA",
            period=f"Campaigns {everything}",
            location="Global index",
            used_for="El Niño phase known at each decision (la Niña, neutral or El Niño at ±0.5)",
        ),
        PlannerSource(
            source_id="fao",
            dataset="FAO Irrigation and Drainage Papers 56 and 33",
            provider="FAO",
            period="Reference tables",
            location="Generic tables; stage lengths are transferred from other regions",
            used_for="Crop coefficients, growth stages and yield response to water stress",
        ),
        PlannerSource(
            source_id="sowing-calendar",
            dataset="Sowing dates by latitude band",
            provider=(
                "INTA trial reports (EEA Pergamino)" if sowing_sourced else "Team assumption"
            ),
            period="Same dates every campaign",
            location=f"Latitude band {field.calendar_band}",
            used_for="When each crop is sown and which winter crops fit before the August decision",
        ),
        PlannerSource(
            source_id="prices",
            dataset="Commodity Markets Pink Sheet: soybean, maize and wheat prices",
            provider="World Bank",
            period="October 2026 benchmark",
            location="International benchmark, not farm-gate prices",
            used_for="Revenue in the margin",
        ),
        PlannerSource(
            source_id="costs",
            dataset="Production costs per crop and cost of a fallow",
            provider="Team assumption (configs/parameters.csv, status ASSUMPTION)",
            period="Scenario",
            location="All regions",
            used_for="Costs in the margin",
        ),
    ]


def _outcome_values(values: mdp.FloatArray) -> OutcomeValues:
    return OutcomeValues(
        margin_usd_ha=float(values[0]),
        deficit_mm=float(values[1]),
        bare_days=float(values[2]),
        bare_rain_mm=float(values[3]),
        drainage_mm=float(values[4]),
    )


def _itinerary(pair: tuple[Action, Action]) -> Itinerary:
    return Itinerary(winter=pair[0], summer=pair[1])


def _sequence(
    cycle: tuple[int, ...] | None, itineraries: tuple[tuple[Action, Action], ...]
) -> list[Itinerary] | None:
    if cycle is None:
        return None
    return [_itinerary(itineraries[i]) for i in cycle]


def _cycle_label(cycle: tuple[int, ...], itineraries: tuple[tuple[Action, Action], ...]) -> str:
    return " / ".join(ITINERARY_LABELS[itineraries[i]] for i in cycle)
