"""The rotation decision process: exact optimum, exact policy value and tabular Q-learning.

Pure numpy; it never imports the simulator. `Kernel` is what the simulator says each itinerary
does in each training campaign, starting from each soil water level.

The process, for a horizon of H campaigns (undiscounted, terminal value 0):

* Soil water is discretised into L levels and the planner knows it exactly.
* June state `(k, water, enso_june)`, with `k` campaigns already done: choose the winter option.
  A training campaign is then drawn uniformly among those whose February-April phase equals
  `enso_june`; its July-September phase becomes the August phase. No reward yet.
* August state `(k, water, winter, enso_august)`: choose the summer crop, which completes the
  itinerary. `water` is the water at the START of the campaign: the August decision does not see
  the soil water of August. The campaign year is redrawn uniformly among the training campaigns
  with that August phase, the campaign pays that year's score for `(itinerary, water)` and the
  water moves to that year's end-of-campaign level. Redrawing keeps the state Markov, at the
  price of forgetting which June year revealed the phase.
* The next June phase is drawn from the frequency of June phases over all training campaigns:
  phases are not chained from one campaign to the next.
* A phase with no training campaign falls back to all training campaigns (`phase_counts_*`
  still report the true count, zero).

The score of a campaign is `sum_c weight_c * sign_c * outcome_c / scale_c` (margin counts up,
the other four count down; the scale of each outcome is its standard deviation over the
training kernel).
"""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from itertools import product

import numpy as np
from numpy.typing import NDArray

FloatArray = NDArray[np.float64]
IntArray = NDArray[np.intp]
BoolArray = NDArray[np.bool_]

N_PHASES = 3
# Same order as the simulator's outcome components; margin counts up, the rest count down.
COMPONENT_NAMES = ("margin_usd_ha", "deficit_mm", "bare_days", "bare_rain_mm", "drainage_mm")
COMPONENT_SIGNS: FloatArray = np.array([1.0, -1.0, -1.0, -1.0, -1.0])
N_COMPONENTS = len(COMPONENT_NAMES)

# Two actions are treated as equally good when their optimal values differ by less than this.
TIE_TOLERANCE = 1e-9
EPSILON_END = 0.05
STEP_EXPONENT = 0.7
MAX_CYCLE_LENGTH = 3


@dataclass(frozen=True)
class Kernel:
    """Per training campaign, itinerary and starting water level: what happened."""

    outcomes: FloatArray  # (years, itineraries, levels, components), in the simulator's units
    next_level: IntArray  # (years, itineraries, levels): water level at the end of the campaign
    june_phase: IntArray  # (years,): ENSO phase known on June 1
    august_phase: IntArray  # (years,): ENSO phase known at the end of August
    itinerary_winter: IntArray  # (itineraries,): index of the winter option each one starts with
    n_winters: int

    @property
    def n_years(self) -> int:
        return int(self.outcomes.shape[0])

    @property
    def n_itineraries(self) -> int:
        return int(self.outcomes.shape[1])

    @property
    def n_levels(self) -> int:
        return int(self.outcomes.shape[2])


@dataclass(frozen=True)
class Tables:
    """Action values. Itineraries that cannot follow a winter hold `-inf`."""

    june: FloatArray  # (horizon, levels, phases, winters)
    august: FloatArray  # (horizon, levels, winters, phases, itineraries)


@dataclass(frozen=True)
class Solution:
    q: Tables
    v_june: FloatArray  # (horizon, levels, phases)
    v_august: FloatArray  # (horizon, levels, winters, phases)


@dataclass(frozen=True)
class Policy:
    winter: IntArray  # (horizon, levels, phases): winter option chosen in each June state
    itinerary: IntArray  # (horizon, levels, winters, phases): itinerary chosen in each August state


def water_level(fraction: float, n_levels: int) -> int:
    """The level a water fraction of capacity rounds to."""
    return int(np.rint(min(max(fraction, 0.0), 1.0) * (n_levels - 1)))


