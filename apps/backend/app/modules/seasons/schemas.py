"""Season dashboard bundle ("dashboard-v1"): what the "Seasons like this" view renders.

The pipeline decides which seasons are similar, the dry/wet split, margins, risks and
their definitions. The client only takes medians and counts over the seasons it gets.
`None` always means missing, never zero. A number is mock when its `source_ids` include
`MOCK_SOURCE`.
"""

import re
from datetime import date
from typing import Annotated, Literal, Self

from pydantic import AfterValidator, BaseModel, Field, HttpUrl, model_validator

MOCK_SOURCE = "mock"

Provenance = Literal["observed", "retrieved", "modeled", "scenario", "missing"]
EnsoPhase = Literal["nina", "neutral", "nino"]
StartSoil = Literal["dry", "wet"]


def _check_season_id(season_id: str) -> str:
    match = re.fullmatch(r"(\d{4})/(\d{2})", season_id)
    if match is None or (int(match[1]) + 1) % 100 != int(match[2]):
        raise ValueError("Season must span two consecutive years, e.g. 1997/98")
    return season_id


# Argentine campaign format, e.g. "1997/98".
SeasonId = Annotated[str, AfterValidator(_check_season_id)]


class Metric(BaseModel):
    """A single number with its unit and where it came from."""

    value: float | None
    unit: str
    provenance: Provenance
    source_ids: list[str]
    note: str | None = None

    @model_validator(mode="after")
    def _null_means_missing(self) -> Self:
        if (self.value is None) != (self.provenance == "missing"):
            raise ValueError('value must be null exactly when provenance is "missing"')
        return self


class FlagDef(BaseModel):
    label: str
    # Method, threshold and window in one line.
    definition: str
    provenance: Provenance
    # Shown when no season has a value.
    missing_note: str | None = None


class FlagDefs(BaseModel):
    """Meaning of each per-season climate flag. The client never hardcodes it."""

    water_deficit_at_flowering: FlagDef
    heat_at_flowering: FlagDef
    excess_water: FlagDef


class Season(BaseModel):
    season_id: SeasonId
    enso_phase: EnsoPhase
    # ONI for the window already published on the decision date (similarity.oni_window).
    oni: float
    # End-of-August root-zone wetness, 0-1 (NASA POWER GWETROOT, a model output).
    root_zone_wetness: float = Field(ge=0, le=1)
    start_soil: StartSoil
    # Picked by the pipeline's analog finder, never by the client.
    is_similar: bool
    rain_oct_mar_mm: float | None = Field(ge=0)
    water_deficit_at_flowering: bool | None
    heat_at_flowering: bool | None
    # Stays null until a validated waterlogging model exists.
    excess_water: bool | None
    note: str | None = None


class Margin(BaseModel):
    unit: Literal["USD/ha/yr"]
    basis: Literal["per_year", "per_cycle"]
    includes_rent: bool
    price_basis: str
    provenance: Provenance
    source_ids: list[str]
    by_season: dict[SeasonId, float | None]


class Strategy(BaseModel):
    strategy_id: str
    name: str
    # Crop sequence as the agronomist reads it, e.g. ["Wheat/Soy", "Early maize", "Soy"].
    sequence: list[str] = Field(min_length=1)
    is_current: bool
    # Estimated residue carbon input, not a measured change in soil stock.
    carbon_input: Metric
    margin: Margin


class DataSource(BaseModel):
    id: str
    name: str
    url: HttpUrl | None = None
    what: str
    period: str | None = None
    location: str | None = None


class DashboardField(BaseModel):
    field_id: str
    name: str
    place: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    scale_note: str


class Decision(BaseModel):
    campaign: SeasonId
    decision_date: date


class OniWindow(BaseModel):
    code: str
    label: str


class Similarity(BaseModel):
    oni_window: OniWindow
    # Plain-language rule, shown under the similar seasons.
    rule: str


