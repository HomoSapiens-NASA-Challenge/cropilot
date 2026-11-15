"""Bounded views of the existing case-v1 contract, without scientific recalculation."""

from app.modules.cases.schemas import (
    AnalogMargins,
    BlockMeta,
    CaseModel,
    Decision,
    GlossaryTerm,
    Limit,
    Lot,
    ModuleStatus,
    NotComputed,
    ReferenceField,
    SourceRef,
    Strategy,
    WaterBlock,
    YearsLikeThis,
)


class EvidenceContext(CaseModel):
    schema_version: str
    zone_id: str
    zone_name: str
    province: str
    generated_utc: str
    decision: Decision
    limits: list[Limit]
    glossary: list[GlossaryTerm]
    sources: list[SourceRef]


class AnalogEvidence(CaseModel):
    context: EvidenceContext
    years_like_this: YearsLikeThis
    selection_note: str


class WaterSelection(CaseModel):
    depth_m: float
    initial_water_fraction: float
    summer_shift_days: int


class RotationComparison(CaseModel):
    context: EvidenceContext
    strategies: list[Strategy]
    margins_meta: BlockMeta
    margin_assumptions: list[str]
    analog_margins: list[AnalogMargins]
    water_status: ModuleStatus
    water: WaterBlock | None
    requested_water_selection: WaterSelection
    available_water_selections: list[WaterSelection]
    selection_note: str
    not_computed: list[NotComputed]


class FieldEvidence(CaseModel):
    context: EvidenceContext
    status: ModuleStatus
    farm_name: str | None
    farm_name_is_made_up: bool | None
    available_field_ids: list[str]
    selected_field_id: str | None
    lot: Lot | None
    lots_meta: BlockMeta | None
    ndvi_months: list[str]
    reference_field: ReferenceField | None
    reference_meta: BlockMeta | None
    limitations: list[str]
    selection_note: str
