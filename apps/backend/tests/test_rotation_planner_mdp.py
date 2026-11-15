"""The rotation planner's numbers: decision process, Q-learning, simulator kernel and replay."""

from dataclasses import replace
from functools import cache
from itertools import product

import numpy as np
import pytest
from rotation_sim import (
    COMPONENTS,
    TEST_YEARS,
    TRAIN_YEARS,
    Dataset,
    load_dataset,
    simulate_campaign,
    simulate_rotation,
)
from rotation_sim.oni import Oni

from app.core.config import RotationSimSettings
from app.modules.rotation_planner import kernel, mdp, pipeline, stats
from app.modules.rotation_planner.schemas import (
    STAGE_IDS,
    Action,
    BootstrapMethod,
    CampaignReplay,
    ConvergencePoint,
    EnsoReading,
    HeldOutComparison,
    Itinerary,
    OutcomeValues,
    PolicyResult,
    PriorityWeights,
    RotationPlanRequest,
    RotationPlanResult,
    SplitReplay,
    StageId,
)

SETTINGS = RotationSimSettings()
needs_simulator_data = pytest.mark.skipif(
    not (SETTINGS.rotation_sim_data_dir / "fields.json").is_file(),
    reason="Simulator inputs are not installed (scripts/rotation_sim/install.sh)",
)

MARGIN_ONLY = np.array([1.0, 0.0, 0.0, 0.0, 0.0])
UNIT_SCALES = np.ones(mdp.N_COMPONENTS)


def make_kernel(
    rewards: np.ndarray,
    next_level: np.ndarray,
    june_phase: list[int],
    august_phase: list[int],
    itinerary_winter: list[int],
) -> mdp.Kernel:
    """A kernel whose margin is `rewards[year, itinerary, level]` and whose other outcomes are 0."""
    outcomes = np.zeros((*rewards.shape, mdp.N_COMPONENTS))
    outcomes[..., 0] = rewards
    return mdp.Kernel(
        outcomes=outcomes,
        next_level=next_level.astype(np.intp),
        june_phase=np.array(june_phase, dtype=np.intp),
        august_phase=np.array(august_phase, dtype=np.intp),
        itinerary_winter=np.array(itinerary_winter, dtype=np.intp),
        n_winters=max(itinerary_winter) + 1,
    )


def tiny_kernel() -> mdp.Kernel:
    """Two training years, two water levels, two itineraries after one winter option.

    Year 0 is la Niña in June and August, year 1 is El Niño in both, so the August phase tells
    which year is coming. An itinerary leaves the soil at the level equal to its own index.
    """
    rewards = np.array(
        [
            [[1.0, 2.0], [0.0, 4.0]],  # year 0: itinerary 0, itinerary 1 at levels 0 and 1
            [[3.0, 5.0], [2.0, 1.0]],  # year 1
        ]
    )
    next_level = np.broadcast_to(np.arange(2)[None, :, None], rewards.shape)
    return make_kernel(rewards, next_level, [0, 2], [0, 2], [0, 0])


def tiny_process(horizon: int) -> mdp.Process:
    return mdp.Process(tiny_kernel(), MARGIN_ONLY, UNIT_SCALES, horizon, start_level=1)


def test_tiny_kernel_matches_the_hand_computed_optimum() -> None:
    # One campaign from level 1: La Niña (year 0) best is itinerary 1 with 4, El Niño (year 1)
    # best is itinerary 0 with 5, each phase with probability 1/2: 0.5 * 4 + 0.5 * 5.
    one = tiny_process(1)
    assert one.optimal_value(one.solve()) == pytest.approx(4.5, abs=1e-12)
    # Two campaigns: V1(level 0) = 0.5 * 1 + 0.5 * 3 = 2 and V1(level 1) = 4.5. La Niña at level 1:
    # itinerary 1 gives 4 + V1(1) = 8.5; El Niño: itinerary 0 gives 5 + V1(0) = 7. Mean 7.75.
    two = tiny_process(2)
    solution = two.solve()
    assert two.optimal_value(solution) == pytest.approx(7.75, abs=1e-12)
    assert solution.q.august[0, 1, 0, 0].tolist() == pytest.approx([4.0, 8.5])
    assert solution.q.august[0, 1, 0, 2].tolist() == pytest.approx([7.0, 5.5])


def test_evaluating_the_optimal_policy_gives_the_optimal_value() -> None:
    for horizon in (1, 2, 3):
        process = tiny_process(horizon)
        solution = process.solve()
        policy = mdp.greedy(solution.q)
        assert process.evaluate(policy) == pytest.approx(process.optimal_value(solution), abs=1e-12)


def test_optimum_beats_every_fixed_cycle_by_hand_computed_values() -> None:
    process = tiny_process(2)
    cycles = mdp.enumerate_cycles(2, max_length=2)
    assert cycles == [(0,), (1,), (0, 1)]
    values = {
        entered: process.evaluate(process.cycle_policy(entered))
        for cycle in cycles
        for entered in mdp.rotations(cycle)
    }
    # Itinerary 0 twice, itinerary 1 twice, then 0 followed by 1 and 1 followed by 0.
    assert values == pytest.approx({(0,): 5.5, (1,): 5.0, (0, 1): 4.5, (1, 0): 6.0})
    optimum = process.optimal_value(process.solve())
    assert all(optimum >= value for value in values.values())
    assert optimum > max(values.values())


