"""A shared, public-source demonstration dataset; requires a user handle."""

from fastapi import APIRouter, HTTPException

from app.core.auth import CurrentUser
from app.modules.water import service
from app.modules.water.assets import ArtifactError
from app.modules.water.schemas import StrategiesBundle, WaterRunDetail

router = APIRouter(prefix="/water/strategies", tags=["water"])


@router.get("", response_model=StrategiesBundle)
def get_water_strategies(user: CurrentUser) -> StrategiesBundle:
    """Shared Pergamino research scenarios; contains no user's farm records."""
    try:
        return service.get_water_strategies()
    except (ArtifactError, OSError) as error:
        raise HTTPException(503, "Water scenarios unavailable; contact the operator") from error


@router.get("/runs/{run_id}", response_model=WaterRunDetail)
def get_water_strategy_run(run_id: str, user: CurrentUser) -> WaterRunDetail:
    """Daily series and crop stages for one released historical scenario."""
    try:
        return service.get_water_strategy_run(run_id)
    except KeyError as error:
        raise HTTPException(404, "Unknown historical run") from error
    except (ArtifactError, OSError) as error:
        raise HTTPException(503, "Water scenarios unavailable; contact the operator") from error