def water_levels(fractions: FloatArray, n_levels: int) -> IntArray:
    return np.rint(np.clip(fractions, 0.0, 1.0) * (n_levels - 1)).astype(np.intp)


def normalize_weights(weights: Sequence[float]) -> FloatArray:
    values = np.asarray(weights, dtype=float)
    total = float(values.sum())
    if values.shape != (N_COMPONENTS,) or (values < 0).any() or not total > 0:
        raise ValueError("Weights need one non-negative value per outcome and a positive sum")
    return values / total


def scales(kernel: Kernel) -> FloatArray:
    """Standard deviation of each outcome over the training kernel (1 if it never varies)."""
    spread = kernel.outcomes.reshape(-1, N_COMPONENTS).std(axis=0)
    return np.where(spread > 0, spread, 1.0)


def scalarize(outcomes: FloatArray, weights: FloatArray, outcome_scales: FloatArray) -> FloatArray:
    """Unitless score of outcomes (last axis: components); `weights` already sum to 1."""
    return outcomes @ (weights * COMPONENT_SIGNS / outcome_scales)


def greedy(tables: Tables) -> Policy:
    return Policy(winter=tables.june.argmax(axis=-1), itinerary=tables.august.argmax(axis=-1))


def enumerate_cycles(
    n_itineraries: int, max_length: int = MAX_CYCLE_LENGTH
) -> list[tuple[int, ...]]:
    """Every repeating cycle of 1 to `max_length` campaigns, once per cyclic rotation.

    Each cycle is the lexicographically smallest of its rotations; cycles that only repeat a
    shorter one, like (a, a), are dropped.
    """
    cycles: list[tuple[int, ...]] = []
    for length in range(1, max_length + 1):
        for cycle in product(range(n_itineraries), repeat=length):
            if cycle == min(rotations(cycle)) and not _repeats_shorter(cycle):
                cycles.append(cycle)
    return cycles


def rotations(cycle: tuple[int, ...]) -> list[tuple[int, ...]]:
    """The cyclic shifts of a cycle: the same rotation entered at each of its campaigns."""
    return [cycle[start:] + cycle[:start] for start in range(len(cycle))]


