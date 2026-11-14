import asyncio
import importlib.util
import pkgutil

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

import app.modules
from app.core.config import get_settings
from app.core.db import Base

# Import every module's models so autogenerate sees the whole schema.
for module in pkgutil.iter_modules(app.modules.__path__):
    if importlib.util.find_spec(f"app.modules.{module.name}.models"):
        importlib.import_module(f"app.modules.{module.name}.models")


def run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


async def main() -> None:
    engine = create_async_engine(get_settings().sqlalchemy_url, poolclass=NullPool)
    async with engine.connect() as connection:
        await connection.run_sync(run_migrations)
    await engine.dispose()


asyncio.run(main())
