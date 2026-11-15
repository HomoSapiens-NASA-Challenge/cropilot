"""The `case-v1` contract: one public, read-only demonstration case per zone.

A case joins what the team's models already computed (analog years and margins, water scenarios,
crop maps) into one bundle built offline by `scripts/demo_case/`. HTTP only reads it.
Every number keeps its provenance, spatial scale and sources; `null` means missing, never zero.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Provenance = Literal["observed", "retrieved", "modeled", "scenario", "missing"]
SpatialScale = Literal["global", "grid_cell", "department", "field"]
EnsoPhase = Literal["strong_el_nino", "el_nino", "neutral", "la_nina"]
ModuleStatus = Literal["available", "not_available"]
SourceNature = Literal["observation", "reanalysis", "model", "reference", "agronomist_input"]
WaterMatch = Literal["exact", "closest", "none"]
LotStatus = Literal["ok", "watch", "alert", "check", "bare"]
CampaignNoteKind = Literal[
    "worst_on_record", "june_dry_soil_alert", "counterexample", "dated_event", "strongest_start"
]


class CaseModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")


class SourceRef(CaseModel):
    """One dataset, paper or person behind a number: what, who, when and where."""

    id: str
    dataset: str
    provider: str
    url: str | None
    period: str
    location: str
    nature: SourceNature
    license: str | None


class Claim(CaseModel):
    """A sentence shown to the agronomist, with the sources that back it."""

    text: str
    source_ids: list[str]


class Limit(CaseModel):
    title: str
    text: str
    source_ids: list[str] = Field(min_length=1)


class GlossaryTerm(CaseModel):
    term: str
    definition: str


class BlockMeta(CaseModel):
    """Provenance shared by every number of one block or column."""

    provenance: Provenance
    scale: SpatialScale
    unit: str | None
    source_ids: list[str] = Field(min_length=1)
    note: str | None


# Years like this ----------------------------------------------------------------------------


class CampaignNote(CaseModel):
    kind: CampaignNoteKind
    text: str
    source_ids: list[str] = Field(min_length=1)


class CampaignPoint(CaseModel):
    """One real past campaign, placed by the two signals known at the end of August."""

    campaign: str = Field(pattern=r"^\d{4}/\d{2}$")
    start_year: int
    scenario_id: str
    oni_jas: float
    enso_phase: EnsoPhase
    # Mean NASA POWER GWETROOT, 22-31 August, unitless 0-1; null when POWER has no value.
    soil_wetness_end_aug: float | None = Field(ge=0, le=1)
    maize_yield_anomaly_pct: float | None
    maize_yield_provenance: Provenance
    soybean_yield_anomaly_pct: float | None
    soybean_yield_provenance: Provenance
    is_analog: bool
    analog_rank: int | None = Field(ge=1)
    analog_distance: float | None = Field(ge=0)
    notes: list[CampaignNote]


class CurrentCampaign(CaseModel):
    campaign: str = Field(pattern=r"^\d{4}/\d{2}$")
    decision_date: str
    oni_jas: float
    enso_phase: EnsoPhase
    soil_wetness_end_aug: float = Field(ge=0, le=1)
    # Share of past campaigns at this zone with a drier end of August, 0-1.
    soil_wetness_percentile: float = Field(ge=0, le=1)
    highest_past_oni_jas: float
    highest_past_oni_campaign: str
    outside_historical_range: bool


class AnalogMethod(CaseModel):
    k: int = Field(ge=1)
    features: list[str]
    distance: str
    candidates: str
    phase_rule: str


class YearsLikeThis(CaseModel):
    current: CurrentCampaign
    campaigns: list[CampaignPoint]
    method: AnalogMethod
    signals: BlockMeta
    yields: BlockMeta
    backtest: Claim


# Compare ------------------------------------------------------------------------------------


class StrategyAnswers(CaseModel):
    """The five answers the challenge asks of every strategy."""

    why: list[Claim] = Field(min_length=1)
    evidence: list[Claim] = Field(min_length=1)
    benefits: list[Claim]
    missing: list[Claim] = Field(min_length=1)
    local_review: list[Claim] = Field(min_length=1)


class Strategy(CaseModel):
    strategy_id: str
    label: str
    # One label per campaign of the cycle, for example ["Maize", "Soybean", "Soybean"].
    sequence: list[str] = Field(min_length=1)
    is_current: bool
    current_note: str | None
    market_rotation_id: str | None
    water_strategy_id: str | None
    water_match: WaterMatch
    answers: StrategyAnswers


class StrategyMargin(CaseModel):
    strategy_id: str
    gross_margin_usd_ha: float | None
    gross_margin_after_rent_usd_ha: float | None


class AnalogMargins(CaseModel):
    scenario_id: str
    campaign: str
    analog_rank: int = Field(ge=1)
    leading_strategy_id: str | None
    margins: list[StrategyMargin]


class RankingChange(CaseModel):
    metric: Literal["gross_margin", "gross_margin_after_rent"]
    strategy_a: str
    strategy_b: str
    a_ahead_in: list[str]
    b_ahead_in: list[str]
    order_inverts: bool


class RiskRow(CaseModel):
    """Secondary ensemble statistics; small n, never the headline."""

    strategy_id: str
    n_yield_campaigns: int
    n_price_campaigns: int
    n_scenarios: int
    p10_usd_ha: float | None
    p50_usd_ha: float | None
    p90_usd_ha: float | None
    cvar10_usd_ha: float | None
    share_below_rent: float | None = Field(ge=0, le=1)
    share_below_zero: float | None = Field(ge=0, le=1)


class NotComputed(CaseModel):
    metric: str
    reason: str


class UnharvestedRow(CaseModel):
    """Planted but not harvested area by ENSO phase known at the end of August."""

    crop: str
    enso_phase: EnsoPhase
    campaigns: int = Field(ge=0)
    mean_pct: float | None
    max_pct: float | None
    max_campaign: str | None


class WaterStartingPoint(CaseModel):
    depth_m: float = Field(gt=0)
    capacity_mm: float = Field(gt=0)
    initial_water_fraction: float = Field(ge=0, le=1)


class WaterCrop(CaseModel):
    crop: str
    campaign_year: int
    sowing_date: str
    water_at_sowing_mm: float = Field(ge=0)
    crop_et_deficit_mm: float = Field(ge=0)
    mid_season_stress_days: int = Field(ge=0)
    coincident_stress_heat_days: int = Field(ge=0)


class WaterEpisode(CaseModel):
    """One released physical run: three continuous campaigns from June of `start_year`."""

    run_id: str
    strategy_id: str
    start_year: int
    scenario_id: str | None
    depth_m: float = Field(gt=0)
    initial_water_fraction: float = Field(ge=0, le=1)
    summer_shift_days: int
    crop_et_potential_mm: float = Field(gt=0)
    crop_et_deficit_mm: float = Field(ge=0)
    crop_demand_unmet_fraction: float = Field(ge=0, le=1)
    excess_above_capacity_mm: float = Field(ge=0)
    water_end_mm: float = Field(ge=0)
    deficit_vs_current_mm: float
    # Filled only for analog episodes; empty for the other start years.
    crops: list[WaterCrop]


class PairedCounts(CaseModel):
    strategy_id: str
    depth_m: float
    initial_water_fraction: float
    summer_shift_days: int
    count: int = Field(gt=0)
    lower_count: int = Field(ge=0)
    equal_count: int = Field(ge=0)
    higher_count: int = Field(ge=0)
    median_mm: float
    minimum_mm: float
    maximum_mm: float

    @model_validator(mode="after")
    def counts_reconcile(self) -> PairedCounts:
        if self.lower_count + self.equal_count + self.higher_count != self.count:
            raise ValueError("Paired counts do not reconcile")
        return self


class WaterBlock(CaseModel):
    field_id: str
    meta: BlockMeta
    starting_points: list[WaterStartingPoint] = Field(min_length=1)
    default_depth_m: float
    default_initial_water_fraction: float
    summer_shift_days: list[int]
    episodes: list[WaterEpisode]
    robustness: list[PairedCounts]
    calendar_effects: list[PairedCounts]
    limitations: list[str]


class Compare(CaseModel):
    strategies: list[Strategy] = Field(min_length=3)
    margins_meta: BlockMeta
    margin_assumptions: list[str]
    analog_margins: list[AnalogMargins]
    ranking_changes: list[RankingChange]
    risk_summary: list[RiskRow]
    risk_note: str
    unharvested: list[UnharvestedRow]
    unharvested_meta: BlockMeta
    water: WaterBlock | None
    not_computed: list[NotComputed] = Field(min_length=1)

    @model_validator(mode="after")
    def one_current_strategy(self) -> Compare:
        if sum(strategy.is_current for strategy in self.strategies) != 1:
            raise ValueError("A comparison needs exactly one current strategy")
        return self


# Field --------------------------------------------------------------------------------------


class LotCampaign(CaseModel):
    campaign: str = Field(pattern=r"^\d{4}/\d{2}$")
    crop: str | None
    source: Literal["INTA", "model"]


class Lot(CaseModel):
    """One satellite-estimated field outline with its crop history and greenness."""

    field_id: str
    name: str
    area_ha: float = Field(gt=0)
    is_demo_farm: bool
    # GeoJSON Polygon coordinates, WGS84 longitude/latitude.
    polygon: list[list[list[float]]]
    latest_campaign: str
    latest_crop: str | None
    latest_crop_source: Literal["INTA", "model"]
    status: LotStatus | None
    status_reason: str | None
    crop_purity: float | None = Field(ge=0, le=1)
    vigor_ndvi: float | None
    vigor_gap: float | None
    evenness: float | None = Field(ge=0, le=1)
    history: list[LotCampaign]
    # Monthly median NDVI from September to May of the latest campaign; null when not observed.
    ndvi_curve: list[float | None]
    zone_ndvi_curve: list[float | None]


class ReferenceCrop(CaseModel):
    campaign: str
    season: Literal["annual", "winter", "summer"]
    crop: str
    fraction_of_field: float = Field(ge=0, le=1)


class NdviSample(CaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    ndvi_mean: float | None
    valid_fraction: float = Field(ge=0, le=1)


class SoilCapacity(CaseModel):
    depth_m: float = Field(gt=0)
    capacity_mm: float = Field(gt=0)


class ReferenceField(CaseModel):
    """The footprint the water scenarios were run on."""

    field_id: str
    area_ha: float = Field(gt=0)
    polygon: list[list[list[float]]]
    crop_history: list[ReferenceCrop]
    ndvi: list[NdviSample]
    soil_capacity: list[SoilCapacity]
    note: str


class FieldBlock(CaseModel):
    farm_name: str
    farm_name_is_made_up: bool
    ndvi_months: list[str]
    lots: list[Lot]
    lots_meta: BlockMeta
    reference_field: ReferenceField | None
    reference_meta: BlockMeta | None
    limitations: list[str]


# Bundle -------------------------------------------------------------------------------------


class CaseModules(CaseModel):
    years_like_this: ModuleStatus
    margins: ModuleStatus
    water: ModuleStatus
    field: ModuleStatus


class Decision(CaseModel):
    campaign: str
    decision_date: str
    description: str


class CaseBundle(CaseModel):
    schema_version: Literal["case-v1"]
    zone_id: str
    zone_name: str
    province: str
    generated_utc: str
    decision: Decision
    modules: CaseModules
    years_like_this: YearsLikeThis
    compare: Compare
    field: FieldBlock | None
    limits: list[Limit]
    glossary: list[GlossaryTerm]
    sources: list[SourceRef] = Field(min_length=1)

    @model_validator(mode="after")
    def sources_resolve(self) -> CaseBundle:
        known = {source.id for source in self.sources}
        missing = sorted(_referenced_source_ids(self) - known)
        if missing:
            raise ValueError(f"Unknown source ids: {', '.join(missing)}")
        return self


class ZoneCard(CaseModel):
    zone_id: str
    name: str
    province: str
    latitude_deg: float
    longitude_deg: float
    soil_wetness_end_aug: float | None = Field(ge=0, le=1)
    soil_wetness_percentile: float | None = Field(ge=0, le=1)
    analogs: list[str]
    modules: CaseModules


class CaseIndex(CaseModel):
    """The national view: how the 2026/27 campaign started in every zone with a case."""

    schema_version: Literal["case-v1"]
    campaign: str
    decision_date: str
    oni_jas: float
    enso_phase: EnsoPhase
    highest_past_oni_jas: float
    highest_past_oni_campaign: str
    zones: list[ZoneCard] = Field(min_length=1)
    meta: BlockMeta
    sources: list[SourceRef] = Field(min_length=1)

    @model_validator(mode="after")
    def sources_resolve(self) -> CaseIndex:
        known = {source.id for source in self.sources}
        missing = sorted(set(self.meta.source_ids) - known)
        if missing:
            raise ValueError(f"Unknown source ids: {', '.join(missing)}")
        return self


def _referenced_source_ids(value: object) -> set[str]:
    """Every `source_ids` entry anywhere in the bundle."""
    found: set[str] = set()
    if isinstance(value, BaseModel):
        for name in type(value).model_fields:
            item = getattr(value, name)
            if name == "source_ids" and isinstance(item, list):
                found.update(str(source_id) for source_id in item)
            else:
                found |= _referenced_source_ids(item)
    elif isinstance(value, list):
        for item in value:
            found |= _referenced_source_ids(item)
    return found