def test_winter_choice_is_valued_before_the_phase_is_known() -> None:
    # Itineraries 0 and 1 follow winter 0; itinerary 2 follows winter 1 and always scores 3.
    rewards = np.array(
        [
            [[1.0, 2.0], [0.0, 4.0], [3.0, 3.0]],
            [[3.0, 5.0], [2.0, 1.0], [3.0, 3.0]],
        ]
    )
    kernel_ = make_kernel(
        rewards, np.zeros(rewards.shape), [0, 2], [0, 2], itinerary_winter=[0, 0, 1]
    )
    process = mdp.Process(kernel_, MARGIN_ONLY, UNIT_SCALES, 1, start_level=1)
    solution = process.solve()
    # Winter 0 is followed by the best itinerary for the phase that arrives: 4 or 5.
    assert solution.q.june[0, 1, 0].tolist() == pytest.approx([4.0, 3.0])
    assert solution.q.june[0, 1, 2].tolist() == pytest.approx([5.0, 3.0])
    assert mdp.greedy(solution.q).winter[0, 1].tolist() == [0, 0, 0]
    assert process.optimal_value(solution) == pytest.approx(4.5)


def reference_value(
    kernel_: mdp.Kernel,
    rewards: np.ndarray,
    horizon: int,
    start_level: int,
    cycle: tuple[int, ...] | None,
) -> float:
    """The same process written as plain recursion; `cycle=None` takes the best action."""
    years = range(kernel_.n_years)
    marginal = [float(np.mean(kernel_.june_phase == p)) for p in range(mdp.N_PHASES)]

    def drawn(phases: np.ndarray, phase: int) -> list[int]:
        return [y for y in years if phases[y] == phase] or list(years)

    @cache
    def june(k: int, level: int, phase: int) -> float:
        if k == horizon:
            return 0.0
        winters = (
            range(kernel_.n_winters)
            if cycle is None
            else [int(kernel_.itinerary_winter[cycle[k % len(cycle)]])]
        )
        ys = drawn(kernel_.june_phase, phase)
        values = [
            sum(august(k, level, w, int(kernel_.august_phase[y])) for y in ys) / len(ys)
            for w in winters
        ]
        return max(values)

    @cache
    def august(k: int, level: int, winter: int, phase: int) -> float:
        options = [i for i in range(kernel_.n_itineraries) if kernel_.itinerary_winter[i] == winter]
        if cycle is not None:
            options = [i for i in options if i == cycle[k % len(cycle)]] or options[:1]
        ys = drawn(kernel_.august_phase, phase)
        values = []
        for i in options:
            total = 0.0
            for y in ys:
                after = int(kernel_.next_level[y, i, level])
                total += rewards[y, i, level] + sum(
                    marginal[p] * june(k + 1, after, p) for p in range(mdp.N_PHASES)
                )
            values.append(total / len(ys))
        return max(values)

    return sum(marginal[p] * june(0, start_level, p) for p in range(mdp.N_PHASES))


@pytest.mark.parametrize(
    ("june_phase", "august_phase"),
    [
        ([0, 1, 2, 0, 1], [2, 0, 0, 1, 1]),
        # No year is neutral in June or El Niño in August: those phases fall back to all years.
        ([0, 0, 2, 2, 0], [1, 1, 1, 0, 0]),
    ],
)
def test_solution_and_evaluation_match_a_plain_recursion(
    june_phase: list[int], august_phase: list[int]
) -> None:
    rng = np.random.default_rng(7)
    shape = (5, 4, 3)  # years, itineraries, levels
    kernel_ = make_kernel(
        rng.normal(size=shape),
        rng.integers(0, 3, size=shape),
        june_phase,
        august_phase,
        itinerary_winter=[0, 0, 1, 1],
    )
    for horizon in (1, 2, 3):
        process = mdp.Process(kernel_, MARGIN_ONLY, UNIT_SCALES, horizon, start_level=1)
        rewards = process.reward
        solution = process.solve()
        expected = reference_value(kernel_, rewards, horizon, 1, None)
        assert process.optimal_value(solution) == pytest.approx(expected, abs=1e-10)
        assert process.evaluate(mdp.greedy(solution.q)) == pytest.approx(expected, abs=1e-10)
        for cycle in mdp.enumerate_cycles(kernel_.n_itineraries, 2):
            fixed = reference_value(kernel_, rewards, horizon, 1, cycle)
            assert process.evaluate(process.cycle_policy(cycle)) == pytest.approx(fixed, abs=1e-10)


def test_cycles_are_listed_once_per_rotation() -> None:
    cycles = mdp.enumerate_cycles(5)
    # 5 of length one, 10 of length two (not (a, a)), 40 of length three (not (a, a, a)).
    assert len(cycles) == 55
    assert (0, 0) not in cycles
    assert (0, 1) in cycles
    assert (1, 0) not in cycles
    assert mdp.rotations((0, 1, 2)) == [(0, 1, 2), (1, 2, 0), (2, 0, 1)]


