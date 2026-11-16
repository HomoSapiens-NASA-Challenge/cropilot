from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUser
from app.core.db import SessionDep
from app.modules.regions.service import UnknownRegionError
from app.modules.workspaces import service
from app.modules.workspaces.schemas import WorkspaceRead, WorkspaceSave

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.get("", response_model=WorkspaceRead | None)
async def get_workspace(user: CurrentUser, session: SessionDep) -> WorkspaceRead | None:
    """The caller's workspace, or `null` until onboarding picks a region."""
    return await service.get_workspace(session, user.id)


@router.put("", response_model=WorkspaceRead)
async def save_workspace(
    data: WorkspaceSave, user: CurrentUser, session: SessionDep
) -> WorkspaceRead:
    try:
        return await service.save_workspace(session, user.id, data)
    except UnknownRegionError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error
