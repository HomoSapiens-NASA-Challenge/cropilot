from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.modules.seasons import service
from app.modules.seasons.schemas import SeasonDashboard

router = APIRouter(prefix="/seasons", tags=["seasons"])


@router.get("/dashboard", response_model=SeasonDashboard)
def get_season_dashboard(_: CurrentUser) -> SeasonDashboard:
    # Same demo field for every user until fields are linked to farms.
    return service.get_dashboard()