def test_margin_only_weights_pick_the_itinerary_with_the_highest_mean_margin() -> None:
    rng = np.random.default_rng(3)
    years, itineraries, levels = 6, 3, 4
    outcomes = rng.normal(size=(years, itineraries, levels, mdp.N_COMPONENTS)) * 10
    outcomes[..., 0] += np.array([100.0, 300.0, 200.0])[None, :, None]  # itinerary 1 pays most
    outcomes[..., 1] += np.array([0.0, 50.0, 25.0])[None, :, None]  # and misses the most water
    kernel_ = mdp.Kernel(
        outcomes=outcomes,
        next_level=np.zeros((years, itineraries, levels), dtype=np.intp),
        june_phase=np.ones(years, dtype=np.intp),
        august_phase=np.ones(years, dtype=np.intp),
        itinerary_winter=np.zeros(itineraries, dtype=np.intp),
        n_winters=1,
    )
    outcome_scales = mdp.scales(kernel_)

    def chosen(weights: list[float]) -> list[int]:
        process = mdp.Process(
            kernel_, mdp.normalize_weights(weights), outcome_scales, 1, start_level=0
        )
        policy = mdp.greedy(process.solve().q)
        return policy.itinerary[0, :, 0, 1].tolist()

    by_mean_margin = outcomes[..., 0].mean(axis=0).argmax(axis=0).tolist()
    assert by_mean_margin == [1, 1, 1, 1]
    assert chosen([1, 0, 0, 0, 0]) == by_mean_margin
    # Putting the weight on the water deficit instead flips the choice to the driest-missing one.
    by_least_deficit = outcomes[..., 1].mean(axis=0).argmin(axis=0).tolist()
    assert chosen([0, 1, 0, 0, 0]) == by_least_deficit
    assert by_least_deficit != by_mean_margin


def test_scales_are_the_standard_deviation_of_the_given_campaigns_only() -> None:
    outcomes = np.zeros((3, 2, 2, mdp.N_COMPONENTS))
    outcomes[..., 0] = np.array([10.0, 20.0, 30.0])[:, None, None]
    outcomes[..., 1] = 7.0  # never varies: its scale is 1, not 0
    kernel_ = mdp.Kernel(
        outcomes=outcomes,
        next_level=np.zeros((3, 2, 2), dtype=np.intp),
        june_phase=np.zeros(3, dtype=np.intp),
        august_phase=np.zeros(3, dtype=np.intp),
        itinerary_winter=np.zeros(2, dtype=np.intp),
        n_winters=1,
    )
    found = mdp.scales(kernel_)
    assert found[0] == pytest.approx(np.std([10.0, 20.0, 30.0]))
    assert found[1] == 1.0
    longer = mdp.Kernel(
        outcomes=np.concatenate([outcomes, np.full((1, 2, 2, mdp.N_COMPONENTS), 1000.0)]),
        next_level=np.zeros((4, 2, 2), dtype=np.intp),
        june_phase=np.zeros(4, dtype=np.intp),
        august_phase=np.zeros(4, dtype=np.intp),
        itinerary_winter=np.zeros(2, dtype=np.intp),
        n_winters=1,
    )
    assert mdp.scales(longer)[0] != pytest.approx(found[0])


def test_score_counts_margin_up_and_the_other_outcomes_down() -> None:
    outcomes = np.array([200.0, 10.0, 5.0, 20.0, 30.0])
    weights = mdp.normalize_weights([3, 2, 0, 0, 0])
    outcome_scales = np.array([100.0, 10.0, 1.0, 1.0, 1.0])
    # 0.6 * (+200 / 100) + 0.4 * (-10 / 10)
    assert mdp.scalarize(outcomes, weights, outcome_scales) == pytest.approx(0.8)
    with pytest.raises(ValueError, match="positive sum"):
        mdp.normalize_weights([0, 0, 0, 0, 0])


def test_q_learning_finds_the_optimal_policy_on_the_tiny_kernel() -> None:
    process = tiny_process(2)
    solution = process.solve()
    optimum = process.optimal_value(solution)
    points: list[tuple[int, float, float]] = []

    def checkpoint(done: int, tables: mdp.Tables) -> None:
        points.append(
            (done, process.evaluate(mdp.greedy(tables)), process.agreement(tables, solution))
        )

    process.train_q(episodes=8_000, checkpoints=40, seed=2026, on_checkpoint=checkpoint)

    assert [done for done, _, _ in points] == [200 * n for n in range(1, 41)]
    assert all(score <= optimum + 1e-9 for _, score, _ in points)
    assert points[-1][2] == 1.0
    assert points[-1][1] == pytest.approx(optimum, abs=1e-9)


def test_q_learning_is_reproducible_for_a_seed() -> None:
    process = tiny_process(2)
    first = process.train_q(400, 4, 11, lambda done, tables: None)
    second = process.train_q(400, 4, 11, lambda done, tables: None)
    other = process.train_q(400, 4, 12, lambda done, tables: None)
    assert np.array_equal(first.august, second.august)
    assert not np.array_equal(first.august, other.august)
    with pytest.raises(ValueError, match="multiple"):
        process.train_q(401, 4, 11, lambda done, tables: None)


