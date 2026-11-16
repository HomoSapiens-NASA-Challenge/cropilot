from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Workspace(Base):
    """What a user scoped Cropilot to. A user without one has not finished onboarding."""

    __tablename__ = "workspaces"

    # The handle the reader typed (see core/auth.py); no users table, so no foreign key.
    owner_id: Mapped[str] = mapped_column(primary_key=True)
    region_id: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
