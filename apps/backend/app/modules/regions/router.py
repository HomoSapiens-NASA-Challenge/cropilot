from collections.abc import Sequence

from fastapi import APIRouter

from app.modules.regions import service
from app.modules.regions.schemas import Region

router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("", response_model=list[Region])
def list_regions() -> Sequence[Region]:
    """Public catalog: the departments a workspace can be scoped to."""
    return service.list_regions()
