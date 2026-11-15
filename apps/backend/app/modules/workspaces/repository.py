from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.workspaces.models import Workspace


async def get_by_owner(session: AsyncSession, owner_id: str) -> Workspace | None:
    return await session.get(Workspace, owner_id)


async def upsert(session: AsyncSession, owner_id: str, region_id: str) -> None:
    # One statement, so two tabs finishing onboarding at once cannot collide.
    statement = (
        insert(Workspace)
        .values(owner_id=owner_id, region_id=region_id)
        .on_conflict_do_update(
            index_elements=[Workspace.owner_id],
            set_={"region_id": region_id, "updated_at": func.now()},
        )
    )
    await session.execute(statement)
