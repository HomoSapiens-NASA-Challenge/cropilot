"""Check the deployed public demo over its real origin, including TLS and MCP routing."""

import argparse
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def request(
    origin: str, path: str, payload: dict | None = None, status: int = 200
) -> object:
    headers = {"Accept": "application/json, text/html, text/event-stream"}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        headers["MCP-Protocol-Version"] = "2025-11-25"
        data = json.dumps(payload).encode()
    try:
        response = urlopen(
            Request(origin + path, data=data, headers=headers), timeout=20
        )
    except HTTPError as error:
        response = error
    with response:
        require(
            response.status == status,
            f"{path}: expected HTTP {status}, got {response.status}",
        )
        require(response.geturl() == origin + path, f"{path}: unexpected redirect")
        body = response.read(10_000_001)
        require(len(body) <= 10_000_000, f"{path}: response exceeds smoke-check limit")
        if "application/json" in response.headers.get("Content-Type", ""):
            return json.loads(body)
        return body.decode()


def rpc(origin: str, method: str, params: dict) -> dict:
    response = request(
        origin,
        "/api/mcp",
        {"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
    )
    require(isinstance(response, dict) and "result" in response, f"MCP {method} failed")
    result = response["result"]
    require(
        isinstance(result, dict) and not result.get("isError"),
        f"MCP {method} returned an error",
    )
    return result


def smoke(origin: str) -> None:
    parts = urlsplit(origin)
    require(
        parts.scheme in {"https", "http"}
        and bool(parts.netloc)
        and not parts.path
        and not parts.query
        and not parts.fragment
        and not parts.username,
        "Use a bare origin such as https://cropilot.example.org",
    )
    require(
        parts.scheme == "https" or parts.hostname in {"localhost", "127.0.0.1", "::1"},
        "Remote checks require HTTPS; HTTP is only allowed for localhost",
    )
    for path in ("/", "/case/pergamino"):
        page = request(origin, path)
        require(
            isinstance(page, str) and 'id="root"' in page, f"{path}: app shell missing"
        )
    require(request(origin, "/api/health") == {"status": "ok"}, "Backend health failed")
    index = request(origin, "/api/cases")
    require(
        isinstance(index, dict) and index.get("schema_version") == "case-v1",
        "Case index failed",
    )
    zones = index.get("zones", [])
    require(bool(zones), "Case index has no zones")
    for zone in zones:
        zone_id = zone["zone_id"]
        bundle = request(origin, "/api/cases/" + zone_id)
        require(
            isinstance(bundle, dict)
            and bundle.get("schema_version") == "case-v1"
            and bundle.get("zone_id") == zone_id
            and bool(bundle.get("sources")),
            f"Case bundle {zone_id} failed",
        )
    require(request(origin, "/api/auth/ok") == {"ok": True}, "Auth health failed")
    jwks = request(origin, "/api/auth/jwks")
    require(
        isinstance(jwks, dict) and isinstance(jwks.get("keys"), list),
        "Auth JWKS failed",
    )
    request(origin, "/api/water/strategies", status=401)
    request(origin, "/api/cases/smoke-unknown-zone", status=404)

    initialized = rpc(
        origin,
        "initialize",
        {
            "protocolVersion": "2025-11-25",
            "capabilities": {},
            "clientInfo": {"name": "cropilot-deploy-smoke", "version": "1.0"},
        },
    )
    require("serverInfo" in initialized, "MCP initialize lacks server information")
    tools = rpc(origin, "tools/list", {})
    require(
        any(tool["name"] == "list_cases" for tool in tools.get("tools", [])),
        "MCP tools missing",
    )
    cases = rpc(origin, "tools/call", {"name": "list_cases", "arguments": {}})
    require(
        bool(cases.get("structuredContent")),
        "MCP list_cases returned no structured data",
    )
    comparison = rpc(
        origin,
        "tools/call",
        {
            "name": "compare_rotations",
            "arguments": {
                "zone_id": "pergamino",
                "depth_m": 1.0,
                "initial_water_fraction": 0.5,
                "summer_shift_days": 0,
            },
        },
    ).get("structuredContent", {})
    require(
        comparison.get("water_status") == "available" and bool(comparison.get("water")),
        "MCP Pergamino rotation comparison has no water evidence",
    )
    print(
        f"PASS: app routes, {len(zones)} cases, auth, private API boundary and MCP at {origin}"
    )
    print(
        "Google sign-in and authenticated water reads require a separate real-session check."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()
    try:
        smoke(args.base_url.rstrip("/"))
    except (OSError, URLError, ValueError, KeyError, TypeError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