def test_enso_phase_thresholds() -> None:
    assert kernel.enso_phase_index(0.5) == 2
    assert kernel.enso_phase_index(0.49) == 1
    assert kernel.enso_phase_index(-0.49) == 1
    assert kernel.enso_phase_index(-0.5) == 0


# One campaign at a time and ENSO transitions ----------------------------------------------


def test_a_one_campaign_policy_is_repeated_across_the_horizon() -> None:
    one = tiny_process(1)
    solution = one.solve()
    one_campaign = mdp.greedy(solution.q)
    tiled = mdp.repeat_policy(one_campaign, 3)
    assert tiled.winter.shape[0] == tiled.itinerary.shape[0] == 3
    for k in range(3):
        assert np.array_equal(tiled.winter[k], one_campaign.winter[0])
        assert np.array_equal(tiled.itinerary[k], one_campaign.itinerary[0])
    # One campaign long, the greedy policy is the optimum; three long it can only do worse.
    assert one.evaluate(mdp.repeat_policy(one_campaign, 1)) == pytest.approx(
        one.optimal_value(solution), abs=1e-12
    )
    three = tiny_process(3)
    assert three.evaluate(tiled) <= three.optimal_value(three.solve()) + 1e-12
    with pytest.raises(ValueError, match="one-campaign"):
        mdp.repeat_policy(tiled, 3)


def test_one_campaign_at_a_time_loses_to_planning_ahead_when_the_soil_matters() -> None:
    # One campaign year and two water levels. Itinerary 0 pays 3 at level 1 and 1 at level 0 and
    # leaves the soil at level 0; itinerary 1 pays 2 and 0 and leaves it at level 1.
    rewards = np.array([[[1.0, 3.0], [0.0, 2.0]]])
    next_level = np.broadcast_to(np.arange(2)[None, :, None], rewards.shape)
    kernel_ = make_kernel(rewards, next_level, [1], [1], [0, 0])
    three = mdp.Process(kernel_, MARGIN_ONLY, UNIT_SCALES, 3, start_level=1)
    one = mdp.Process(kernel_, MARGIN_ONLY, UNIT_SCALES, 1, start_level=1)
    myopic = mdp.repeat_policy(mdp.greedy(one.solve().q), 3)
    # Greedy mines the soil every time: 3 + 1 + 1. The optimum invests twice, then mines: 2 + 2 + 3.
    assert three.evaluate(myopic) == pytest.approx(5.0)
    assert three.optimal_value(three.solve()) == pytest.approx(7.0)


def test_phase_transitions_count_the_training_campaigns_and_report_an_empty_phase_as_zero() -> None:
    shape = (5, 4, 3)
    cases = [
        # (June, August) pairs: (0, 2) (1, 0) (2, 0) (0, 1) (1, 1)
        ([0, 1, 2, 0, 1], [2, 0, 0, 1, 1], [[0, 1, 1], [1, 1, 0], [1, 0, 0]]),
        # No campaign is neutral in June: that row stays zero although the solver falls back.
        ([0, 0, 2, 2, 0], [1, 1, 1, 0, 0], [[1, 2, 0], [0, 0, 0], [1, 1, 0]]),
    ]
    for june_phase, august_phase, expected in cases:
        kernel_ = make_kernel(
            np.zeros(shape), np.zeros(shape), june_phase, august_phase, [0, 0, 1, 1]
        )
        process = mdp.Process(kernel_, MARGIN_ONLY, UNIT_SCALES, 1, start_level=1)
        counts = process.phase_transitions()
        assert counts.tolist() == expected
        assert counts.sum() == kernel_.n_years
        assert counts.sum(axis=1).tolist() == process.phase_counts_june.tolist()
        assert counts.sum(axis=0).tolist() == process.phase_counts_august.tolist()


# Held-out statistics -----------------------------------------------------------------------


def reference_interval(differences: np.ndarray, block_campaigns: int) -> tuple[float, float]:
    """Every ordered resample of the blocks, built by joining the blocks themselves."""
    blocks = [
        differences[start : start + block_campaigns]
        for start in range(0, len(differences), block_campaigns)
    ]
    means = [np.concatenate(chosen).mean() for chosen in product(blocks, repeat=len(blocks))]
    low, high = np.percentile(means, [2.5, 97.5])
    return float(low), float(high)


def test_the_block_interval_of_constant_differences_has_no_width() -> None:
    low, high = stats.block_interval(np.full(12, 0.3))
    assert low == pytest.approx(0.3)
    assert high == pytest.approx(0.3)


def test_four_negative_blocks_give_an_interval_below_zero() -> None:
    low, high = stats.block_interval(np.repeat([-0.5, -0.1, -0.3, -0.2], 3))
    assert low < high < 0


def test_alternating_blocks_give_an_interval_around_zero() -> None:
    low, high = stats.block_interval(np.repeat([0.4, -0.4, 0.4, -0.4], 3))
    assert low < 0 < high


