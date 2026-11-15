from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.routing import APIRoute

from app.core.db import engine
from app.modules.assistant.router import router as assistant_router
from app.modules.cases.router import router as cases_router
from app.modules.crops.router import router as crops_router
from app.modules.farms.router import router as farms_router
from app.modules.health.router import router as health_router
from app.modules.regions.router import router as regions_router
from app.modules.rotation_planner.router import router as rotation_planner_router
from app.modules.water.router import router as water_router
from app.modules.workspaces.router import router as workspaces_router

# Every module router is registered here, under the `/api` prefix.
ROUTERS: list[APIRouter] = [
    assistant_router,
    health_router,
    farms_router,
    regions_router,
    workspaces_router,
    water_router,
    crops_router,
    cases_router,
    rotation_planner_router,
]


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
