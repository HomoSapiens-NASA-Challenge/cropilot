from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.farms import repository
from app.modules.farms.models import Farm
from app.modules.farms.schemas import FarmCreate


async def list_farms(session: AsyncSession, owner_id: str) -> Sequence[Farm]:
    return await repository.list_by_owner(session, owner_id)


async def create_farm(session: AsyncSession, owner_id: str, data: FarmCreate) -> Farm:
    farm = Farm(owner_id=owner_id, name=data.name)
    repository.add(session, farm)
    await session.commit()
    return farm