@pytest.mark.parametrize(("campaigns", "block_campaigns"), [(12, 3), (8, 2), (15, 5)])
def test_the_block_interval_matches_an_independent_enumeration(
    campaigns: int, block_campaigns: int
) -> None:
    differences = np.random.default_rng(5).normal(size=campaigns)
    expected = reference_interval(differences, block_campaigns)
    assert stats.block_interval(differences, block_campaigns) == pytest.approx(expected)


def test_the_block_interval_needs_whole_blocks() -> None:
    with pytest.raises(ValueError, match="do not split"):
        stats.block_interval(np.zeros(10))


def test_the_lower_tail_is_the_mean_of_the_worst_fifth_rounded_up() -> None:
    twelve = np.array([5.0, -2.0, 9.0, 0.0, 3.0, 7.0, 1.0, 8.0, 6.0, 4.0, 10.0, 2.0])
    mean, count = stats.lower_tail_mean(twelve)
    assert count == 3
    assert mean == pytest.approx((-2.0 + 0.0 + 1.0) / 3)
    twenty_nine = np.arange(29.0)[::-1] * 2.0
    mean, count = stats.lower_tail_mean(twenty_nine)
    assert count == 6
    assert mean == pytest.approx((0.0 + 2.0 + 4.0 + 6.0 + 8.0 + 10.0) / 6)
    assert stats.lower_tail_mean(np.arange(10.0))[1] == 2


OPTIMAL_OUTCOMES = OutcomeValues(
    margin_usd_ha=500.0, deficit_mm=40.0, bare_days=30.0, bare_rain_mm=20.0, drainage_mm=10.0
)
RIVAL_OUTCOMES = OutcomeValues(
    margin_usd_ha=400.0, deficit_mm=60.0, bare_days=30.0, bare_rain_mm=25.0, drainage_mm=5.0
)


def hand_built_policy(
    policy_id: str,
    scores: list[float],
    mean_outcomes: OutcomeValues,
    lower_tail_margin: float,
    first_year: int = 2013,
) -> PolicyResult:
    campaigns = [
        CampaignReplay(
            campaign_start_year=first_year + index,
            enso_june="neutral",
            enso_august="neutral",
            water_start_fraction=0.5,
            itinerary=Itinerary(winter="fallow", summer="maize"),
            score=score,
            outcomes=mean_outcomes,
        )
        for index, score in enumerate(scores)
    ]
    split = SplitReplay(
        first_year=first_year,
        last_year=first_year + len(scores) - 1,
        mean_score=float(np.mean(scores)),
        mean_outcomes=mean_outcomes,
        lower_tail_margin_usd_ha=lower_tail_margin,
        lower_tail_campaigns=3,
        campaigns=campaigns,
    )
    return PolicyResult(
        policy_id=policy_id,
        kind="optimal" if policy_id == "optimal" else "named",
        label=policy_id,
        is_current=False,
        note=None,
        sequence=None,
        expected_score=0.0,
        train=split,
        test=split,
    )


# Multiples of a quarter, so that adding and subtracting them is exact.
GAINS = np.array([0.5, 0.0, -0.25, 0.75, 0.25, 0.0, 0.5, 0.25, 1.0, 0.0, 0.25, 0.5])


def compare_with_rival(differences: np.ndarray, first_year: int = 2013) -> HeldOutComparison:
    rival_scores = [float(i) for i in range(len(differences))]
    optimal_scores = (np.array(rival_scores) + differences).tolist()
    optimal = hand_built_policy("optimal", optimal_scores, OPTIMAL_OUTCOMES, 450.0)
    rival = hand_built_policy("named:rival", rival_scores, RIVAL_OUTCOMES, 300.0, first_year)
    return pipeline._held_out(optimal, rival)


def test_held_out_comparison_pairs_campaigns_and_counts_strict_wins() -> None:
    comparison = compare_with_rival(GAINS)
    assert comparison.baseline_policy_id == "named:rival"
    assert comparison.mean_score_difference == pytest.approx(float(GAINS.mean()))
    assert comparison.campaigns == 12
    # Eight campaigns are won, three tie and one is lost: ties are not wins.
    assert comparison.campaigns_won == 8
    assert comparison.interval_low == pytest.approx(reference_interval(GAINS, 3)[0])
    assert comparison.interval_high == pytest.approx(reference_interval(GAINS, 3)[1])
    assert comparison.interval_low <= comparison.mean_score_difference <= comparison.interval_high
    assert comparison.conclusion == "better"
    assert comparison.lower_tail_margin_difference_usd_ha == 150.0
    # Optimal minus the rival, outcome by outcome, in each outcome's own units.
    assert comparison.outcome_differences == OutcomeValues(
        margin_usd_ha=100.0, deficit_mm=-20.0, bare_days=0.0, bare_rain_mm=-5.0, drainage_mm=5.0
    )


def test_held_out_mean_is_the_difference_of_the_policies_test_means() -> None:
    optimal = hand_built_policy("optimal", [1.0, 2.0, 4.0] * 4, OPTIMAL_OUTCOMES, 450.0)
    rival = hand_built_policy("named:rival", [0.5, 2.5, 1.0] * 4, RIVAL_OUTCOMES, 300.0)
    comparison = pipeline._held_out(optimal, rival)
    assert comparison.mean_score_difference == pytest.approx(
        optimal.test.mean_score - rival.test.mean_score
    )
    assert comparison.mean_score_difference == pytest.approx(7 / 3 - 4 / 3)


