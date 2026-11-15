from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.routing import APIRoute

from app.core.db import engine
from app.modules.farms.router import router as farms_router
from app.modules.health.router import router as health_router
from app.modules.water.router import router as water_router

# Every module router is registered here, under the `/api` prefix.
ROUTERS: list[APIRouter] = [health_router, farms_router, water_router]


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
    yield
    await engine.dispose()


def _operation_id(route: APIRoute) -> str:
    # The handler name becomes the function name in the generated TypeScript client.
    return route.name


def create_app() -> FastAPI:
    app = FastAPI(
        title="Cropilot API",
        lifespan=lifespan,
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
        redoc_url=None,
        generate_unique_id_function=_operation_id,
    )
    api = APIRouter(prefix="/api")
    for router in ROUTERS:
        api.include_router(router)
    app.include_router(api)
    return app


app = create_app()
