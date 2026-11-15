"""Select released public evidence. Never load private farms or run a model."""

from app.modules.cases import service as cases_service
from app.modules.cases.schemas import CaseBundle, CaseIndex, WaterBlock
from app.modules.mcp.schemas import (
    AnalogEvidence,
    EvidenceContext,
    FieldEvidence,
    RotationComparison,
    WaterSelection,
)


class InvalidSelectionError(Exception):
    """The requested identifier or scenario is absent from the public bundle."""


def _context(bundle: CaseBundle) -> EvidenceContext:
    return EvidenceContext.model_validate(
        bundle.model_dump(include=set(EvidenceContext.model_fields))
    )


def list_cases() -> CaseIndex:
    """List the public case catalog, module availability and source metadata."""
    return cases_service.get_case_index()


def find_analog_years(zone_id: str) -> AnalogEvidence:
    bundle = cases_service.get_case(zone_id)
    years = bundle.years_like_this
    analogs = sorted(
        (point for point in years.campaigns if point.is_analog),
        key=lambda point: point.analog_rank or 0,
    )
    return AnalogEvidence(
        context=_context(bundle),
        years_like_this=years.model_copy(update={"campaigns": analogs}),
        selection_note=(
            "Only the published analog campaigns are returned, in their original rank order. "
            "The decision date and signals are fixed in this demonstration; this does not "
            "search for analogs for today's weather or an arbitrary field."
        ),
    )


def _available_selections(water: WaterBlock) -> list[WaterSelection]:
    return [
        WaterSelection(depth_m=depth, initial_water_fraction=fraction, summer_shift_days=shift)
        for depth, fraction, shift in sorted(
            {
                (episode.depth_m, episode.initial_water_fraction, episode.summer_shift_days)
                for episode in water.episodes
            }
        )
    ]


def compare_rotations(
    zone_id: str,
    depth_m: float = 1.0,
    initial_water_fraction: float = 0.5,
    summer_shift_days: int = 0,
) -> RotationComparison:
    bundle = cases_service.get_case(zone_id)
    compare = bundle.compare
    water = compare.water
    selection = WaterSelection(
        depth_m=depth_m,
        initial_water_fraction=initial_water_fraction,
        summer_shift_days=summer_shift_days,
    )
    available = _available_selections(water) if water is not None else []
    if water is not None:
        if selection not in available:
            options = ", ".join(
                f"({item.depth_m} m, {item.initial_water_fraction}, {item.summer_shift_days} days)"
                for item in available
            )
            raise InvalidSelectionError(
                "No released water scenario for this exact combination. "
                f"Available (depth, initial fraction, summer shift): {options}."
            )
        # A shift exists only at 1 m / 50%. Never silently substitute another profile.
        water = water.model_copy(
            update={
                "episodes": [
                    episode
                    for episode in water.episodes
                    if episode.scenario_id is not None
                    and episode.depth_m == depth_m
                    and episode.initial_water_fraction == initial_water_fraction
                    and episode.summer_shift_days == summer_shift_days
                ],
                "robustness": [
                    row
                    for row in water.robustness
                    if row.depth_m == depth_m
                    and row.initial_water_fraction == initial_water_fraction
                    and row.summer_shift_days == summer_shift_days
                ],
                "calendar_effects": [
                    row
                    for row in water.calendar_effects
                    if row.depth_m == depth_m
                    and row.initial_water_fraction == initial_water_fraction
                    and row.summer_shift_days == summer_shift_days
                ],
            }
        )
        if not water.episodes:
            raise cases_service.CaseDataError("The selected analog water episodes are missing")
    return RotationComparison(
        context=_context(bundle),
        strategies=compare.strategies,
        margins_meta=compare.margins_meta,
        margin_assumptions=compare.margin_assumptions,
        analog_margins=compare.analog_margins,
        water_status=bundle.modules.water,
        water=water,
        requested_water_selection=selection,
        available_water_selections=available,
        selection_note=(
            "Water is unavailable for this zone; no other zone's results were substituted."
            if water is None
            else "Water episodes are the published analogs for the exact requested profile, "
            "initial reserve and summer sowing shift. Sowing dates are in each crop record. "
            "Paired robustness and calendar counts retain their full historical episode set. "
            "Margins retain their own published assumptions and are not recalculated for "
            "water settings. A closest water match is not the same rotation; read water_match."
        ),
        not_computed=compare.not_computed,
    )


def get_field_evidence(zone_id: str, field_id: str | None = None) -> FieldEvidence:
    bundle = cases_service.get_case(zone_id)
    field = bundle.field
    result = FieldEvidence(
        context=_context(bundle),
        status=bundle.modules.field,
        farm_name=None,
        farm_name_is_made_up=None,
        available_field_ids=[],
        selected_field_id=None,
        lot=None,
        lots_meta=None,
        ndvi_months=[],
        reference_field=None,
        reference_meta=None,
        limitations=[],
        selection_note="Field evidence is unavailable for this zone.",
    )
    if field is None:
        if field_id is not None:
            raise InvalidSelectionError("This zone has no public field evidence to select.")
        return result
    reference = field.reference_field
    available_ids = {lot.field_id for lot in field.lots}
    if reference is not None:
        available_ids.add(reference.field_id)
    selected_id = field_id or (reference.field_id if reference is not None else None)
    if selected_id is None or selected_id not in available_ids:
        raise InvalidSelectionError(
            f"Select a public field_id from: {', '.join(sorted(available_ids))}."
        )
    return result.model_copy(
        update={
            "farm_name": field.farm_name,
            "farm_name_is_made_up": field.farm_name_is_made_up,
            "available_field_ids": sorted(available_ids),
            "selected_field_id": selected_id,
            "lot": next((lot for lot in field.lots if lot.field_id == selected_id), None),
            "lots_meta": field.lots_meta,
            "ndvi_months": field.ndvi_months,
            "reference_field": reference
            if reference is not None and reference.field_id == selected_id
            else None,
            "reference_meta": field.reference_meta
            if reference is not None and reference.field_id == selected_id
            else None,
            "limitations": field.limitations,
            "selection_note": (
                "One public satellite-estimated footprint; polygon coordinates are WGS84 "
                "longitude/latitude. No private farm records. Null means missing, never zero. "
                "Omitting field_id selects the water reference footprint. Water scenarios "
                "belong only to that reference footprint and cannot be transferred to a lot."
            ),
        }
    )