@pytest.mark.parametrize(
    ("differences", "conclusion", "won"),
    [
        (GAINS, "better", 8),
        (-GAINS, "worse", 1),
        (np.repeat([0.5, -0.5, 0.5, -0.5], 3), "inconclusive", 6),
        (np.zeros(12), "identical", 0),
    ],
)
def test_held_out_conclusion_follows_the_interval(
    differences: np.ndarray, conclusion: str, won: int
) -> None:
    comparison = compare_with_rival(differences)
    assert comparison.conclusion == conclusion
    assert comparison.campaigns_won == won
    if conclusion == "better":
        assert comparison.interval_low > 0
    if conclusion == "worse":
        assert comparison.interval_high < 0
    if conclusion == "identical":
        assert (comparison.interval_low, comparison.interval_high) == (0.0, 0.0)


def test_differences_below_the_tolerance_count_as_identical() -> None:
    assert compare_with_rival(np.full(12, 1e-12)).conclusion == "identical"
    assert compare_with_rival(np.full(12, 1e-6)).conclusion == "better"


def test_held_out_comparison_needs_the_same_campaigns() -> None:
    with pytest.raises(ValueError, match="same campaigns"):
        compare_with_rival(GAINS, first_year=2014)


# Named strategies --------------------------------------------------------------------------

PERGAMINO_ITINERARIES: tuple[tuple[Action, Action], ...] = (
    ("fallow", "fallow"),
    ("fallow", "soybean_first"),
    ("fallow", "maize"),
    ("wheat", "fallow"),
    ("wheat", "soybean_second"),
)
CHARATA_ITINERARIES = PERGAMINO_ITINERARIES[:4]


def test_case_labels_map_to_itineraries() -> None:
    resolved = pipeline.resolve_sequence(
        ["Maize", "Soybean", "Wheat / second soybean"], PERGAMINO_ITINERARIES, "Pergamino"
    )
    assert resolved == (2, 1, 4)


def test_winter_cover_crop_is_unavailable_with_a_reason() -> None:
    resolved = pipeline.resolve_sequence(
        ["Winter cover crop", "Soybean"], PERGAMINO_ITINERARIES, "Pergamino"
    )
    assert isinstance(resolved, pipeline.Unavailable)
    assert "Cover crops are not modelled" in resolved.reason


def test_second_soybean_is_unavailable_where_it_is_not_simulated() -> None:
    resolved = pipeline.resolve_sequence(
        ["Wheat / second soybean", "Maize", "Soybean"], CHARATA_ITINERARIES, "Chacabuco"
    )
    assert isinstance(resolved, pipeline.Unavailable)
    assert "Second soybean is not simulated for Chacabuco" in resolved.reason


# Simulator ---------------------------------------------------------------------------------


@cache
def dataset() -> Dataset:
    return load_dataset(SETTINGS.rotation_sim_data_dir, SETTINGS.rotation_sim_config_dir)


@needs_simulator_data
def test_kernel_entry_equals_a_direct_simulation_from_that_water_level() -> None:
    simulator = kernel.RegionSimulator.load("pergamino")
    calls: list[int] = []
    training = simulator.build_kernel(calls.append)
    levels = kernel.N_WATER_LEVELS
    assert calls == list(range(levels, simulator.n_simulated_campaigns + 1, levels))
    assert training.n_years == len(TRAIN_YEARS)
    assert training.n_levels == kernel.N_WATER_LEVELS

    year_index, level = 7, 3
    itinerary = simulator.itineraries.index(("wheat", "soybean_second"))
    data = dataset()
    field = next(f for f in data.fields if f.field_id == "pergamino")
    direct = simulate_campaign(
        data.model,
        field,
        data.weather["pergamino"][TRAIN_YEARS[year_index]],
        "wheat",
        "soybean_second",
        level * field.taw_mm / (kernel.N_WATER_LEVELS - 1),
        data.model.initial_surface_depletion_mm,
    )
    expected = [float(direct.components[name]) for name in COMPONENTS]
    assert training.outcomes[year_index, itinerary, level].tolist() == pytest.approx(expected)
    end_level = mdp.water_level(float(direct.water_end_mm) / field.taw_mm, kernel.N_WATER_LEVELS)
    assert training.next_level[year_index, itinerary, level] == end_level
    # 1987 had El Niño both in February-April (1.02) and July-September (1.46).
    assert (training.june_phase[3], training.august_phase[3]) == (2, 2)


