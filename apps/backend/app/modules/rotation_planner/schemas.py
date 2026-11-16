"""The rotation-planner contract: a live run of the simulator, the exact optimum and an RL agent.

A run simulates the caller's region with the rotation simulator, builds a tabular decision
process from the training campaigns (1984/85-2012/13), solves it exactly, trains a Q-learning
agent on it and replays every policy through the simulator on training and held-out campaigns
(2013/14-2024/25). Every output is a simulated scenario, not an agronomic recommendation.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

OutcomeId = Literal["margin_usd_ha", "deficit_mm", "bare_days", "bare_rain_mm", "drainage_mm"]
Action = Literal["fallow", "wheat", "soybean_first", "soybean_second", "maize"]
EnsoPhase = Literal["la_nina", "neutral", "el_nino"]
StageId = Literal[
    "simulate", "build_mdp", "solve_optimal", "train_agent", "score_fixed", "backtest"
]
StageStatus = Literal["pending", "running", "done"]
RunStatus = Literal["queued", "running", "done", "failed", "cancelled"]
PolicyKind = Literal["optimal", "agent", "myopic", "margin_only", "best_fixed", "named"]
Decision = Literal["june", "august"]
# How the optimal policy compares with a baseline on the held-out campaigns.
Conclusion = Literal["better", "worse", "inconclusive", "identical"]
EnsoSeason = Literal["FMA", "JAS"]

# Execution order of a run; `RotationPlanRun.stages` always lists them in this order.
STAGE_IDS: tuple[StageId, ...] = (
    "simulate",
    "build_mdp",
    "solve_optimal",
    "train_agent",
    "score_fixed",
    "backtest",
)


class PlannerModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")


class OutcomeValues(PlannerModel):
    """The five simulator outcomes of one campaign (or their mean), in their own units."""

    margin_usd_ha: float
    deficit_mm: float
    bare_days: float
    bare_rain_mm: float
    drainage_mm: float


class PriorityWeights(PlannerModel):
    """How much each outcome matters. Margin counts up; the other four count down."""

    margin_usd_ha: float = Field(ge=0, le=1)
    deficit_mm: float = Field(ge=0, le=1)
    bare_days: float = Field(ge=0, le=1)
    bare_rain_mm: float = Field(ge=0, le=1)
    drainage_mm: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def _some_priority(self) -> PriorityWeights:
        if (
            self.margin_usd_ha
            + self.deficit_mm
            + self.bare_days
            + self.bare_rain_mm
            + self.drainage_mm
            <= 0
        ):
            raise ValueError("At least one priority must be above zero")
        return self


class RotationPlanRequest(PlannerModel):
    weights: PriorityWeights
    # Campaigns planned ahead: the policy is optimal over this many June-to-May campaigns.
    horizon_campaigns: int = Field(ge=1, le=5)


class StageProgress(PlannerModel):
    stage_id: StageId
    status: StageStatus
    # Real work units done so far, for example simulated campaigns or training episodes.
    completed: int = Field(ge=0)
    total: int = Field(ge=0)
    unit: str
    # Measured wall time; null until the stage starts.
    elapsed_ms: int | None = Field(ge=0)


class ConvergencePoint(PlannerModel):
    """One training checkpoint, scored exactly on the decision process, not by noisy returns."""

    # Which independently seeded agent this checkpoint belongs to. Agent 0 is the one reported
    # as "agent" in the result, its decision cells and the verdict.
    seed: int = Field(ge=0)
    episodes: int = Field(ge=0)
    agent_score: float
    agreement_share: float = Field(ge=0, le=1)


class Itinerary(PlannerModel):
    winter: Action
    summer: Action


class CampaignReplay(PlannerModel):
    """One real campaign replayed through the simulator under one policy."""

    campaign_start_year: int
    enso_june: EnsoPhase
    enso_august: EnsoPhase
    water_start_fraction: float = Field(ge=0, le=1)
    itinerary: Itinerary
    score: float
    outcomes: OutcomeValues


class SplitReplay(PlannerModel):
    first_year: int
    last_year: int
    mean_score: float
    mean_outcomes: OutcomeValues
    # Bad-year margin: mean gross margin of the worst ceil(n/5) campaigns of the split.
    lower_tail_margin_usd_ha: float
    lower_tail_campaigns: int = Field(ge=1)
    campaigns: list[CampaignReplay]


class PolicyResult(PlannerModel):
    policy_id: str
    kind: PolicyKind
    label: str
    is_current: bool
    note: str | None
    # The repeating cycle of a fixed rotation; null for the adaptive policies.
    sequence: list[Itinerary] | None
    # Mean score per campaign expected by the decision process (training campaigns).
    expected_score: float
    train: SplitReplay
    test: SplitReplay


class DecisionCell(PlannerModel):
    """What the first campaign's policy does in one state. August cells also carry the winter."""

    decision: Decision
    winter: Action | None
    water_fraction: float = Field(ge=0, le=1)
    enso: EnsoPhase
    optimal_action: Action
    agent_action: Action
    agrees: bool
    # Training campaigns behind this state's El Niño phase.
    training_campaigns: int = Field(ge=0)


