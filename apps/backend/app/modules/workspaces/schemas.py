from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.modules.regions.schemas import Region


class WorkspaceSave(BaseModel):
    region_id: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class WorkspaceRead(BaseModel):
    region: Region
