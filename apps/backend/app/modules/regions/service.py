from collections.abc import Sequence

from app.modules.regions.catalog import REGIONS
from app.modules.regions.schemas import Region

_REGIONS_BY_ID = {region.id: region for region in REGIONS}


class UnknownRegionError(Exception):
    def __init__(self, region_id: str) -> None:
        super().__init__(f"Unknown region: {region_id}")


def list_regions() -> Sequence[Region]:
    return REGIONS


def get_region(region_id: str) -> Region:
    region = _REGIONS_BY_ID.get(region_id)
    if region is None:
        raise UnknownRegionError(region_id)
    return region