def _repeats_shorter(cycle: tuple[int, ...]) -> bool:
    length = len(cycle)
    return any(
        length % period == 0 and cycle == cycle[:period] * (length // period)
        for period in range(1, length)
    )


def _phase_members(phase: IntArray) -> tuple[BoolArray, IntArray]:
    """Which training years fall in each phase (all of them for an empty phase) and the counts."""
    members = phase[None, :] == np.arange(N_PHASES)[:, None]
    counts = members.sum(axis=1).astype(np.intp)
    members[counts == 0] = True
    return members, counts


class Process:
    """One region, one weight vector and one horizon, solved and evaluated exactly."""

    def __init__(
        self,
        kernel: Kernel,
        weights: FloatArray,
        outcome_scales: FloatArray,
        horizon: int,
        start_level: int,
    ) -> None:
        if horizon < 1:
            raise ValueError("The horizon is at least one campaign")
        if not 0 <= start_level < kernel.n_levels:
            raise ValueError("The start level is outside the water levels")
        self.kernel = kernel
        self.horizon = horizon
        self.start_level = start_level
        self.reward = scalarize(kernel.outcomes, weights, outcome_scales)  # (years, itin., levels)

        self.june_members, self.phase_counts_june = _phase_members(kernel.june_phase)
        self.august_members, self.phase_counts_august = _phase_members(kernel.august_phase)
        june_weights = self.june_members / self.june_members.sum(axis=1, keepdims=True)
        self._august_weights = self.august_members / self.august_members.sum(axis=1, keepdims=True)
        august_onehot = kernel.august_phase[:, None] == np.arange(N_PHASES)[None, :]
        # P(August phase | June phase) and the marginal of June phases over training campaigns.
        self._august_given_june: FloatArray = june_weights @ august_onehot
        self._june_marginal: FloatArray = (
            np.bincount(kernel.june_phase, minlength=N_PHASES) / kernel.n_years
        )
        self.allowed = (
            kernel.itinerary_winter[None, :] == np.arange(kernel.n_winters)[:, None]
        )  # (winters, itineraries)
        if not self.allowed.any(axis=1).all():
            raise ValueError("Every winter option needs at least one itinerary")
        self._start = np.zeros(kernel.n_levels)
        self._start[start_level] = 1.0
        self.june_reachable, self.august_reachable = self._reachable()

    @property
    def states_per_layer(self) -> int:
        levels, winters = self.kernel.n_levels, self.kernel.n_winters
        return levels * N_PHASES + levels * winters * N_PHASES

    @property
    def n_states(self) -> int:
        return self.horizon * self.states_per_layer

    def solve(self, on_layer: Callable[[int], None] | None = None) -> Solution:
        """Backward induction. `on_layer(done)` is called after each of the H campaign layers."""
        horizon, levels = self.horizon, self.kernel.n_levels
        winters, itineraries = self.kernel.n_winters, self.kernel.n_itineraries
        q_june = np.zeros((horizon, levels, N_PHASES, winters))
        q_august = np.full((horizon, levels, winters, N_PHASES, itineraries), -np.inf)
        v_june = np.zeros((horizon, levels, N_PHASES))
        v_august = np.zeros((horizon, levels, winters, N_PHASES))
        v_next = np.zeros((levels, N_PHASES))
        for k in reversed(range(horizon)):
            expected = self._expected_campaign(v_next)  # (phases, itineraries, levels)
            by_level = np.transpose(expected, (2, 0, 1))  # (levels, phases, itineraries)
            q_august[k] = np.where(self.allowed[None, :, None, :], by_level[:, None, :, :], -np.inf)
            v_august[k] = q_august[k].max(axis=-1)
            q_june[k] = np.einsum("ja,wta->wjt", self._august_given_june, v_august[k])
            v_june[k] = q_june[k].max(axis=-1)
            v_next = v_june[k]
            if on_layer is not None:
                on_layer(horizon - k)
        return Solution(Tables(q_june, q_august), v_june, v_august)

    def optimal_value(self, solution: Solution) -> float:
        """Expected total score of the optimal policy from the start distribution."""
        return self._from_start(solution.v_june[0])

    def evaluate(self, policy: Policy) -> float:
        """Exact expected total score of a policy on this process, from the start distribution."""
        levels = self.kernel.n_levels
        level_index = np.arange(levels)[:, None, None]
        phase_index = np.arange(N_PHASES)[None, None, :]
        v_next = np.zeros((levels, N_PHASES))
        for k in reversed(range(self.horizon)):
            expected = self._expected_campaign(v_next)  # (phases, itineraries, levels)
            v_august = expected[phase_index, policy.itinerary[k], level_index]  # (L, winters, P)
            by_winter = np.einsum("ja,wta->wjt", self._august_given_june, v_august)
            v_next = np.take_along_axis(by_winter, policy.winter[k][..., None], axis=2)[..., 0]
        return self._from_start(v_next)

    def cycle_policy(self, cycle: Sequence[int]) -> Policy:
        """The open-loop plan that repeats `cycle`, entered at its first itinerary."""
        horizon, levels = self.horizon, self.kernel.n_levels
        winters = self.kernel.n_winters
        first_after = self.allowed.argmax(axis=1)  # any itinerary will do where nothing is chosen
        winter = np.zeros((horizon, levels, N_PHASES), dtype=np.intp)
        itinerary = np.zeros((horizon, levels, winters, N_PHASES), dtype=np.intp)
        for k in range(horizon):
            chosen = cycle[k % len(cycle)]
            chosen_winter = int(self.kernel.itinerary_winter[chosen])
            winter[k] = chosen_winter
            itinerary[k] = first_after[None, :, None]
            itinerary[k, :, chosen_winter, :] = chosen
        return Policy(winter, itinerary)

    def agreement(self, agent: Tables, optimum: Solution) -> float:
        """Share of decision states where the agent's greedy action is optimal.

        Counts the states the learner can reach that offer a real choice (two or more actions);
        an action counts as optimal when its optimal value is within `TIE_TOLERANCE` of the best.
        """
        policy = greedy(agent)
        q_june = np.take_along_axis(optimum.q.june, policy.winter[..., None], axis=-1)[..., 0]
        q_august = np.take_along_axis(optimum.q.august, policy.itinerary[..., None], axis=-1)[
            ..., 0
        ]
        optimal_june = q_june >= optimum.v_june - TIE_TOLERANCE
        optimal_august = q_august >= optimum.v_august - TIE_TOLERANCE
        june_choice = self.june_reachable & (self.kernel.n_winters >= 2)
        august_choice = self.august_reachable & (self.allowed.sum(axis=1) >= 2)[None, None, :, None]
        decisions = int(june_choice.sum() + august_choice.sum())
        if decisions == 0:
            return 1.0
        agreeing = int((optimal_june & june_choice).sum() + (optimal_august & august_choice).sum())
        return agreeing / decisions

    def train_q(
        self,
        episodes: int,
        checkpoints: int,
        seed: int,
        on_checkpoint: Callable[[int, Tables], None],
    ) -> Tables:
        """Tabular Q-learning on the sampled process.

        Each episode starts at a uniformly random water level and a June phase drawn from the
        marginal, then plays H campaigns. Exploration is epsilon-greedy with epsilon decaying
        geometrically from 1 to `EPSILON_END` over the run; the step size of a state-action pair
        is `n ** -STEP_EXPONENT` after its n-th visit. `on_checkpoint(episodes_done, tables)` runs
        `checkpoints` times, evenly spaced.
        """
        if episodes < 1 or checkpoints < 1 or episodes % checkpoints:
            raise ValueError("Episodes must be a positive multiple of the checkpoints")
        horizon, levels = self.horizon, self.kernel.n_levels
        winters, itineraries = self.kernel.n_winters, self.kernel.n_itineraries
        after = [[int(i) for i in np.flatnonzero(self.allowed[w])] for w in range(winters)]
        n_after = [len(options) for options in after]
        stride = max(n_after)
        june_years = [np.flatnonzero(m).tolist() for m in self.june_members]
        august_years = [np.flatnonzero(m).tolist() for m in self.august_members]
        august_phase = self.kernel.august_phase.tolist()
        reward = self.reward.ravel().tolist()  # index (year * itineraries + itinerary) * levels + w
        next_level = self.kernel.next_level.ravel().tolist()
        june_bounds = np.cumsum(self._june_marginal).tolist()
        june_bounds[-1] = 2.0  # float rounding must never leave a draw beyond the last phase

        q_june = [0.0] * (horizon * levels * N_PHASES * winters)
        visits_june = [0] * len(q_june)
        q_august = [0.0] * (horizon * levels * winters * N_PHASES * stride)
        visits_august = [0] * len(q_august)

        rng = np.random.default_rng(seed)
        chunk = episodes // checkpoints
        for checkpoint in range(checkpoints):
            first = checkpoint * chunk
            epsilons = np.power(EPSILON_END, (first + np.arange(chunk)) / episodes).tolist()
            start_levels = rng.integers(0, levels, size=chunk).tolist()
            start_phases = rng.choice(N_PHASES, size=chunk, p=self._june_marginal).tolist()
            draws = rng.random((chunk, horizon, 7)).tolist()
            for episode in range(chunk):
                epsilon = epsilons[episode]
                level = start_levels[episode]
                phase = start_phases[episode]
                for k in range(horizon):
                    explore_j, pick_j, year_j, explore_a, pick_a, year_a, next_phase = draws[
                        episode
                    ][k]
                    base_j = ((k * levels + level) * N_PHASES + phase) * winters
                    if explore_j < epsilon:
                        winter = int(pick_j * winters)
                    else:
                        row = q_june[base_j : base_j + winters]
                        winter = row.index(max(row))
                    years = june_years[phase]
                    august = august_phase[years[int(year_j * len(years))]]
                    count = n_after[winter]
                    base_a = (
                        ((k * levels + level) * winters + winter) * N_PHASES + august
                    ) * stride
                    slot = base_j + winter
                    visits_june[slot] += 1
                    q_june[slot] += visits_june[slot] ** -STEP_EXPONENT * (
                        max(q_august[base_a : base_a + count]) - q_june[slot]
                    )

                    if explore_a < epsilon:
                        choice = int(pick_a * count)
                    else:
                        row = q_august[base_a : base_a + count]
                        choice = row.index(max(row))
                    itinerary = after[winter][choice]
                    years = august_years[august]
                    year = years[int(year_a * len(years))]
                    flat = (year * itineraries + itinerary) * levels + level
                    target = reward[flat]
                    if k + 1 < horizon:
                        level = next_level[flat]
                        phase = 0
                        while next_phase >= june_bounds[phase]:
                            phase += 1
                        base_next = ((k + 1) * levels + level) * N_PHASES + phase
                        target += max(q_june[base_next * winters : (base_next + 1) * winters])
                    slot = base_a + choice
                    visits_august[slot] += 1
                    q_august[slot] += visits_august[slot] ** -STEP_EXPONENT * (
                        target - q_august[slot]
                    )
            on_checkpoint((checkpoint + 1) * chunk, self._tables(q_june, q_august, after, stride))
        return self._tables(q_june, q_august, after, stride)

    def _tables(
        self, q_june: list[float], q_august: list[float], after: list[list[int]], stride: int
    ) -> Tables:
        horizon, levels = self.horizon, self.kernel.n_levels
        winters = self.kernel.n_winters
        june = np.array(q_june).reshape(horizon, levels, N_PHASES, winters)
        compact = np.array(q_august).reshape(horizon, levels, winters, N_PHASES, stride)
        august = np.full((horizon, levels, winters, N_PHASES, self.kernel.n_itineraries), -np.inf)
        for winter, options in enumerate(after):
            for slot, itinerary in enumerate(options):
                august[:, :, winter, :, itinerary] = compact[:, :, winter, :, slot]
        return Tables(june, august)

    def _from_start(self, v_june_first: FloatArray) -> float:
        return float(self._start @ (v_june_first @ self._june_marginal))

    def _expected_campaign(self, v_june_next: FloatArray) -> FloatArray:
        """Expected score of a campaign plus what follows: (phases, itineraries, levels).

        Indexed by the August phase that sets which training years can be drawn; `v_june_next`
        is the value of the next June states, (levels, phases).
        """
        continuation = v_june_next @ self._june_marginal  # (levels,)
        gain = self.reward + continuation[self.kernel.next_level]  # (years, itineraries, levels)
        return np.einsum("ey,yiw->eiw", self._august_weights, gain)

    def _reachable(self) -> tuple[BoolArray, BoolArray]:
        """States the learner can visit: any start level, phases with training campaigns."""
        horizon, levels = self.horizon, self.kernel.n_levels
        june = np.zeros((horizon, levels, N_PHASES), dtype=bool)
        august = np.zeros((horizon, levels, self.kernel.n_winters, N_PHASES), dtype=bool)
        june[0] = self._june_marginal > 0
        august_possible = self._august_given_june > 0
        year_in_phase = (self._august_weights > 0).T  # (years, phases)
        for k in range(horizon):
            phases = (june[k][:, :, None] & august_possible[None, :, :]).any(axis=1)
            august[k] = phases[:, None, :]
            if k + 1 == horizon:
                break
            itineraries = (august[k][:, :, :, None] & self.allowed[None, :, None, :]).any(axis=1)
            drawn = np.einsum("ye,wei->yiw", year_in_phase.astype(int), itineraries.astype(int)) > 0
            ending = np.zeros(levels, dtype=bool)
            ending[self.kernel.next_level[drawn]] = True
            june[k + 1] = ending[:, None] & (self._june_marginal > 0)[None, :]
        return june, august