class UnavailableStrategy(PlannerModel):
    strategy_id: str
    label: str
    reason: str


class HeldOutComparison(PlannerModel):
    """Optimal policy minus one baseline on the held-out campaigns, paired campaign by campaign."""

    baseline_policy_id: str
    mean_score_difference: float
    # Paired block-bootstrap interval of the mean difference (see `BootstrapMethod`).
    interval_low: float
    interval_high: float
    conclusion: Conclusion
    campaigns_won: int = Field(ge=0)
    campaigns: int = Field(ge=1)
    outcome_differences: OutcomeValues
    lower_tail_margin_difference_usd_ha: float


class BootstrapMethod(PlannerModel):
    """Every ordered resample of the held-out blocks, with replacement; no random draws."""

    confidence: float = Field(gt=0, lt=1)
    block_campaigns: int = Field(ge=1)
    blocks: int = Field(ge=1)
    resamples: int = Field(ge=1)


class EnsoTransition(PlannerModel):
    """How often a June El Niño phase was followed by each August phase in training."""

    enso_june: EnsoPhase
    enso_august: EnsoPhase
    training_campaigns: int = Field(ge=0)


class Verdict(PlannerModel):
    """Optimal policy against the baselines; the best fixed rotation is chosen on training only."""

    best_fixed_policy_id: str
    optimal_minus_best_fixed_expected: float
    optimal_minus_best_fixed_train: float
    agent_minus_optimal_expected: float
    agent_agreement_share: float = Field(ge=0, le=1)
    # One comparison per policy other than "optimal", in the order of `policies`.
    held_out: list[HeldOutComparison]


class PlannerSource(PlannerModel):
    """One dataset or reference behind the run: what, who, when and where."""

    source_id: str
    dataset: str
    provider: str
    period: str
    location: str
    used_for: str


class RotationPlanResult(PlannerModel):
    horizon_campaigns: int
    # Normalized to sum 1.
    weights: PriorityWeights
    # Training standard deviation of each outcome: the score divides by it.
    outcome_scales: OutcomeValues
    soil_capacity_mm: float
    water_levels: int
    episodes: int
    policies: list[PolicyResult]
    decisions: list[DecisionCell]
    unavailable_strategies: list[UnavailableStrategy]
    verdict: Verdict
    bootstrap: BootstrapMethod
    # All nine June x August phase pairs, zeros included.
    enso_transitions: list[EnsoTransition]
    sources: list[PlannerSource]


class EnsoReading(PlannerModel):
    """One published NOAA ONI season value and the phase it implies (+-0.5 thresholds)."""

    season: EnsoSeason
    year: int
    oni: float
    phase: EnsoPhase


class RotationPlanSetup(PlannerModel):
    """What the wizard needs before a run: the region as the simulator sees it."""

    region_id: str
    soil_capacity_mm: float
    water_levels: int
    # The simulator's declared starting soil water, as a fraction of capacity (an assumption).
    initial_water_fraction: float = Field(ge=0, le=1)
    itineraries: list[Itinerary]
    unavailable_strategies: list[UnavailableStrategy]
    # Latest campaign after the held-out ones with a published Feb-Apr value; Jul-Sep if published.
    latest_enso_june: EnsoReading | None
    latest_enso_august: EnsoReading | None
    sources: list[PlannerSource]


class RotationPlanRun(PlannerModel):
    run_id: str
    status: RunStatus
    region_id: str
    request: RotationPlanRequest
    stages: list[StageProgress]
    # Q-learning agents trained one after another, each from its own random seed.
    agent_seeds: int = Field(ge=1)
    # Exact optimum of the decision process, known once `solve_optimal` is done.
    optimal_score: float | None
    convergence: list[ConvergencePoint]
    error: str | None
    result: RotationPlanResult | None
