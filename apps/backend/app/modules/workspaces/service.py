from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.regions import service as regions_service
from app.modules.workspaces import repository
from app.modules.workspaces.schemas import WorkspaceRead, WorkspaceSave


async def get_workspace(session: AsyncSession, owner_id: str) -> WorkspaceRead | None:
    workspace = await repository.get_by_owner(session, owner_id)
    if workspace is None:
        return None
    return WorkspaceRead(region=regions_service.get_region(workspace.region_id))


async def save_workspace(
    session: AsyncSession, owner_id: str, data: WorkspaceSave
) -> WorkspaceRead:
    """Raises `UnknownRegionError` when the region is not in the catalog."""
    region = regions_service.get_region(data.region_id)
    await repository.upsert(session, owner_id, region.id)
    await session.commit()
    return WorkspaceRead(region=region)