@needs_simulator_data
def test_replaying_a_fixed_rotation_equals_the_simulators_own_rotation() -> None:
    simulator = kernel.RegionSimulator.load("pergamino")
    plan: list[tuple[Action, Action]] = [
        ("fallow", "maize"),
        ("fallow", "soybean_first"),
        ("wheat", "soybean_second"),
        ("wheat", "fallow"),
        ("fallow", "fallow"),
    ]
    cycle = tuple(simulator.itineraries.index(pair) for pair in plan)
    replayed = simulator.replay(
        2013, len(plan), pipeline.fixed_policy(cycle, simulator.itinerary_winter)
    )

    data = dataset()
    field = next(f for f in data.fields if f.field_id == "pergamino")
    rotation = simulate_rotation(
        data.model,
        field,
        data.weather["pergamino"],
        2013,
        [(None if w == "fallow" else w, None if s == "fallow" else s) for w, s in plan],
    )
    for campaign, outcome in zip(replayed, rotation, strict=True):
        assert campaign.year == outcome.year
        assert campaign.outcomes.tolist() == pytest.approx(
            [float(outcome.components[name]) for name in COMPONENTS]
        )
        assert campaign.water_start_fraction == pytest.approx(
            min(float(outcome.water_start_mm) / field.taw_mm, 1.0)
        )
    assert 2013 + len(plan) - 1 <= TEST_YEARS[-1]


@needs_simulator_data
def test_latest_enso_is_the_newest_campaign_after_the_held_out_ones() -> None:
    data = dataset()
    field = next(f for f in data.fields if f.field_id == "pergamino")

    def latest(readings: dict[tuple[str, int], float]) -> tuple[EnsoReading | None, ...]:
        return kernel.RegionSimulator(replace(data, oni=Oni(readings)), field).latest_enso()

    # 2026 is the newest campaign with a February-April value; its July-September is not out.
    june, august = latest({("FMA", 2025): 0.2, ("JAS", 2025): 0.9, ("FMA", 2026): -0.7})
    assert june == EnsoReading(season="FMA", year=2026, oni=-0.7, phase="la_nina")
    assert august is None
    # Both published, at the +-0.5 thresholds.
    june, august = latest({("FMA", 2025): 0.5, ("JAS", 2025): -0.5})
    assert june == EnsoReading(season="FMA", year=2025, oni=0.5, phase="el_nino")
    assert august == EnsoReading(season="JAS", year=2025, oni=-0.5, phase="la_nina")
    # A held-out campaign is never the answer.
    assert latest({("FMA", 2024): 0.9, ("JAS", 2024): 0.9}) == (None, None)


@needs_simulator_data
def test_the_setup_describes_the_region_without_simulating_campaigns() -> None:
    simulator = kernel.RegionSimulator.load("pergamino")
    setup = pipeline.describe_setup("pergamino")
    assert setup.region_id == "pergamino"
    assert setup.soil_capacity_mm == simulator.field.taw_mm
    assert setup.water_levels == kernel.N_WATER_LEVELS
    assert setup.initial_water_fraction == simulator.initial_water_fraction
    assert [(i.winter, i.summer) for i in setup.itineraries] == list(simulator.itineraries)
    assert "cover-soy" in {u.strategy_id for u in setup.unavailable_strategies}
    assert (setup.latest_enso_june, setup.latest_enso_august) == simulator.latest_enso()
    assert {"nasa-power", "noaa-oni"} <= {s.source_id for s in setup.sources}
    with pytest.raises(kernel.UnknownFieldError):
        pipeline.describe_setup("nowhere")


# Whole run ---------------------------------------------------------------------------------


class RecordingProgress:
    def __init__(self) -> None:
        self.started: list[StageId] = []
        self.finished: list[StageId] = []
        self.completed: dict[StageId, int] = {}
        self.totals: dict[StageId, int] = {}
        self.optimal_score: float | None = None
        self.checkpoints: list[ConvergencePoint] = []

    def start_stage(self, stage_id: StageId, total: int, unit: str) -> None:
        assert unit == pipeline.STAGE_UNITS[stage_id]
        self.started.append(stage_id)
        self.totals[stage_id] = total

    def advance(self, stage_id: StageId, completed: int) -> None:
        assert stage_id in self.started
        assert stage_id not in self.finished
        assert completed >= self.completed.get(stage_id, 0)
        self.completed[stage_id] = completed

    def finish_stage(self, stage_id: StageId) -> None:
        self.finished.append(stage_id)

    def set_optimal_score(self, score: float) -> None:
        self.optimal_score = score

    def add_checkpoint(self, point: ConvergencePoint) -> None:
        self.checkpoints.append(point)


def run_pipeline(
    region_id: str, horizon: int, weights: PriorityWeights
) -> tuple[RotationPlanResult, RecordingProgress]:
    progress = RecordingProgress()
    result = pipeline.run(
        region_id, RotationPlanRequest(weights=weights, horizon_campaigns=horizon), progress
    )
    return result, progress


# States of one campaign layer: June states plus August states for the two winter options.
STATES_PER_LAYER = kernel.N_WATER_LEVELS * mdp.N_PHASES * (1 + 2)


