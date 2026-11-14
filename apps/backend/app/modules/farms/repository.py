from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.farms.models import Farm


async def list_by_owner(session: AsyncSession, owner_id: str) -> Sequence[Farm]:
    result = await session.scalars(
        select(Farm).where(Farm.owner_id == owner_id).order_by(Farm.created_at.desc())
    )
    return result.all()


def add(session: AsyncSession, farm: Farm) -> None:
    session.add(farm)
