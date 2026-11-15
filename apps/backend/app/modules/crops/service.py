"""Serve the released per-field crop maps. HTTP never runs the satellite models."""

from pydantic import ValidationError

from app.core.config import CropMapSettings
from app.modules.crops.schemas import FieldMap, Zone


class CropMapUnavailableError(Exception):
    """The crop-map release is not installed, or its file does not match the contract."""


def get_field_map(zone: Zone) -> FieldMap:
    path = CropMapSettings().crop_map_dir / f"lots_{zone}_en.geojson"
    try:
        field_map = FieldMap.model_validate_json(path.read_bytes())
    except (OSError, ValidationError) as error:
        raise CropMapUnavailableError(f"Crop map for {zone} unavailable") from error
    if field_map.meta.zone != zone:
        raise CropMapUnavailableError(f"Crop map file for {zone} holds {field_map.meta.zone}")
    return field_map
