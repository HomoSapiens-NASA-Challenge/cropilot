"""Reads the committed `case-v1` bundles. Nothing is computed at request time."""

from functools import cache
from pathlib import Path

from pydantic import ValidationError

from app.modules.cases.schemas import CaseBundle, CaseIndex
from app.modules.regions import service as regions_service

RESOURCES = Path(__file__).resolve().parent / "resources"


class CaseNotFoundError(Exception):
    def __init__(self, zone_id: str) -> None:
        super().__init__(f"No case data for zone: {zone_id}")


class CaseDataError(Exception):
    """A committed bundle is missing or does not match the contract."""


def get_case_index() -> CaseIndex:
    return _load_index()


def get_case(zone_id: str) -> CaseBundle:
    # The zone id must be a catalog region before it is ever used to build a path.
    try:
        regions_service.get_region(zone_id)
    except regions_service.UnknownRegionError as error:
        raise CaseNotFoundError(zone_id) from error
    if not (RESOURCES / f"{zone_id}.json").is_file():
        raise CaseNotFoundError(zone_id)
    return _load_bundle(zone_id)


@cache
def _load_index() -> CaseIndex:
    try:
        return CaseIndex.model_validate_json((RESOURCES / "index.json").read_bytes())
    except (OSError, ValidationError) as error:
        raise CaseDataError("The case index is missing or invalid") from error


@cache
def _load_bundle(zone_id: str) -> CaseBundle:
    try:
        return CaseBundle.model_validate_json((RESOURCES / f"{zone_id}.json").read_bytes())
    except (OSError, ValidationError) as error:
        raise CaseDataError(f"The case bundle for {zone_id} is invalid") from error
