"""Read-only, source-linked contracts for historical water scenarios."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator


class FiniteModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)


class WaterSummary(FiniteModel):
    initial_water_mm: float = Field(ge=0)
    water_end_mm: float = Field(ge=0)
    precip_mm: float = Field(ge=0)
    et_actual_mm: float = Field(ge=0)
    crop_et_deficit_mm: float = Field(ge=0)
    excess_above_capacity_mm: float = Field(ge=0)
    crop_days: int = Field(ge=0)
    max_abs_mass_residual_mm: float = Field(ge=0, le=1e-7)
    crop_et_potential_mm: float = Field(gt=0)
    crop_et_actual_mm: float = Field(ge=0)
    crop_demand_unmet_fraction: float = Field(ge=0, le=1)


class PairedDifference(FiniteModel):
    reference_run_id: str = Field(pattern=r"^[a-f0-9]{20}$")
    crop_et_deficit_mm: float
    water_end_mm: float


class ScenarioCase(FiniteModel):
    run_id: str = Field(pattern=r"^[a-f0-9]{20}$")
    strategy_id: str
    start_year: int
    depth_m: float = Field(gt=0)
    initial_water_fraction: float = Field(ge=0, le=1)
    summer_shift_days: int
    capacity_mm: float = Field(gt=0)
    summary: WaterSummary


class WaterRunSummary(ScenarioCase):
    start: str
    end: str
    daily_path: str
    versus_reference_rotation: PairedDifference
    versus_unshifted_calendar: PairedDifference | None = None


class DifferenceDistribution(FiniteModel):
    count: int = Field(gt=0)
    minimum_mm: float
    median_mm: float
    maximum_mm: float
    lower_count: int = Field(ge=0)
    equal_count: int = Field(ge=0)
    higher_count: int = Field(ge=0)

    @model_validator(mode="after")
    def counts_reconcile(self) -> DifferenceDistribution:
        if self.lower_count + self.equal_count + self.higher_count != self.count:
            raise ValueError("Historical paired counts do not reconcile")
        return self


class RobustnessSummary(FiniteModel):
    strategy_id: str
    depth_m: float
    initial_water_fraction: float
    deficit_difference: DifferenceDistribution


class CalendarEffect(FiniteModel):
    strategy_id: str
    summer_shift_days: int
    deficit_difference: DifferenceDistribution


class StrategiesBundle(FiniteModel):
    schema_version: Literal["strategies-v1"]
    status: Literal["research_only"]
    design_id: str
    field: dict[str, JsonValue]
    weather_point: list[float]
    model: dict[str, str]
    config: dict[str, JsonValue]
    soils: list[dict[str, JsonValue]]
    runs: list[WaterRunSummary]
    robustness: list[RobustnessSummary]
    calendar_effects: list[CalendarEffect]
    rejected_cases: list[dict[str, JsonValue]]
    sources: list[dict[str, JsonValue]]
    source_ids: list[str]
    limitations: list[str]


class CropStage(FiniteModel):
    stage: Literal["initial", "development", "mid_season", "late_season"]
    start: str
    end: str
    days: int = Field(gt=0)
    crop_et_deficit_mm: float = Field(ge=0)
    stress_days: int = Field(ge=0)
    longest_stress_spell_days: int = Field(ge=0)
    hot_days_above_35_c: int = Field(ge=0)
    coincident_stress_heat_days: int = Field(ge=0)


class CropResult(FiniteModel):
    event_id: str
    crop_id: str
    label: str
    campaign_year: int
    sowing_date: str
    end_date: str
    stage_lengths: list[int]
    kc_initial: float
    kc_mid: float
    kc_end: float
    depletion_fraction: float
    water_at_sowing_mm: float = Field(ge=0)
    et_potential_mm: float = Field(ge=0)
    et_actual_mm: float = Field(ge=0)
    crop_et_deficit_mm: float = Field(ge=0)
    crop_days: int = Field(gt=0)
    stages: list[CropStage]


class DailyWater(FiniteModel):
    date: str
    available_water_start_mm: float = Field(ge=0)
    precip_mm: float = Field(ge=0)
    irrigation_mm: float = Field(ge=0)
    eto_mm: float = Field(ge=0)
    et_potential_mm: float = Field(ge=0)
    et_actual_mm: float = Field(ge=0)
    crop_et_deficit_mm: float = Field(ge=0)
    excess_above_capacity_mm: float = Field(ge=0)
    available_water_end_mm: float = Field(ge=0)
    surface_depletion_end_mm: float = Field(ge=0)
    crop_event_id: str | None
    water_stress_coefficient: float | None = Field(ge=0, le=1)
    mass_residual_mm: float
    temperature_max_c: float


class CampaignWater(FiniteModel):
    start_year: int
    water_start_mm: float
    water_end_mm: float
    crop_et_deficit_mm: float


class WaterRunDetail(ScenarioCase):
    provenance: Literal["modeled"]
    day_basis: Literal["UTC"]
    campaigns: list[CampaignWater]
    crops: list[CropResult]
    rows: list[DailyWater]
