"""Authenticated access to shared, public-source crop maps of two demonstration zones."""

from fastapi import APIRouter, HTTPException

from app.core.auth import CurrentUser
from app.modules.crops import service
from app.modules.crops.schemas import FieldMap, Zone

router = APIRouter(prefix="/crops", tags=["crops"])


@router.get("/zones/{zone}/fields", response_model=FieldMap)
def get_crop_field_map(zone: Zone, user: CurrentUser) -> FieldMap:
    """Every field of the zone with its crop per campaign and its vigor against the zone."""
    try:
        return service.get_field_map(zone)
    except service.CropMapUnavailableError as error:
        raise HTTPException(503, "Crop map unavailable; contact the operator") from error
