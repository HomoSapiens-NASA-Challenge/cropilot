"""The only module that talks to the rotation simulator (`rotation_sim`).

It turns one region's field into the training kernel of the decision process and replays
policies campaign by campaign through the real simulator. Itineraries use the contract's
action names, where the simulator's `None` (nothing sown) is "fallow".
"""

from collections.abc import Callable
from dataclasses import dataclass
from functools import cache
from pathlib import Path

import numpy as np
from rotation_sim import (
    COMPONENTS,
    TEST_YEARS,
    TRAIN_YEARS,
    Campaign,
    Dataset,
    Field,
    load_dataset,
    simulate_campaign,
)
from rotation_sim.oni import AUGUST_SEASON, JUNE_SEASON
from rotation_sim.weather import campaign_label

from app.core.config import RotationSimSettings
from app.modules.rotation_planner import mdp
from app.modules.rotation_planner.schemas import Action, EnsoPhase, EnsoReading, EnsoSeason

N_WATER_LEVELS = 11
ENSO_PHASES: tuple[EnsoPhase, ...] = ("la_nina", "neutral", "el_nino")
# NOAA's own threshold for El Niño and La Niña episodes.
ENSO_THRESHOLD = 0.5
WINTERS: tuple[Action, ...] = ("fallow", "wheat")
ITINERARY_CANDIDATES: tuple[tuple[Action, Action], ...] = (
    ("fallow", "fallow"),
    ("fallow", "soybean_first"),
    ("fallow", "maize"),
    ("wheat", "fallow"),
    ("wheat", "soybean_second"),
)


def campaign_range(first_year: int, last_year: int) -> str:
    """Label of consecutive campaigns, for example 1984/85-2012/13."""
    return f"{campaign_label(first_year)}-{campaign_label(last_year)}"


class UnknownFieldError(ValueError):
    def __init__(self, region_id: str) -> None:
        super().__init__(f"The simulator has no field for region: {region_id}")


@dataclass(frozen=True)
class ReplayPolicy:
    """How a policy decides while a rotation is replayed. Decisions are indices, not names."""

    # (campaign index in the replay, water fraction on June 1, June phase) -> winter index
    choose_winter: Callable[[int, float, int], int]
    # (campaign index, water fraction on June 1, winter index, August phase) -> itinerary index
    choose_summer: Callable[[int, float, int, int], int]


@dataclass(frozen=True)
class ReplayedCampaign:
    year: int
    june_phase: int
    august_phase: int
    water_start_fraction: float
    itinerary: int
    outcomes: mdp.FloatArray  # (components,), in the simulator's units


@cache
def _dataset(data_dir: Path, config_dir: Path) -> Dataset:
    return load_dataset(data_dir, config_dir)


def enso_phase_index(anomaly: float) -> int:
    if anomaly <= -ENSO_THRESHOLD:
        return 0
    if anomaly >= ENSO_THRESHOLD:
        return 2
    return 1


def _crop(action: Action) -> str | None:
    return None if action == "fallow" else action