class SeasonStart(BaseModel):
    enso_phase: EnsoPhase
    enso_strength: Literal["weak", "moderate", "strong"] | None
    oni: Metric
    # Change since the previous ONI window; positive means El Niño is building.
    oni_change: Metric | None = None
    root_zone_wetness: Metric
    start_soil: StartSoil | None
    caveats: list[str]


class SeasonDashboard(BaseModel):
    schema_version: Literal["dashboard-v1"]
    # "partial": some numbers are real and some are mock. Mock numbers are found by source.
    data_status: Literal["mock", "partial", "real"]
    generated_at: str
    field: DashboardField
    decision: Decision
    similarity: Similarity
    season_start: SeasonStart
    flag_defs: FlagDefs
    seasons_source_ids: list[str]
    seasons: list[Season] = Field(min_length=1)
    strategies: list[Strategy] = Field(min_length=1)
    sources: list[DataSource]
    limits: list[str]
    missing_inputs: list[str]

    @model_validator(mode="after")
    def _consistent(self) -> Self:
        errors = [*self._season_errors(), *self._strategy_errors(), *self._source_errors()]
        if errors:
            raise ValueError("; ".join(errors))
        return self

    def _season_errors(self) -> list[str]:
        ids = [s.season_id for s in self.seasons]
        errors = []
        if len(set(ids)) != len(ids):
            errors.append("Duplicate season_id in seasons")
        if ids != sorted(ids):
            errors.append("seasons must be sorted by season_id")
        wetness = self.season_start.root_zone_wetness.value
        if wetness is not None and not 0 <= wetness <= 1:
            errors.append("season_start.root_zone_wetness must be within 0-1")
        return errors

    def _strategy_errors(self) -> list[str]:
        strategies = self.strategies
        known = {s.season_id for s in self.seasons}
        errors = []
        if sum(s.is_current for s in strategies) != 1:
            errors.append("Exactly one strategy must be current")
        if len({s.strategy_id for s in strategies}) != len(strategies):
            errors.append("Duplicate strategy_id")
        for s in strategies:
            errors.extend(
                f"{s.strategy_id}: margin for unknown season {season_id}"
                for season_id in s.margin.by_season
                if season_id not in known
            )
            if s.carbon_input.value is not None and s.carbon_input.value < 0:
                errors.append(f"{s.strategy_id}: carbon input cannot be negative")
        # One label per section: every strategy shares how its numbers were made.
        shared = {
            "margin.provenance": [s.margin.provenance for s in strategies],
            "margin mock-ness": [is_mock(s.margin.source_ids) for s in strategies],
            "margin basis, rent and price basis": [
                (s.margin.basis, s.margin.includes_rent, s.margin.price_basis) for s in strategies
            ],
            "carbon unit": [s.carbon_input.unit for s in strategies],
            "carbon mock-ness": [is_mock(s.carbon_input.source_ids) for s in strategies],
        }
        errors.extend(
            f"All strategies must share {what}"
            for what, values in shared.items()
            if len(set(values)) > 1
        )
        return errors

    def _source_errors(self) -> list[str]:
        declared = [s.id for s in self.sources]
        referenced = self.referenced_source_ids()
        errors = [f"Unknown source_id {i}" for i in sorted(set(referenced) - set(declared))]
        if len(set(declared)) != len(declared):
            errors.append("Duplicate source id")
        if self.data_status == "real" and MOCK_SOURCE in referenced:
            errors.append('data_status is "real" but some numbers come from the mock')
        if self.data_status == "mock" and MOCK_SOURCE not in referenced:
            errors.append('data_status is "mock" but nothing references the mock source')
        return errors

    def referenced_source_ids(self) -> list[str]:
        start = self.season_start
        metrics = [start.oni, start.root_zone_wetness]
        if start.oni_change is not None:
            metrics.append(start.oni_change)
        metrics.extend(s.carbon_input for s in self.strategies)
        return [
            *self.seasons_source_ids,
            *(i for m in metrics for i in m.source_ids),
            *(i for s in self.strategies for i in s.margin.source_ids),
        ]


def is_mock(source_ids: list[str]) -> bool:
    return MOCK_SOURCE in source_ids
