# Public MCP server

Cropilot exposes the public `case-v1` evidence used by the web and mobile apps at **`/api/mcp`**, over Streamable HTTP, with the official [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) (`mcp` 2.3.0, MIT). It reads the committed case bundles through `cases.service`. It does not run models, fetch new observations, read private farms or write data.

Tool results keep the decision date, units, sources, periods, locations, spatial scale and limitations. `null` means missing, never zero. The scenarios are historical: they are not forecasts, measured field water, yield predictions or agronomic recommendations.

## Connect a client

Build the interactive card once (production images build it automatically):

```sh
pnpm --filter @cropilot/webapp build:mcp
```

Start the backend, or the whole app with `pnpm dev`:

```sh
cd apps/backend
uv sync --frozen
uv run --env-file ../../.env uvicorn app.main:app --host 127.0.0.1 --port 8000
```

| Setting        | Local                           | Deployed                        |
| -------------- | ------------------------------- | ------------------------------- |
| Transport      | Streamable HTTP                 | Streamable HTTP                 |
| URL            | `http://127.0.0.1:8000/api/mcp` | `https://<your-domain>/api/mcp` |
| Authentication | None                            | None                            |

Use the URL without a trailing slash. Cloud hosts such as claude.ai cannot reach `localhost`; give them the deployed URL. Without the card build, the four tools still work and reading the card resource returns an explicit error.

A runnable client, from `apps/backend`:

```sh
uv run python ../../scripts/mcp/client.py --shift 7 --check-card
```

It prints the structured evidence and checks the card resource. Pass `--url https://<your-domain>/api/mcp` for a deployed server.

## Tools

Every tool is read-only, idempotent and closed-world, and returns structured content plus its text rendering.

| Tool                 | Arguments                                                                              | Returns                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `list_cases`         | None                                                                                   | Public zones, decision date, available modules, sources                                              |
| `find_analog_years`  | `zone_id`                                                                              | The published analog campaigns in rank order, with their signals, distance method, yields and limits |
| `compare_rotations`  | `zone_id`; optional `depth_m=1.0`, `initial_water_fraction=0.5`, `summer_shift_days=0` | Strategy explanations, analog margins and the matching water episodes, when available                |
| `get_field_evidence` | `zone_id`; optional `field_id`                                                         | One satellite-estimated footprint with crop history and NDVI; defaults to the water reference field  |

Start with `list_cases`. There are ten regions; only Pergamino has water and field evidence. The others return `not_available` and null blocks, never another region's results.

Water scenarios come only from the released combinations:

- Default calendar: depth 0.6 or 1.0 m, initial reserve 0.25, 0.5 or 0.75.
- Summer sowing shifts of -14, -7, +7 or +14 days, only at 1.0 m and 0.5.

Any other combination, unknown argument or invalid value fails with an MCP error instead of falling back to a default. The response lists `available_water_selections`. Water results apply only to their reference footprint, and each strategy's `water_match` says whether its water sequence matches the market rotation exactly or is the closest one. Market margins are not recalculated for water settings.

## Interactive rotation card

`compare_rotations` declares an [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) resource, `ui://cropilot/rotation-card.html`. Hosts that support the extension render it in their sandbox; other clients receive the same structured evidence.

The card shows the water bars of three simulated rotations over three consecutive historical campaigns, plus the two rotations that were not simulated. The reader can change depth, initial reserve and sowing shift (each change is a new `compare_rotations` call through the host), pick an analog campaign, inspect crop dates and stress, and open sources. The browser computes nothing.

The HTML bundles its own JS, CSS and fonts. Its CSP allows no external connections, and it asks for no camera, microphone or location.

## Style for client-drawn views

The server instructions describe the app's visual system (colors from `apps/webapp/src/index.css` and `lib/data-colors.ts`, Geist, one accent, flat cards), so charts that a host draws from these results look like Cropilot. The prompt `cropilot_dashboard` (argument `zone_id`, default `pergamino`) asks for a case dashboard in that style.

## Boundaries

- The FastAPI app owns the SDK session-manager lifespan. The server is stateless (JSON responses, no sessions), mounted after the existing `/api` routes.
- DNS-rebinding protection is on. Host and Origin must match `PUBLIC_URL`, plus the claude.ai web origins; loopback hosts are accepted when `PUBLIC_URL` is local. An untrusted Host returns 421 and an untrusted Origin 403.
- Requests are limited to 64 KiB and structured results to 128 KiB; an oversized result fails instead of being truncated.
- Tool inputs take no paths, URLs, user ids or credentials. Private endpoints (`/api/farms`, `/api/workspace`, `/api/water/strategies`) still require a user handle.

## Tests

```sh
cd apps/backend && uv run pytest tests/test_mcp.py -q
python3 scripts/mcp/check-built-card.py   # after build:mcp
```

The tests use the official client over ASGI and check exact scenario selection, preserved values and sources, rejected inputs and hostile Host/Origin headers, request limits, the card's metadata and CSP, and that private routes stay private. CI checks that the built card loads no external script, style or asset.

## Libraries

`mcp` 2.3.0 (MIT), `@modelcontextprotocol/ext-apps` 2.0.4 (MIT), `@modelcontextprotocol/client` 2.4.0 (Apache-2.0) and `vite-plugin-singlefile` 2.3.4 (MIT). The SDK [middleware](https://py.sdk.modelcontextprotocol.io/advanced/middleware/) used to reject unknown argument names is a provisional API: rerun `tests/test_mcp.py` when upgrading the SDK.
