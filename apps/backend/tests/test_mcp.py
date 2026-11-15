"""Exercise the real SDK over ASGI, including lifecycle and public-data boundaries."""

from collections.abc import Iterator
from pathlib import Path

import httpx2
import pytest
from fastapi.testclient import TestClient
from mcp import Client
from mcp.client.streamable_http import streamable_http_client
from mcp.types import CallToolResult, ListToolsResult

from app.main import create_app
from app.modules.cases import service as cases_service
from app.modules.cases.schemas import CaseIndex
from app.modules.mcp.schemas import AnalogEvidence, FieldEvidence, RotationComparison
from app.modules.mcp.server import MAX_RESULT_BYTES, transport_security

HEADERS = {
    "Accept": "application/json, text/event-stream",
    "MCP-Protocol-Version": "2025-11-25",
}


@pytest.fixture
def client() -> Iterator[TestClient]:
    # The context manager starts the parent lifespan and the mounted MCP session manager.
    with TestClient(create_app(), base_url="http://auth.test") as client:
        yield client


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def call_tool(client: TestClient, name: str, arguments: dict[str, object]) -> CallToolResult:
    response = client.post(
        "/api/mcp",
        headers=HEADERS,
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        },
        follow_redirects=False,
    )
    assert response.status_code == 200
    return CallToolResult.model_validate(response.json()["result"])


def test_legacy_initialize_list_and_call_without_auth(client: TestClient) -> None:
    initialized = client.post(
        "/api/mcp",
        headers=HEADERS,
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-11-25",
                "capabilities": {},
                "clientInfo": {"name": "cropilot-test", "version": "1.0"},
            },
        },
        follow_redirects=False,
    )
    assert initialized.status_code == 200
    assert initialized.json()["result"]["protocolVersion"] == "2025-11-25"
    assert "mcp-session-id" not in initialized.headers
    listed = client.post(
        "/api/mcp",
        headers=HEADERS,
        json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
    )
    assert listed.status_code == 200
    tools = ListToolsResult.model_validate(listed.json()["result"]).tools
    assert {tool.name for tool in tools} == {
        "list_cases",
        "find_analog_years",
        "compare_rotations",
        "get_field_evidence",
    }
    for tool in tools:
        assert tool.annotations is not None
        assert tool.annotations.read_only_hint is True
        assert tool.annotations.open_world_hint is False
        assert tool.output_schema is not None
    result = call_tool(client, "list_cases", {})
    assert result.is_error is False
    assert CaseIndex.model_validate(result.structured_content) == cases_service.get_case_index()


@pytest.mark.anyio
async def test_modern_official_client_over_streamable_http() -> None:
    app = create_app()
    async with (
        app.router.lifespan_context(app),
        httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app)) as http_client,
    ):
        transport = streamable_http_client("http://auth.test/api/mcp", http_client=http_client)
        async with Client(transport) as client:
            tools = await client.list_tools()
            assert len(tools.tools) == 4
            result = await client.call_tool("find_analog_years", {"zone_id": "pergamino"})
            assert result.is_error is False
            evidence = AnalogEvidence.model_validate(result.structured_content)
            assert evidence.context.zone_id == "pergamino"
            assert all(point.is_analog for point in evidence.years_like_this.campaigns)


@pytest.mark.parametrize("zone_id", [zone.zone_id for zone in cases_service.get_case_index().zones])
def test_analogs_preserve_published_values_and_provenance(client: TestClient, zone_id: str) -> None:
    original = cases_service.get_case(zone_id)
    result = call_tool(client, "find_analog_years", {"zone_id": zone_id})
    assert result.is_error is False
    evidence = AnalogEvidence.model_validate(result.structured_content)
    assert evidence.context.sources == original.sources
    assert evidence.context.limits == original.limits
    assert evidence.context.decision == original.decision
    assert evidence.years_like_this.current == original.years_like_this.current
    assert evidence.years_like_this.signals == original.years_like_this.signals
    assert evidence.years_like_this.campaigns == sorted(
        (point for point in original.years_like_this.campaigns if point.is_analog),
        key=lambda point: point.analog_rank or 0,
    )


@pytest.mark.parametrize(
    ("depth_m", "fraction", "shift"), [(1.0, 0.5, 0), (0.6, 0.25, 0), (1.0, 0.5, 7)]
)
def test_water_selection_is_exact_and_does_not_mutate_cached_cases(
    client: TestClient, depth_m: float, fraction: float, shift: int
) -> None:
    original = cases_service.get_case("pergamino")
    before = original.model_dump_json()
    assert original.compare.water is not None
    result = call_tool(
        client,
        "compare_rotations",
        {
            "zone_id": "pergamino",
            "depth_m": depth_m,
            "initial_water_fraction": fraction,
            "summer_shift_days": shift,
        },
    )
    assert result.is_error is False
    comparison = RotationComparison.model_validate(result.structured_content)
    assert comparison.water is not None
    assert comparison.water.episodes == [
        episode
        for episode in original.compare.water.episodes
        if episode.scenario_id is not None
        and episode.depth_m == depth_m
        and episode.initial_water_fraction == fraction
        and episode.summer_shift_days == shift
    ]
    assert len(comparison.water.episodes) == 15
    assert comparison.water.meta == original.compare.water.meta
    assert comparison.water.limitations == original.compare.water.limitations
    assert comparison.strategies == original.compare.strategies
    assert comparison.analog_margins == original.compare.analog_margins
    assert len(comparison.model_dump_json().encode()) <= MAX_RESULT_BYTES
    assert original.model_dump_json() == before


