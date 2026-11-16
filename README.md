# Cropilot

Decision support for agronomists: compare crop rotation strategies using NASA Earth observations together with local soil, crop and market data. Built for the NASA Space Apps Challenge 2026, _Field Shift: Adapting Farms with NASA Data_.

Cropilot supports the agronomist's judgment. It never replaces it.

The web starts in English. Choose **EN / ES** in the header for Spanish; your explicit
choice persists while navigating and on the next visit. See [web languages](docs/languages.md).

The demo is simplified for the challenge: similar years are searched within each zone only, with two signals, and several NASA products could not be used because Earthdata access was not enabled in time. See [demo scope and next steps](docs/demo-scope.md).

## Run it

Requires Node 24, pnpm, uv and Docker.

```sh
cp .env.example .env   # set BETTER_AUTH_SECRET and the Google OAuth client
pnpm install
pnpm dev               # http://localhost:5173
```

Mobile app: `cp apps/mobile/.env.example apps/mobile/.env`, then `pnpm mobile`. The demo opens public cases without sign-in or account creation. Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS origin, or use a simulator against `localhost` (Android: `adb reverse tcp:5173 tcp:5173`). A physical phone needs a reachable server address; its `localhost` is the phone itself.

## What is inside

| Path           | What                                                                                   | Stack                                                             |
| -------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/webapp`  | Web app                                                                                | Vite, React, TanStack Router, Query and Form, Tailwind, shadcn/ui |
| `apps/mobile`  | Mobile app                                                                             | Expo, Expo Router, TanStack Query                                 |
| `apps/backend` | API and model core                                                                     | FastAPI, SQLAlchemy, Alembic, Postgres                            |
| `apps/auth`    | Sign-in with Google                                                                    | Better Auth                                                       |
| `packages/api` | Typed API client shared by web and mobile, generated from the backend's OpenAPI schema | Hey API                                                           |

```
webapp (Vite)  ─┐                ┌─ /api/auth/*  → auth    (Better Auth)
mobile (Expo)  ─┴─ one origin ───┤
                                 └─ /api/*       → backend (FastAPI) → Postgres
```

Traefik in production and the Vite proxy in development route by path, so every client talks to a single origin. The auth service signs users in and issues short-lived access tokens; the backend verifies them against the auth service's public keys.

## Commands

| Command                     | What it does                                                                      |
| --------------------------- | --------------------------------------------------------------------------------- |
| `pnpm dev`                  | Starts the database, runs migrations and serves backend, auth and web with reload |
| `pnpm mobile`               | Starts Expo                                                                       |
| `pnpm lint` · `pnpm format` | Biome and Ruff                                                                    |
| `pnpm typecheck`            | `tsc` and `ty`                                                                    |
| `pnpm test`                 | `pytest` and `node --test`                                                        |
| `pnpm generate`             | Regenerates the API client after a backend change                                 |

Code conventions live in [`AGENTS.md`](AGENTS.md).

## Frozen research models

The backend includes regional water/heat ML models and a physical rotation-water model, with a separate pinned Python environment. See [installation, examples, evaluation and backend integration](docs/models.md). The examples run without starting the web app or database. Additional [7/14-day regional soil-wetness experiments](docs/moisture-models.md) include trained weights, temporal evaluation, uncertainty and reproducible training code.

[Pergamino water scenarios](docs/water-strategies.md) provide three-rotation comparisons, stress by crop stage, soil/initial-water sensitivity and sowing-date scenarios: 1,170 historical runs, authenticated read endpoints and a generated web/mobile client. Results are precomputed physical scenarios, not field-validated forecasts. The public web and mobile views read summaries already included in the case bundle. Install the result release to serve the separate authenticated endpoints with detailed daily results.

[Crop map by field](docs/crop-map.md) gives, for every field of Pergamino and Paraná, the summer crop of each campaign 2020/21–2025/26 (INTA's map, and a model trained on NASA HLS imagery for 2025/26), its vigor against the zone's fields with the same crop, and the El Niño phase of each summer. The model agrees with INTA on 86 % of Pergamino pixels in campaigns it never saw. Install the `crop-map-v1` release before serving the endpoint.

[Five water-model candidates](docs/model-candidates.md) record the broader research roadmap. Stage stress and sowing-date scenarios are implemented; the other three candidates remain proposals.

Web and mobile share the water-scenario selector. Choose a historical campaign, soil depth, initial reserve and summer sowing offset to inspect the released run and its per-crop evidence. Unsupported combinations and campaigns without runs are stated explicitly. These controls select frozen historical scenarios; they do not retrain models or predict a field's future.

## Public MCP

The same public evidence is available at `/api/mcp` through the official Python MCP SDK: `list_cases`, `find_analog_years`, `compare_rotations` and `get_field_evidence`. Tools are read-only and retain sources, units, missing data and research limitations. They do not expose private farms or run models. See [client setup, examples and boundaries](docs/mcp.md).

`compare_rotations` also provides an interactive MCP Apps card with historical water bars, scenario controls, crop dates and source links. Run `pnpm --filter @cropilot/webapp build:mcp` for local use; production images include it automatically. Voice/text clients can use the tools without displaying the card. See the [interactive card and voice handoff](docs/mcp.md#interactive-rotation-card).

## Deploy

One VPS, Docker Compose, Traefik with automatic TLS.

1. Point the domain's DNS at the VPS and open ports 80 and 443.
2. On the VPS, clone the repo into `~/cropilot` and create `.env` from `.env.example` with `DOMAIN`, `ACME_EMAIL` and production secrets.
3. Add `https://<DOMAIN>/api/auth/callback/google` to the Google OAuth client's authorized redirect URIs.
4. Provision and verify the frozen water results with `scripts/deploy/prepare-strategies.sh`. The public map is included in the case bundle; the separate authenticated crop-map API needs its [own release](docs/crop-map.md#install-and-read).
5. Run `scripts/deploy/deploy.sh` to build, verify the mounted files, start healthy services and check the public routes and MCP.

Follow the [deployment runbook](docs/deployment.md) for required host settings, public-only operation, mobile connectivity, seven-day operation and rollback. Automatic deployment is opt-in after a verified manual deployment and uses the tested commit; the runbook describes the repository variables and secret. Configuration in this repository does not mean a VPS has been provisioned.

See the [integration verification record and screenshots](docs/integration-verification.md) for the web/mobile flows, MCP checks, production-image checks and remaining device/hosting validation.

## AI use

- Claude Fable 5.2 (Anthropic), in Claude Code: scaffolding of this repository, including project structure, tooling and CI configuration, deployment files, the example `farms` module and these docs.
- Claude Fable 5.2 (Anthropic), in Claude Code: the public landing page with its navigation menus and menu pages, the visual system shared with the app, and the lint check that enforces it. The landing's line art is vector geometry drawn in code, not a generated image.
- Codex (OpenAI): frozen model packaging, isolated Python runtime, backend service, integrity/inference tests and model integration documentation; regional soil-wetness training and evaluation; Pergamino rotation/stage/sensitivity/calendar calculations, authenticated API, reproducibility tests and handoff documentation. No new frontend or generated field observations.
- Codex (OpenAI), subsequent integration: shared web/mobile water selection and historical crop details, explicit demo entry, public MCP tools, deployment preparation and browser verification. This integration reuses the existing case bundles and frozen results; no new model or field observation was generated.
- Codex (OpenAI), MCP Apps extension: interactive historical rotation card, SDK bridge, resource metadata, self-contained production build, protocol/browser checks and executable voice-client handoff. The extension preserves existing scientific results and does not include a working voice agent.
- Claude Opus 5.5 (Anthropic), in Claude Code: the `crops` module (crop-map endpoint, contract, tests) and `docs/crop-map.md`; the crop-type models, their evaluation and the per-field summaries it serves, built in the team hub (`research/crop-map/`). The team chose the problem, the zones and the approach.
