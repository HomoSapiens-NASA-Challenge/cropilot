from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Workspace(Base):
    """What a user scoped Cropilot to. A user without one has not finished onboarding."""

    __tablename__ = "workspaces"

    # User id issued by the auth service. No foreign key: the auth schema is not ours.
    owner_id: Mapped[str] = mapped_column(primary_key=True)
    # Id from the region catalog, which lives in code (app/modules/regions/catalog.py).
    region_id: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