def test_missing_modules_are_explicit(client: TestClient) -> None:
    comparison = RotationComparison.model_validate(
        call_tool(client, "compare_rotations", {"zone_id": "balcarce"}).structured_content
    )
    assert comparison.water_status == "not_available"
    assert comparison.water is None
    assert comparison.available_water_selections == []
    assert len(comparison.strategies) >= 3
    field = FieldEvidence.model_validate(
        call_tool(client, "get_field_evidence", {"zone_id": "balcarce"}).structured_content
    )
    assert field.status == "not_available"
    assert field.lot is None
    assert field.reference_field is None


def test_field_selection_returns_only_the_public_selected_footprint(client: TestClient) -> None:
    original = cases_service.get_case("pergamino")
    assert original.field is not None
    default = FieldEvidence.model_validate(
        call_tool(client, "get_field_evidence", {"zone_id": "pergamino"}).structured_content
    )
    assert default.reference_field == original.field.reference_field
    assert default.context.sources == original.sources
    selected_lot = next(
        lot for lot in original.field.lots if lot.field_id != default.selected_field_id
    )
    selected = FieldEvidence.model_validate(
        call_tool(
            client,
            "get_field_evidence",
            {"zone_id": "pergamino", "field_id": selected_lot.field_id},
        ).structured_content
    )
    assert selected.lot == selected_lot
    assert selected.reference_field is None
    assert selected.reference_meta is None


@pytest.mark.parametrize(
    ("name", "arguments", "message"),
    [
        ("find_analog_years", {"zone_id": "unknown"}, "Unknown public zone"),
        ("find_analog_years", {"zone_id": "../../index"}, "Error executing tool"),
        ("compare_rotations", {"zone_id": "pergamino", "depth_m": 0.7}, "No released water"),
        (
            "compare_rotations",
            {"zone_id": "pergamino", "depth_m": 0.6, "summer_shift_days": 7},
            "No released water",
        ),
        (
            "compare_rotations",
            {"zone_id": "pergamino", "initial_water_fraction": 0.6},
            "No released water",
        ),
        (
            "compare_rotations",
            {"zone_id": "pergamino", "summer_shift_days": 1},
            "No released water",
        ),
        (
            "compare_rotations",
            {"zone_id": "pergamino", "summer_shift_days": 30},
            "Error executing tool",
        ),
        (
            "compare_rotations",
            {"zone_id": "pergamino", "depth_m": True},
            "Error executing tool",
        ),
        (
            "get_field_evidence",
            {"zone_id": "pergamino", "field_id": "private-farm"},
            "Select a public field_id",
        ),
        (
            "get_field_evidence",
            {"zone_id": "balcarce", "field_id": "268949"},
            "no public field evidence",
        ),
    ],
)
def test_invalid_selections_are_tool_errors(
    client: TestClient, name: str, arguments: dict[str, object], message: str
) -> None:
    result = call_tool(client, name, arguments)
    assert result.is_error is True
    assert result.structured_content is None
    assert message in result.model_dump_json()


def test_missing_bundle_is_sanitized(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cases_service._load_bundle.cache_clear()
    (tmp_path / "pergamino.json").write_text('{"schema_version":"invalid"}')
    monkeypatch.setattr(cases_service, "RESOURCES", tmp_path)
    try:
        result = call_tool(client, "find_analog_years", {"zone_id": "pergamino"})
        assert result.is_error is True
        assert "Public case data is unavailable" in result.model_dump_json()
        assert str(tmp_path) not in result.model_dump_json()
    finally:
        cases_service._load_bundle.cache_clear()


def test_mcp_rejects_untrusted_host_origin_and_oversized_requests(client: TestClient) -> None:
    payload = {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}
    bad_host = client.post(
        "/api/mcp", headers={**HEADERS, "Host": "attacker.example"}, json=payload
    )
    assert bad_host.status_code == 421
    bad_origin = client.post(
        "/api/mcp", headers={**HEADERS, "Origin": "https://attacker.example"}, json=payload
    )
    assert bad_origin.status_code == 403
    allowed_origin = client.post(
        "/api/mcp", headers={**HEADERS, "Origin": "http://auth.test"}, json=payload
    )
    assert allowed_origin.status_code == 200
    oversized = client.post(
        "/api/mcp",
        headers={**HEADERS, "Content-Type": "application/json"},
        content=" " * (64 * 1024 + 1),
    )
    assert oversized.status_code == 413


def test_production_host_allowlist_is_derived_from_the_public_origin() -> None:
    production = transport_security("https://cropilot.example")
    assert production.enable_dns_rebinding_protection is True
    assert production.allowed_hosts == ["cropilot.example"]
    assert production.allowed_origins == ["https://cropilot.example"]
    development = transport_security("http://localhost:5173")
    assert "127.0.0.1:*" in development.allowed_hosts
    with pytest.raises(ValueError, match="public origin"):
        transport_security("https://user:password@cropilot.example/private")


def test_unknown_arguments_cannot_silently_select_a_default_scenario(client: TestClient) -> None:
    response = client.post(
        "/api/mcp",
        headers=HEADERS,
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "compare_rotations",
                "arguments": {"zone_id": "pergamino", "decision_date": "2027-01-01"},
            },
        },
    )
    assert response.status_code == 200
    assert response.json()["error"]["code"] == -32602
    assert "Unsupported tool arguments: decision_date" in response.text


@pytest.mark.parametrize("path", ["/api/farms", "/api/water/strategies", "/api/workspace"])
def test_private_endpoints_still_require_auth(client: TestClient, path: str) -> None:
    assert client.get(path).status_code == 401
