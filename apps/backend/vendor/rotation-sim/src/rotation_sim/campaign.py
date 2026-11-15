"""One campaign of one field, decided in two moments, and rotations as chains of campaigns.

June 1: sow a winter crop or leave the field fallow. End of August: choose the summer crop,
knowing how the winter went so far. Soil water and the surface evaporation store are the only
things that pass from one campaign to the next.

Every number produced here is a simulated scenario, not an agronomic recommendation.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .crops import (
    SUMMER_POSITION,
    WINTER_POSITION,
    Calendar,
    Crop,
    Schedule,
    build_schedule,
    day_index,
    load_crops,
)
from .fields import Field
from .parameters import Parameters
from .water_balance import (
    N_POSITIONS,
    DailyTrace,
    SoilEvaporation,
    relative_yield,
    simulate_days,
    total_available_water_mm,
)
from .weather import CampaignWeather, campaign_label

CONFIG_DIR = Path(__file__).resolve().parents[2] / "configs"

# Per-step outcome components, in this order wherever they are stacked into a vector.
COMPONENTS = ("margin_usd_ha", "deficit_mm", "bare_days", "bare_rain_mm", "drainage_mm")

# How each component should be labelled when shown, in the team's provenance vocabulary.
COMPONENT_PROVENANCE = {
    "margin_usd_ha": "scenario",  # international prices and assumed costs
    "deficit_mm": "modeled",
    "bare_days": "modeled",
    "bare_rain_mm": "modeled",
    "drainage_mm": "modeled",
}


class Model:
    """Parameters, crops and calendar, plus the rules for combining them into itineraries."""

    def __init__(self, params: Parameters, crops: dict[str, Crop], calendar: Calendar) -> None:
        self.params = params
        self.crops = crops
        self.calendar = calendar
        self.soil = SoilEvaporation(
            tew_mm=params.number("soil_evaporation_tew", "bare"),
            rew_mm=params.number("soil_evaporation_rew", "bare"),
            bare_kc_max=params.number("bare_evaporation_max_kc", "bare"),
        )
        self.kc_initial = params.number("kc_initial", "all")
        self.fallow_cost_usd_ha = params.number("cost", "fallow")
        self.initial_surface_depletion_mm = params.number(
            "bare_evaporation_initial_depletion", "bare"
        )
        self.initial_water_fraction = params.number("initial_water_fraction", "all")
        self.default_taw_mm = total_available_water_mm(
            params.number("available_water_capacity", "soil"),
            params.number("effective_depth", "all"),
        )
        self._august = (
            int(params.number("august_decision_month", "all")),
            int(params.number("august_decision_day", "all")),
        )
        self._schedules: dict[tuple[str, int, str | None, str | None], Schedule] = {}
        self._check_calendar()

    @classmethod
    def from_configs(cls, config_dir: str | Path = CONFIG_DIR) -> Model:
        config_dir = Path(config_dir)
        params = Parameters.from_csv(config_dir / "parameters.csv")
        return cls(
            params,
            load_crops(config_dir / "crops.csv", params),
            Calendar.from_csv(config_dir / "calendar.csv"),
        )

    def august_day(self, year: int) -> int:
        """Campaign day of the second decision; the summer crop is chosen before that day runs."""
        return day_index(year, *self._august)

    def crops_in_slot(self, *slots: str) -> tuple[str, ...]:
        return tuple(c.crop_id for c in self.crops.values() if c.slot in slots)

    def available(self, field: Field, crop_id: str) -> bool:
        """A crop can be simulated on a field only with a sowing date and a yield anchor."""
        return crop_id in field.yield_anchor_kg_ha and self.calendar.has(
            field.calendar_band, crop_id
        )

    def winter_options(self, field: Field) -> tuple[str, ...]:
        return tuple(c for c in self.crops_in_slot("winter") if self.available(field, c))

    def summer_options(self, field: Field, winter: str | None) -> tuple[str, ...]:
        slot = "summer_first" if winter is None else "summer_second"
        return tuple(c for c in self.crops_in_slot(slot) if self.available(field, c))

    def schedule(self, band: str, year: int, winter: str | None, summer: str | None) -> Schedule:
        key = (band, year, winter, summer)
        if key not in self._schedules:
            self._schedules[key] = self._build(band, year, winter, summer)
        return self._schedules[key]

    def _build(self, band: str, year: int, winter: str | None, summer: str | None) -> Schedule:
        if winter is not None and self.crops[winter].slot != "winter":
            raise ValueError(f"{winter} is not a winter crop")
        if summer is not None:
            expected = "summer_first" if winter is None else "summer_second"
            if self.crops[summer].slot != expected:
                after = "a winter fallow" if winter is None else winter
                raise ValueError(f"{summer} cannot follow {after}")
        august = self.august_day(year)
        entries: list[tuple[Crop, int] | None] = []
        for crop_id, is_winter in ((winter, True), (summer, False)):
            if crop_id is None:
                entries.append(None)
                continue
            sowing_day = self.calendar.sowing_day(band, crop_id, year)
            if is_winter and not 0 <= sowing_day < august:
                raise ValueError(f"{crop_id} must be sown between June 1 and the August decision")
            if not is_winter and sowing_day < august:
                raise ValueError(f"{crop_id} is sown before the August decision")
            entries.append((self.crops[crop_id], sowing_day))
        return build_schedule(year, entries[0], entries[1], self.kc_initial)

    def _check_calendar(self) -> None:
        """Fail at load time if any itinerary the calendar allows does not fit a campaign."""
        for band in self.calendar.bands():

            def sown(*slots: str, band: str = band) -> list[str | None]:
                return [
                    None,
                    *(c for c in self.crops_in_slot(*slots) if self.calendar.has(band, c)),
                ]

            for winter in sown("winter"):
                for summer in sown("summer_first" if winter is None else "summer_second"):
                    for year in (2023, 2024):  # a campaign with and without February 29
                        self._build(band, year, winter, summer)


class Campaign:
    """One field in one campaign: decide the winter, then the summer, then read the outcome.

    Initial water may be an array; everything then runs for the whole batch at once.
    """

    def __init__(
        self,
        model: Model,
        field: Field,
        weather: CampaignWeather,
        water_mm: np.ndarray | float,
        surface_depletion_mm: np.ndarray | float,
    ) -> None:
        self.model = model
        self.field = field
        self.weather = weather
        self.water_mm = np.asarray(water_mm, dtype=float)
        self.surface_depletion_mm = np.asarray(surface_depletion_mm, dtype=float)
        self.water_start_mm = self.water_mm
        self.water_at_august_mm: np.ndarray | None = None
        self.stage = "winter"
        self.winter: str | None = None
        self.summer: str | None = None
        shape = np.broadcast_shapes(self.water_mm.shape, self.surface_depletion_mm.shape)
        self._et_actual = np.zeros((*shape, N_POSITIONS))
        self._et_potential = np.zeros((*shape, N_POSITIONS))
        self._totals = {name: np.zeros(shape) for name in COMPONENTS}
        self._traces: list[DailyTrace] = []
        self.relative_yield: dict[str, np.ndarray] = {}
        self.yield_kg_ha: dict[str, np.ndarray] = {}

    def decide_winter(self, winter: str | None, *, trace: bool = False) -> dict[str, np.ndarray]:
        """Run June 1 to the day before the August decision. Returns the component increments."""
        if self.stage != "winter":
            raise RuntimeError("The winter of this campaign is already decided")
        if winter is not None and winter not in self.model.winter_options(self.field):
            raise ValueError(f"{winter} is not an available winter crop for {self.field.field_id}")
        self.winter = winter
        year = self.weather.year
        schedule = self.model.schedule(self.field.calendar_band, year, winter, None)
        increments = self._run(schedule, 0, self.model.august_day(year), trace)
        self.water_at_august_mm = self.water_mm
        self.stage = "summer"
        return increments

    def decide_summer(self, summer: str | None, *, trace: bool = False) -> dict[str, np.ndarray]:
        """Run from the August decision to May 31 and close the campaign with its yields."""
        if self.stage != "summer":
            raise RuntimeError("Decide the winter first, and each campaign only once")
        if summer is not None and summer not in self.model.summer_options(self.field, self.winter):
            after = "a winter fallow" if self.winter is None else self.winter
            raise ValueError(
                f"{summer} is not an available summer crop after {after} for {self.field.field_id}"
            )
        self.summer = summer
        year = self.weather.year
        schedule = self.model.schedule(self.field.calendar_band, year, self.winter, summer)
        increments = self._run(schedule, self.model.august_day(year), schedule.n_days, trace)
        margin = np.full(self._totals["margin_usd_ha"].shape, -self.model.fallow_cost_usd_ha)
        for position, crop_id in ((WINTER_POSITION, self.winter), (SUMMER_POSITION, summer)):
            if crop_id is None:
                continue
            crop = self.model.crops[crop_id]
            fraction = relative_yield(
                crop.ky, self._et_actual[..., position], self._et_potential[..., position]
            )
            harvested = self.field.yield_anchor_kg_ha[crop_id] * fraction
            self.relative_yield[crop_id] = fraction
            self.yield_kg_ha[crop_id] = harvested
            margin = margin + crop.price_usd_t * harvested / 1000 - crop.cost_usd_ha
        increments["margin_usd_ha"] = margin
        self._totals["margin_usd_ha"] = margin
        self.stage = "closed"
        return increments

    def _run(self, schedule: Schedule, start: int, stop: int, trace: bool) -> dict[str, np.ndarray]:
        result = simulate_days(
            rain_mm=self.weather.rain_mm,
            eto_mm=self.weather.eto_mm,
            schedule=schedule,
            start=start,
            stop=stop,
            taw_mm=self.field.taw_mm,
            water_mm=self.water_mm,
            surface_depletion_mm=self.surface_depletion_mm,
            soil=self.model.soil,
            trace=trace,
        )
        self.water_mm = result.water_mm
        self.surface_depletion_mm = result.surface_depletion_mm
        self._et_actual += result.et_actual_mm
        self._et_potential += result.et_potential_mm
        if result.trace is not None:
            self._traces.append(result.trace)
        zeros = np.zeros(result.water_mm.shape)
        increments = {
            "margin_usd_ha": zeros,
            "deficit_mm": np.sum(result.et_potential_mm - result.et_actual_mm, axis=-1),
            "bare_days": zeros + result.bare_days,
            "bare_rain_mm": result.bare_rain_mm,
            "drainage_mm": result.drainage_mm,
        }
        for name in COMPONENTS[1:]:
            self._totals[name] = self._totals[name] + increments[name]
        return increments

    def outcome(self) -> CampaignOutcome:
        if self.stage != "closed":
            raise RuntimeError("The campaign is not finished")
        assert self.water_at_august_mm is not None
        return CampaignOutcome(
            field_id=self.field.field_id,
            year=self.weather.year,
            winter=self.winter,
            summer=self.summer,
            water_start_mm=self.water_start_mm,
            water_at_august_mm=self.water_at_august_mm,
            water_end_mm=self.water_mm,
            surface_depletion_end_mm=self.surface_depletion_mm,
            components=dict(self._totals),
            relative_yield=dict(self.relative_yield),
            yield_kg_ha=dict(self.yield_kg_ha),
            trace=DailyTrace.concatenate(self._traces) if self._traces else None,
        )


@dataclass(frozen=True)
class CampaignOutcome:
    """What the model says happened to one itinerary in one real campaign."""

    field_id: str
    year: int
    winter: str | None
    summer: str | None
    water_start_mm: np.ndarray
    water_at_august_mm: np.ndarray
    water_end_mm: np.ndarray
    surface_depletion_end_mm: np.ndarray
    components: dict[str, np.ndarray]
    relative_yield: dict[str, np.ndarray]
    yield_kg_ha: dict[str, np.ndarray]
    trace: DailyTrace | None

    @property
    def campaign(self) -> str:
        return campaign_label(self.year)


def simulate_campaign(
    model: Model,
    field: Field,
    weather: CampaignWeather,
    winter: str | None,
    summer: str | None,
    water_mm: np.ndarray | float,
    surface_depletion_mm: np.ndarray | float | None = None,
    *,
    trace: bool = False,
) -> CampaignOutcome:
    if surface_depletion_mm is None:
        surface_depletion_mm = model.initial_surface_depletion_mm
    campaign = Campaign(model, field, weather, water_mm, surface_depletion_mm)
    campaign.decide_winter(winter, trace=trace)
    campaign.decide_summer(summer, trace=trace)
    return campaign.outcome()


def simulate_rotation(
    model: Model,
    field: Field,
    weather: dict[int, CampaignWeather],
    start_year: int,
    itineraries: Sequence[tuple[str | None, str | None]],
    *,
    water_mm: np.ndarray | float | None = None,
    surface_depletion_mm: np.ndarray | float | None = None,
    trace: bool = False,
) -> list[CampaignOutcome]:
    """Replay a fixed rotation over consecutive real campaigns, carrying the soil state.

    The starting soil water defaults to the declared assumption (a fraction of capacity).
    """
    if water_mm is None:
        water_mm = model.initial_water_fraction * field.taw_mm
    if surface_depletion_mm is None:
        surface_depletion_mm = model.initial_surface_depletion_mm
    outcomes: list[CampaignOutcome] = []
    for offset, (winter, summer) in enumerate(itineraries):
        year = start_year + offset
        if year not in weather:
            raise ValueError(f"No complete weather for campaign {campaign_label(year)}")
        outcome = simulate_campaign(
            model, field, weather[year], winter, summer, water_mm, surface_depletion_mm, trace=trace
        )
        water_mm, surface_depletion_mm = outcome.water_end_mm, outcome.surface_depletion_end_mm
        outcomes.append(outcome)
    return outcomes