class RegionSimulator:
    """The simulator for one region's field."""

    def __init__(self, dataset: Dataset, field: Field) -> None:
        if COMPONENTS != mdp.COMPONENT_NAMES:
            raise ValueError(f"The simulator's outcomes changed: {COMPONENTS}")
        if (JUNE_SEASON, AUGUST_SEASON) != ("FMA", "JAS"):
            raise ValueError(
                f"The simulator's decision seasons changed: {JUNE_SEASON}, {AUGUST_SEASON}"
            )
        self._dataset = dataset
        self.field = field
        self._weather = dataset.weather[field.field_id]
        missing = [y for y in (*TRAIN_YEARS, *TEST_YEARS) if y not in self._weather]
        if missing:
            raise ValueError(f"No complete weather for {field.field_id} campaigns {missing}")
        model = dataset.model
        self.itineraries = tuple(
            itinerary for itinerary in ITINERARY_CANDIDATES if self._available(itinerary)
        )
        self.winters = tuple(w for w in WINTERS if any(i[0] == w for i in self.itineraries))
        self.itinerary_winter: mdp.IntArray = np.array(
            [self.winters.index(winter) for winter, _ in self.itineraries], dtype=np.intp
        )
        self.initial_water_fraction = model.initial_water_fraction
        self.initial_level = mdp.water_level(self.initial_water_fraction, N_WATER_LEVELS)
        self.train_years = TRAIN_YEARS
        self.test_years = TEST_YEARS

    @classmethod
    def load(cls, region_id: str) -> RegionSimulator:
        settings = RotationSimSettings()
        dataset = _dataset(settings.rotation_sim_data_dir, settings.rotation_sim_config_dir)
        for field in dataset.fields:
            if field.field_id == region_id:
                return cls(dataset, field)
        raise UnknownFieldError(region_id)

    @property
    def n_simulated_campaigns(self) -> int:
        """Campaign-states simulated to build the kernel: one per water level in every call."""
        return len(self.train_years) * len(self.itineraries) * N_WATER_LEVELS

    @property
    def sowing_sourced(self) -> bool:
        """Whether every sowing date this field uses has a source rather than an assumption."""
        calendar = self._dataset.model.calendar
        crops = {c for itinerary in self.itineraries for c in itinerary if c != "fallow"}
        return all(
            calendar.sowing(self.field.calendar_band, crop).status == "SOURCED" for crop in crops
        )

    def enso_phases(self, year: int) -> tuple[int, int]:
        """Phases known on June 1 (February-April ONI) and at the end of August (July-September)."""
        oni = self._dataset.oni
        return (
            enso_phase_index(oni.anomaly(JUNE_SEASON, year)),
            enso_phase_index(oni.anomaly(AUGUST_SEASON, year)),
        )

    def latest_enso(self) -> tuple[EnsoReading | None, EnsoReading | None]:
        """The newest campaign after the held-out ones with a published February-April ONI.

        Returns that reading and the July-September one of the same campaign; a reading NOAA has
        not published is None.
        """
        latest: EnsoReading | None = None
        year = self.test_years[-1] + 1
        while (reading := self._enso_reading("FMA", year)) is not None:
            latest, year = reading, year + 1
        if latest is None:
            return None, None
        return latest, self._enso_reading("JAS", latest.year)

    def _enso_reading(self, season: EnsoSeason, year: int) -> EnsoReading | None:
        try:
            anomaly = self._dataset.oni.anomaly(season, year)
        except KeyError:
            return None
        return EnsoReading(
            season=season, year=year, oni=anomaly, phase=ENSO_PHASES[enso_phase_index(anomaly)]
        )

    def build_kernel(self, on_call: Callable[[int], None]) -> mdp.Kernel:
        """Simulate every training campaign and itinerary from every water level.

        One batched simulator call per (campaign, itinerary) covers every water level at once;
        `on_call(done)` follows each with the count of campaign-states simulated so far. The
        surface evaporation store starts at the simulator's declared value in every call, so
        the kernel carries soil water only between campaigns.
        """
        model, field = self._dataset.model, self.field
        levels_mm = np.linspace(0.0, field.taw_mm, N_WATER_LEVELS)
        shape = (len(self.train_years), len(self.itineraries), N_WATER_LEVELS)
        outcomes = np.empty((*shape, mdp.N_COMPONENTS))
        next_level = np.empty(shape, dtype=np.intp)
        done = 0
        for y, year in enumerate(self.train_years):
            for i, (winter, summer) in enumerate(self.itineraries):
                result = simulate_campaign(
                    model,
                    field,
                    self._weather[year],
                    _crop(winter),
                    _crop(summer),
                    levels_mm,
                    model.initial_surface_depletion_mm,
                )
                for c, name in enumerate(COMPONENTS):
                    outcomes[y, i, :, c] = result.components[name]
                next_level[y, i] = mdp.water_levels(
                    result.water_end_mm / field.taw_mm, N_WATER_LEVELS
                )
                done += N_WATER_LEVELS
                on_call(done)
        phases = np.array([self.enso_phases(year) for year in self.train_years], dtype=np.intp)
        return mdp.Kernel(
            outcomes=outcomes,
            next_level=next_level,
            june_phase=phases[:, 0],
            august_phase=phases[:, 1],
            itinerary_winter=self.itinerary_winter,
            n_winters=len(self.winters),
        )

    def replay(
        self,
        first_year: int,
        n_campaigns: int,
        policy: ReplayPolicy,
        on_campaign: Callable[[], None] | None = None,
    ) -> list[ReplayedCampaign]:
        """Replay consecutive real campaigns, carrying soil water and the surface store.

        Starts from the declared initial water fraction. Decisions follow `policy`: the winter on
        June 1 and the summer crop at the end of August, each seeing only what is known then.
        """
        model, field = self._dataset.model, self.field
        water_mm = self.initial_water_fraction * field.taw_mm
        surface_mm = model.initial_surface_depletion_mm
        replayed: list[ReplayedCampaign] = []
        for index in range(n_campaigns):
            year = first_year + index
            if year not in self._weather:
                raise ValueError(f"No complete weather for campaign {year}")
            june_phase, august_phase = self.enso_phases(year)
            fraction = min(max(water_mm / field.taw_mm, 0.0), 1.0)
            campaign = Campaign(model, field, self._weather[year], water_mm, surface_mm)
            winter = policy.choose_winter(index, fraction, june_phase)
            campaign.decide_winter(_crop(self.winters[winter]))
            itinerary = policy.choose_summer(index, fraction, winter, august_phase)
            if self.itinerary_winter[itinerary] != winter:
                raise ValueError("The summer choice does not follow the winter choice")
            campaign.decide_summer(_crop(self.itineraries[itinerary][1]))
            outcome = campaign.outcome()
            water_mm = float(outcome.water_end_mm)
            surface_mm = float(outcome.surface_depletion_end_mm)
            replayed.append(
                ReplayedCampaign(
                    year=year,
                    june_phase=june_phase,
                    august_phase=august_phase,
                    water_start_fraction=fraction,
                    itinerary=itinerary,
                    outcomes=np.array([float(outcome.components[n]) for n in COMPONENTS]),
                )
            )
            if on_campaign is not None:
                on_campaign()
        return replayed

    def _available(self, itinerary: tuple[Action, Action]) -> bool:
        model, field = self._dataset.model, self.field
        winter, summer = (_crop(action) for action in itinerary)
        if winter is not None and winter not in model.winter_options(field):
            return False
        return summer is None or summer in model.summer_options(field, winter)