def check_baselines_and_held_out(result: RotationPlanResult) -> None:
    others = [p for p in result.policies if p.policy_id != "optimal"]
    held_out = result.verdict.held_out
    assert [c.baseline_policy_id for c in held_out] == [p.policy_id for p in others]
    for comparison, baseline in zip(held_out, others, strict=True):
        assert comparison.campaigns == len(baseline.test.campaigns) == len(TEST_YEARS)
        assert (
            comparison.interval_low - 1e-12
            <= comparison.mean_score_difference
            <= comparison.interval_high + 1e-12
        )
        assert 0 <= comparison.campaigns_won <= comparison.campaigns
    assert result.bootstrap == BootstrapMethod(
        confidence=0.95, block_campaigns=3, blocks=4, resamples=256
    )
    assert [(t.enso_june, t.enso_august) for t in result.enso_transitions] == [
        (june, august) for june in kernel.ENSO_PHASES for august in kernel.ENSO_PHASES
    ]
    assert sum(t.training_campaigns for t in result.enso_transitions) == len(TRAIN_YEARS)
    for policy in result.policies:
        # 29 training campaigns put the worst 6 in the tail; 12 held-out ones, the worst 3.
        for split, tail in ((policy.train, 6), (policy.test, 3)):
            margins = sorted(c.outcomes.margin_usd_ha for c in split.campaigns)
            assert split.lower_tail_campaigns == tail
            assert split.lower_tail_margin_usd_ha == pytest.approx(np.mean(margins[:tail]))


@needs_simulator_data
@pytest.mark.parametrize(
    ("region_id", "horizon", "has_second_soybean"), [("pergamino", 2, True), ("charata", 3, False)]
)
def test_a_run_reports_every_stage_and_a_consistent_verdict(
    region_id: str, horizon: int, has_second_soybean: bool
) -> None:
    weights = PriorityWeights(
        margin_usd_ha=0.5, deficit_mm=0.2, bare_days=0.1, bare_rain_mm=0.0, drainage_mm=0.2
    )
    result, progress = run_pipeline(region_id, horizon, weights)

    assert progress.started == list(STAGE_IDS) == progress.finished
    assert all(progress.completed[s] == progress.totals[s] for s in progress.completed)
    seeds = len(pipeline.AGENT_SEEDS)
    assert len(progress.checkpoints) == pipeline.CHECKPOINTS * seeds
    assert [point.seed for point in progress.checkpoints[:: pipeline.CHECKPOINTS]] == list(
        range(seeds)
    )
    reported = [point for point in progress.checkpoints if point.seed == 0]
    assert reported[-1].episodes == result.episodes == pipeline.EPISODES_PER_CAMPAIGN * horizon
    assert progress.totals["train_agent"] == result.episodes * seeds
    assert progress.optimal_score is not None

    by_id = {p.policy_id: p for p in result.policies}
    optimal, agent, best = by_id["optimal"], by_id["agent"], by_id["best_fixed"]
    # Adaptive policies first, then the best fixed rotation, its margin-only rival, the named ones.
    assert [p.kind for p in result.policies[:5]] == [
        "optimal",
        "agent",
        "myopic",
        "best_fixed",
        "margin_only",
    ]
    named = [p for p in result.policies if p.kind == "named"]
    assert len(named) == len(result.policies) - 5
    assert optimal.expected_score == pytest.approx(progress.optimal_score)
    assert agent.expected_score <= optimal.expected_score + 1e-9
    assert all(p.expected_score <= optimal.expected_score + 1e-9 for p in result.policies)
    assert all(p.expected_score <= best.expected_score + 1e-9 for p in named)
    assert all(point.agent_score <= progress.optimal_score + 1e-9 for point in progress.checkpoints)
    assert result.verdict.optimal_minus_best_fixed_expected >= -1e-9
    assert result.verdict.agent_agreement_share == reported[-1].agreement_share
    # The extra solves count too: the horizon, one campaign, and the horizon for margin only.
    assert progress.totals["solve_optimal"] == STATES_PER_LAYER * (2 * horizon + 1)
    check_baselines_and_held_out(result)
    assert sum(result.weights.model_dump().values()) == pytest.approx(1.0)
    assert [(p.train.first_year, p.test.last_year) for p in result.policies] == [
        (TRAIN_YEARS[0], TEST_YEARS[-1])
    ] * len(result.policies)

    unavailable = {u.strategy_id for u in result.unavailable_strategies}
    assert "cover-soy" in unavailable
    assert ("wheat-soy2-maize-soy" not in unavailable) is has_second_soybean
    assert any(p.is_current for p in result.policies if p.kind == "named")
    RotationPlanResult.model_validate_json(result.model_dump_json())


@needs_simulator_data
@pytest.mark.parametrize(
    ("horizon", "margin_first"), [(1, True), (2, True), (1, False)], ids=["h1", "h2", "h1-mixed"]
)
def test_baselines_follow_the_horizon_and_the_weights(horizon: int, margin_first: bool) -> None:
    weights = (
        PriorityWeights(margin_usd_ha=1, deficit_mm=0, bare_days=0, bare_rain_mm=0, drainage_mm=0)
        if margin_first
        else PriorityWeights(
            margin_usd_ha=0.6, deficit_mm=0, bare_days=0.4, bare_rain_mm=0, drainage_mm=0
        )
    )
    result, progress = run_pipeline("pergamino", horizon, weights)
    kinds = [p.kind for p in result.policies]
    assert ("myopic" in kinds) is (horizon > 1)
    assert ("margin_only" in kinds) is not margin_first
    solves = horizon + (1 if horizon > 1 else 0) + (0 if margin_first else horizon)
    assert progress.totals["solve_optimal"] == STATES_PER_LAYER * solves
    check_baselines_and_held_out(result)
