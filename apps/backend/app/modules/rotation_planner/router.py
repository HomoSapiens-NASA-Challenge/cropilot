from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUser
from app.core.db import SessionDep
from app.modules.rotation_planner import service
from app.modules.rotation_planner.pipeline import SimulatorDataError
from app.modules.rotation_planner.schemas import RotationPlanRequest, RotationPlanRun
from app.modules.workspaces import service as workspaces_service

router = APIRouter(prefix="/rotation-plans", tags=["rotation-planner"])


@router.post("", response_model=RotationPlanRun, status_code=status.HTTP_202_ACCEPTED)
async def start_rotation_plan(
    data: RotationPlanRequest, user: CurrentUser, session: SessionDep
) -> RotationPlanRun:
    """Queue a planner run for the caller's workspace region; poll it with `get_rotation_plan`."""
    workspace = await workspaces_service.get_workspace(session, user.id)
    if workspace is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Pick a region before planning")
    try:
        return service.start_rotation_plan(user.id, workspace.region.id, data)
    except SimulatorDataError as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Simulator data unavailable; contact the operator"
        ) from error


@router.get("/{run_id}", response_model=RotationPlanRun)
def get_rotation_plan(run_id: str, user: CurrentUser) -> RotationPlanRun:
    """The latest snapshot of one of the caller's runs: stages, convergence and the result."""
    try:
        return service.get_rotation_plan(user.id, run_id)
    except service.RunNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown run; start a new one") from error
