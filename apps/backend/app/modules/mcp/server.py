"""Official MCP SDK transport and typed tools for the public demonstration only."""

from collections.abc import Callable
from typing import Annotated
from urllib.parse import urlsplit

from mcp import MCPError
from mcp.server import MCPServer, ServerRequestContext
from mcp.server.context import CallNext, HandlerResult
from mcp.server.mcpserver.exceptions import ToolError
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import INVALID_PARAMS, ToolAnnotations
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.modules.cases import service as cases_service
from app.modules.cases.schemas import CaseIndex
from app.modules.mcp import service
from app.modules.mcp.app_view import RESOURCE_MIME, RESOURCE_URI, read_rotation_card
from app.modules.mcp.schemas import AnalogEvidence, FieldEvidence, RotationComparison

MAX_RESULT_BYTES = 128 * 1024
ZoneId = Annotated[str, Field(min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")]
FieldId = Annotated[str, Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")]
# Web MCP hosts that call this public, read-only, credential-free endpoint.
CLIENT_ORIGINS = ("https://claude.ai", "https://claude.com")


def transport_security(public_origin: str) -> TransportSecuritySettings:
    origin = urlsplit(public_origin)
    if (
        origin.scheme not in {"http", "https"}
        or not origin.hostname
        or origin.username is not None
        or origin.password is not None
        or origin.path not in {"", "/"}
        or origin.query
        or origin.fragment
    ):
        raise ValueError("BETTER_AUTH_URL must be an HTTP(S) public origin for MCP")
    allowed_hosts = [origin.netloc]
    allowed_origins = [f"{origin.scheme}://{origin.netloc}", *CLIENT_ORIGINS]
    if origin.hostname in {"localhost", "127.0.0.1", "::1"}:
        # Dev clients may address either Vite's proxy or the loopback backend directly.
        allowed_hosts.extend(["localhost:*", "127.0.0.1:*", "[::1]:*"])
        allowed_origins.extend(["http://localhost:*", "http://127.0.0.1:*", "http://[::1]:*"])
    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=allowed_hosts,
        allowed_origins=allowed_origins,
    )


async def _read[Result: BaseModel, **Params](
    function: Callable[Params, Result], *args: Params.args, **kwargs: Params.kwargs
) -> Result:
    try:
        result = await run_in_threadpool(function, *args, **kwargs)
    except cases_service.CaseNotFoundError as error:
        raise ToolError(
            "Unknown public zone. Call list_cases to see available zone_id values."
        ) from error
    except service.InvalidSelectionError as error:
        raise ToolError(str(error)) from error
    except cases_service.CaseDataError as error:
        raise ToolError("Public case data is unavailable; contact the operator.") from error
    if len(result.model_dump_json().encode()) > MAX_RESULT_BYTES:
        raise ToolError("This public evidence exceeds the response limit; contact the operator.")
    return result


def create_mcp_server() -> MCPServer[None]:
    server: MCPServer[None] = MCPServer(
        "Cropilot public cases",
        version="case-v1",
        instructions=(
            "Read-only historical demonstration evidence for Argentine agronomists. "
            "Start with list_cases; only published zones and scenarios are available. "
            "Preserve units, source references, spatial scales, missing values and limitations. "
            "These fixed cases are not current weather, forecasts, measured field water, "
            "yield predictions or agronomic recommendations. Support local expert judgment."
        ),
    )
    read_only = ToolAnnotations(
        read_only_hint=True,
        destructive_hint=False,
        idempotent_hint=True,
        open_world_hint=False,
    )

    async def reject_unknown_arguments(
        ctx: ServerRequestContext[None, object], call_next: CallNext
    ) -> HandlerResult:
        # The SDK's function argument model otherwise ignores unknown names. A misspelled
        # selection must fail rather than quietly reading a different default scenario.
        if ctx.method == "tools/call" and ctx.params is not None:
            arguments = ctx.params.get("arguments")
            if isinstance(arguments, dict):
                for tool in await server.list_tools():
                    if tool.name == ctx.params.get("name"):
                        unknown = set(arguments) - set(tool.input_schema.get("properties", {}))
                        if unknown:
                            raise MCPError(
                                code=INVALID_PARAMS,
                                message=f"Unsupported tool arguments: {', '.join(sorted(unknown))}",
                            )
        return await call_next(ctx)

    server.middleware.append(reject_unknown_arguments)

    @server.resource(
        RESOURCE_URI,
        name="cropilot-rotation-card",
        title="Cropilot historical rotation comparison",
        mime_type=RESOURCE_MIME,
        meta={"ui": {"csp": {"connectDomains": [], "resourceDomains": []}}},
    )
    def rotation_card() -> str:
        return read_rotation_card()

    @server.tool(annotations=read_only)
    async def list_cases() -> CaseIndex:
        """List public zones, fixed decision date, available modules and data sources."""
        return await _read(service.list_cases)

    @server.tool(annotations=read_only)
    async def find_analog_years(zone_id: ZoneId) -> AnalogEvidence:
        """Read published analog years for a zone, with ranks, method, signals and sources."""
        return await _read(service.find_analog_years, zone_id)

    @server.tool(annotations=read_only, meta={"ui": {"resourceUri": RESOURCE_URI}})
    async def compare_rotations(
        zone_id: ZoneId,
        depth_m: Annotated[float, Field(strict=True, gt=0, le=2)] = 1.0,
        initial_water_fraction: Annotated[float, Field(strict=True, ge=0, le=1)] = 0.5,
        summer_shift_days: Annotated[int, Field(strict=True, ge=-14, le=14)] = 0,
    ) -> RotationComparison:
        """Compare published rotations and analog water episodes; no new simulations.

        Depth and initial reserve are scenario assumptions. Calendar shifts use days relative
        to each published summer sowing date, not the decision date. Only exact released
        combinations work; the response lists them. Missing water stays explicitly unavailable.
        """
        return await _read(
            service.compare_rotations, zone_id, depth_m, initial_water_fraction, summer_shift_days
        )

    @server.tool(annotations=read_only)
    async def get_field_evidence(zone_id: ZoneId, field_id: FieldId | None = None) -> FieldEvidence:
        """Read one public footprint's crop/NDVI evidence; default to the water reference field.

        The response lists valid public field IDs. No private farms or model inference.
        """
        return await _read(service.get_field_evidence, zone_id, field_id)

    return server
