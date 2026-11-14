from collections.abc import Sequence

from fastapi import APIRouter, status

from app.core.auth import CurrentUser
from app.core.db import SessionDep
from app.modules.farms import service
from app.modules.farms.models import Farm
from app.modules.farms.schemas import FarmCreate, FarmRead

router = APIRouter(prefix="/farms", tags=["farms"])


@router.get("", response_model=list[FarmRead])
async def list_farms(user: CurrentUser, session: SessionDep) -> Sequence[Farm]:
    return await service.list_farms(session, user.id)


@router.post("", response_model=FarmRead, status_code=status.HTTP_201_CREATED)
async def create_farm(data: FarmCreate, user: CurrentUser, session: SessionDep) -> Farm:
    return await service.create_farm(session, user.id, data)
