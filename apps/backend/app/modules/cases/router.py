"""Public, read-only demonstration cases. No sign-in: judges and visitors open them directly."""

from fastapi import APIRouter, HTTPException

from app.modules.cases import service
from app.modules.cases.schemas import CaseBundle, CaseIndex

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=CaseIndex)
def get_case_index() -> CaseIndex:
    """How the 2026/27 campaign started in every zone that has a case."""
    try:
        return service.get_case_index()
    except service.CaseDataError as error:
        raise HTTPException(503, "Case data unavailable; contact the operator") from error


@router.get("/{zone_id}", response_model=CaseBundle)
def get_case(zone_id: str) -> CaseBundle:
    """Years like this, the strategy comparison and the field view for one zone."""
    try:
        return service.get_case(zone_id)
    except service.CaseNotFoundError as error:
        raise HTTPException(404, "No case data for this region yet") from error
    except service.CaseDataError as error:
        raise HTTPException(503, "Case data unavailable; contact the operator") from error
