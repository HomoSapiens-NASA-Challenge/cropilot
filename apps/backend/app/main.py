from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.routing import APIRoute

from app.core.config import get_settings
from app.core.db import engine
from app.modules.cases.router import router as cases_router
from app.modules.crops.router import router as crops_router
from app.modules.farms.router import router as farms_router
from app.modules.health.router import router as health_router
from app.modules.mcp.server import create_mcp_server, transport_security
from app.modules.regions.router import router as regions_router
from app.modules.rotation_planner.router import router as rotation_planner_router
from app.modules.water.router import router as water_router
from app.modules.workspaces.router import router as workspaces_router

# Every module router is registered here, under the `/api` prefix.
ROUTERS: list[APIRouter] = [
    health_router,
    farms_router,
    regions_router,
    workspaces_router,
    water_router,
    crops_router,
    cases_router,
    rotation_planner_router,
]


def _operation_id(route: APIRoute) -> str:
    # The handler name becomes the function name in the generated TypeScript client.
    return route.name


def create_app() -> FastAPI:
    mcp_server = create_mcp_server()
    mcp_app = mcp_server.streamable_http_app(
        json_response=True,
        stateless_http=True,
        max_request_body_size=64 * 1024,
        transport_security=transport_security(get_settings().better_auth_url),
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
        try:
            # Mounted ASGI apps do not run their own lifespan.
            async with mcp_server.session_manager.run():
                yield
        finally:
            await engine.dispose()

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
    # Existing API routes take precedence. The SDK serves /mcp without a slash redirect.
    app.mount("/api", mcp_app)
    return app


app = create_app()
