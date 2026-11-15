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

Build the optional interactive card once before starting the backend:

```sh
pnpm --filter @cropilot/webapp build:mcp
```

Rebuild after changing its source. The output is generated and ignored by Git. `pnpm build`
also builds the card; the production backend Dockerfile builds and copies it into the Python
image. A Python-only checkout still serves all four voice/text tools; `resources/read` gives
an explicit operator error until the card is built.

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

The same example is runnable without copying code, from `apps/backend`:

```sh
uv run python ../../scripts/mcp/client.py --shift 7 --check-card
```

Pass `--url https://YOUR-ORIGIN/api/mcp` for a deployed server. It prints the complete structured
evidence to stdout and checks the optional UI resource; it does not require an LLM or voice key.

## Interactive rotation card

An MCP Apps host discovers `compare_rotations`'s `_meta.ui.resourceUri`, reads
`ui://cropilot/rotation-card.html` (`text/html;profile=mcp-app`), and renders it in its sandbox.
The card uses the official Apps SDK's `App` bridge. Plain MCP clients continue receiving the
same structured/text evidence, with one additive `analog_campaigns` field; that field retains
all seven published analogs, including the two without water runs.

The card shows three simulated water rotations and two explicitly uncomputed rotations.
Users can change depth, initial reserve and summer sowing shift through `compare_rotations`,
select a historical start campaign, inspect crop dates/stress/deficit and open source links
through the host. Bars represent unmet demand over **three continuous historical campaigns**,
not one season. The reference rotation remains unconfirmed, and a closest-phase match is
labeled. Changing depth or reserve when a shifted run is unavailable explicitly requests the
default calendar; controls always display the last successful selection. A failed request
keeps prior evidence with an error and retry. Malformed or unsupported-version results are
rejected. An error or invalid result pushed by the host clears the card because it may refer
to a new comparison; newer host results supersede pending card calls. A host without
tool-call support gets a static card.

The fixed decision date, reference footprint, units and research limitations remain visible.
There is no model execution or recomputation in the browser. Campaign changes only filter the
returned evidence. Card interactions do not send an unsolicited message or start an LLM turn;
an orchestrator that wants narration of later selections should use its tool-call results.

The HTML contains its own JS, CSS and fonts. Resource CSP metadata allows no external
connection or asset domains; all tool calls and source-opening requests go through the host.
It requests no camera, microphone or geolocation permission. The host owns sandbox isolation
and enforcement; this server does not implement a general-purpose MCP Apps host.

Use a client supporting the [MCP Apps extension](https://modelcontextprotocol.io/extensions/apps/overview).
Actual rendering and remote-connector setup depend on the host. Local validation used the
official `AppBridge` and `PostMessageTransport`, a sandboxed iframe with direct network access
blocked, real backend tools, Chromium at 1200×1000 and 390×844. It does **not** establish that
Claude, a physical mobile device or a public deployment has been tested.

## Voice handoff

The published Tomás proposal is
[research/ui-agente.md on hub/toto](https://github.com/HomoSapiens-NASA-Challenge/hub/blob/ca784c5e4bec021e7a97edf6dc3fd2da48a417a6/research/ui-agente.md).
It mentions Pipecat UI's audio visualizer and Vercel AI SDK chat components, but explicitly
does not require a Pipecat backend. As checked on 2026-11-15 across the published Cropilot,
hub and simulator branches, no executable voice agent, audio transport or selected voice
provider was present. This PR therefore supplies a working MCP connection contract and SDK
client; it does not claim a live voice connection.

The future voice orchestrator should connect once using Streamable HTTP, discover the four
tools, execute calls server-side and return both the evidence and its limits to the model.
Keep `structuredContent`, interpret `isError` as a tool failure, and retain null/missing data.
Do not strip source/scale metadata to narrate only a number. Voice-only consumers ignore the
UI resource; an Apps-capable conversational host can show the same tool's card. Microphone,
speech recognition, language-model turns and speech synthesis belong to that future agent.

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
They also check UI metadata, HTML MIME/CSP, and continued tool availability when the UI build
is absent. After building, run `python3 scripts/mcp/check-built-card.py`; CI checks that the
card has no external scripts, styles or assets. Deployment smoke checks read the actual
resource, so an image without its card cannot pass deployment validation.

The integration follows the official SDK's
[ASGI lifecycle guidance](https://py.sdk.modelcontextprotocol.io/run/asgi/),
[deployment security guidance](https://py.sdk.modelcontextprotocol.io/run/deploy/) and
[client transport API](https://py.sdk.modelcontextprotocol.io/client/transports/).
The small [SDK middleware](https://py.sdk.modelcontextprotocol.io/advanced/middleware/) hook
rejects unknown argument names because the default SDK function model ignores extras.
Middleware is a provisional SDK API; rerun the protocol tests when upgrading the locked SDK.

No new scientific dataset or model is introduced. Scientific sources and their limitations
come directly from the existing case-v1 bundles, preserved in every detailed tool response.

The view follows the official [MCP Apps build guide](https://modelcontextprotocol.io/extensions/apps/build)
and [SDK API](https://apps.extensions.modelcontextprotocol.io/api/). Added libraries are
`@modelcontextprotocol/ext-apps` 2.0.4 (MIT), `@modelcontextprotocol/client` 2.4.0 (Apache-2.0,
locked version), and `vite-plugin-singlefile` 2.3.4 (MIT). The card is project code, not a
copied third-party dashboard; dependency versions and notices remain in the package metadata.
