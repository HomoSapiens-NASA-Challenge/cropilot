# Cropilot public-case MCP

Cropilot exposes the same public `case-v1` demonstration evidence used by the web and mobile
apps through the official [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
(`mcp` 2.3.0, MIT). The endpoint is **`/api/mcp`**, using Streamable HTTP. It reads committed
case bundles through `cases.service`; it does not run models, fetch new observations, read
private farms, or write data.

This is a fixed historical demonstration for agronomists. Preserve the returned decision date,
units, provenance, source URLs, periods, locations, spatial scales and limitations when using
the evidence in an answer. `null` means missing, never zero. Historical scenarios are not
forecasts, measured field water, yield predictions, calibrated probabilities or agronomic
recommendations. The agronomist and farmer retain local judgment.

## Connect a client

Run the normal application with the root `.env` configured, or start only the backend:

```sh
cd apps/backend
uv sync --frozen
uv run --env-file ../../.env uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The MCP tools need the committed case files, not a running model environment or a database
query. Normal backend settings still need to be present at startup.

Configure an MCP client that supports remote Streamable HTTP:

| Setting        | Local development               | Deployed application                         |
| -------------- | ------------------------------- | -------------------------------------------- |
| Name           | `cropilot`                      | `cropilot`                                   |
| Transport      | Streamable HTTP                 | Streamable HTTP                              |
| URL            | `http://127.0.0.1:8000/api/mcp` | Your application's HTTPS origin + `/api/mcp` |
| Authentication | None                            | None, public demonstration evidence only     |

Use the exact endpoint without a trailing slash. No API key, Google login, OAuth flow or
server-side language-model key is required. A remote cloud client cannot reach a localhost
URL; use the deployed HTTPS endpoint for that client.

For Codex, the equivalent local client registration is:

```sh
codex mcp add cropilot --url http://127.0.0.1:8000/api/mcp
```

Replace the URL with the deployed HTTPS endpoint when connecting remotely. Registration is
a client action; the application does not change your Codex configuration.

An executable client example using the installed official SDK, from `apps/backend`:

```sh
uv run python - <<'PY'
import asyncio
from mcp import Client

async def main():
    async with Client("http://127.0.0.1:8000/api/mcp") as client:
        tools = await client.list_tools()
        print([tool.name for tool in tools.tools])
        result = await client.call_tool("compare_rotations", {
            "zone_id": "pergamino",
            "depth_m": 1.0,
            "initial_water_fraction": 0.5,
            "summer_shift_days": 7,
        })
        if result.is_error:
            raise RuntimeError(result.content)
        comparison = result.structured_content
        print(comparison)

asyncio.run(main())
PY
```

Example client prompt: “List Cropilot's public cases, then show the analog years for Pergamino.
Compare its three published rotations at 1 m depth, 50% initial reserve and a seven-day later
summer sowing date. Explain missing data, closest rotation matches and local review needs,
with the returned source URLs. Do not describe the scenarios as a forecast.”

## Tools and selections

Every tool declares `readOnlyHint`, `idempotentHint`, `destructiveHint=false` and
`openWorldHint=false`. Outputs include a structured schema and SDK-generated text content.

| Tool                 | Arguments                                                                              | Returned evidence                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_cases`         | None                                                                                   | Public zones, fixed decision date, module availability, source metadata.                                                                      |
| `find_analog_years`  | `zone_id`                                                                              | Only the published analog campaigns in rank order; original signals, distance method, yields, sources and limits.                             |
| `compare_rotations`  | `zone_id`; optional `depth_m=1.0`, `initial_water_fraction=0.5`, `summer_shift_days=0` | Published strategy explanations and analog margins; exact selected water episodes and matching historical paired counts, when available.      |
| `get_field_evidence` | `zone_id`; optional `field_id`                                                         | One public satellite-estimated footprint, crop history, NDVI, metadata and valid public field IDs. Defaults to the water reference footprint. |

Start with `list_cases` instead of guessing an identifier. The current catalog has ten regions;
only Pergamino includes water and field evidence. Other regions return explicit
`water_status="not_available"` / `status="not_available"` and null blocks. No other region's
water results are substituted.

Water scenarios are selected from the released combinations:

- Unshifted calendar: depths 0.6 or 1.0 m and initial reserves 0.25, 0.5 or 0.75.
- Summer sowing shifts: -14, -7, +7 or +14 days, only at 1.0 m and 0.5 initial reserve.

The response also lists `available_water_selections`. A combination such as 0.6 m with a
seven-day shift fails explicitly, rather than falling back to the reference profile. Only
published analog episodes are returned (currently five analogs × three strategies = 15
episodes). The crop records preserve actual scenario sowing dates and per-crop results.
`summer_shift_days` changes the historical summer sowing assumption; it does not change the
fixed decision date or recompute the analog search. Arbitrary dates and other unknown argument
names are rejected. There is no arbitrary-weather or arbitrary-field simulation endpoint.

Robustness and calendar counts retain their own full historical episode set; they are not
counts over the five analogs alone. Market margins keep the published market assumptions and
are not recalculated for water settings. Preserve each strategy's `water_match`: a `closest`
water sequence is not an exact match to the displayed market rotation. Water scenarios apply
only to their reference footprint; selecting another public field does not transfer the water
results to it.

Unknown zones, missing fields, invalid numeric values and unsupported released combinations
produce MCP errors. A missing/corrupt case bundle returns a sanitized error, without server
paths. Missing modules are successful, explicitly unavailable evidence responses. Calls to a
zone without water return no applied water selection and an empty available-selection list;
the requested settings remain labeled as requested only.

## Serving and boundaries

The FastAPI parent owns the SDK session-manager lifespan. Each app instance creates its own
server. The mount follows existing `/api` routes, so their routing and authorization remain in
place. The endpoint uses JSON responses and stateless HTTP, with no retained user session or
sticky-session requirement. The SDK handles MCP protocol negotiation, including legacy
`initialize` clients and current `server/discover` clients.

DNS-rebinding protection remains enabled. MCP accepts the host and origin from the existing
`BETTER_AUTH_URL` setting. Production Compose sets it to `https://${DOMAIN}`; the proxy must
preserve that Host. When that setting is a loopback origin, loopback hosts/ports are also
accepted so local clients can reach the backend or Vite proxy. An untrusted Host returns 421;
an untrusted browser Origin returns 403. Non-browser clients may omit Origin. The application
does not add cross-origin browser access.

Requests are limited to 64 KiB by the SDK. Structured tool results are limited to 128 KiB;
oversized results fail explicitly instead of silently truncating evidence. The wire response
is larger because MCP also includes the text representation. Tools select analog episodes
and at most one footprint instead of sending the entire case bundle or daily model series.

There are no filesystem paths, URLs to fetch, user IDs or credentials in tool inputs. Private
`/api/farms`, `/api/workspace` and `/api/water/strategies` endpoints still require their normal
access token. Public MCP is not a mechanism for using those endpoints anonymously.

## Verification and sources

From `apps/backend`:

```sh
uv run pytest tests/test_mcp.py -q
```

The tests exercise the official client over ASGI Streamable HTTP and legacy
initialize/list/call requests, preserve published numeric values and provenance, check exact
scenario selection and cached-bundle immutability, reject invalid inputs and hostile
Host/Origin headers, check request limits and verify private routes still require auth.

The integration follows the official SDK's
[ASGI lifecycle guidance](https://py.sdk.modelcontextprotocol.io/run/asgi/),
[deployment security guidance](https://py.sdk.modelcontextprotocol.io/run/deploy/) and
[client transport API](https://py.sdk.modelcontextprotocol.io/client/transports/).
The small [SDK middleware](https://py.sdk.modelcontextprotocol.io/advanced/middleware/) hook
rejects unknown argument names because the default SDK function model ignores extras.
Middleware is a provisional SDK API; rerun the protocol tests when upgrading the locked SDK.

No new scientific dataset or model is introduced. Scientific sources and their limitations
come directly from the existing case-v1 bundles, preserved in every detailed tool response.
