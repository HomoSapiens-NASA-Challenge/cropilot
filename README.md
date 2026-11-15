# Cropilot

Decision support for agronomists: compare crop rotation strategies using NASA Earth observations together with local soil, crop and market data. Built for the NASA Space Apps Challenge 2026, _Field Shift: Adapting Farms with NASA Data_.

Cropilot supports the agronomist's judgment. It never replaces it.

## Run it

Requires Node 24, pnpm, uv and Docker.

```sh
cp .env.example .env   # set BETTER_AUTH_SECRET and the Google OAuth client
pnpm install
pnpm dev               # http://localhost:5173
```

Mobile app: `cp apps/mobile/.env.example apps/mobile/.env`, then `pnpm mobile`. Google sign-in needs a URL Google accepts, so use a simulator or emulator against `localhost` (Android: `adb reverse tcp:5173 tcp:5173`), or point `EXPO_PUBLIC_API_URL` at the deployed domain.

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

[Pergamino water scenarios](docs/water-strategies.md) provide three-rotation comparisons, stress by crop stage, soil/initial-water sensitivity and sowing-date scenarios: 1,170 historical runs, authenticated read endpoints and a generated web/mobile client. Results are precomputed physical scenarios, not field-validated forecasts. Install the result release before serving these endpoints; UI integration remains separate.

[Crop map by field](docs/crop-map.md) gives, for every field of Pergamino and Paraná, the summer crop of each campaign 2020/21–2025/26 (INTA's map, and a model trained on NASA HLS imagery for 2025/26), its vigor against the zone's fields with the same crop, and the El Niño phase of each summer. The model agrees with INTA on 86 % of Pergamino pixels in campaigns it never saw. Install the `crop-map-v1` release before serving the endpoint.

[Five water-model candidates](docs/model-candidates.md) record the broader research roadmap. Stage stress and sowing-date scenarios are implemented; the other three candidates remain proposals.

## Deploy

One VPS, Docker Compose, Traefik with automatic TLS.

1. Point the domain's DNS at the VPS and open ports 80 and 443.
2. On the VPS, clone the repo into `~/cropilot` and create `.env` from `.env.example` with `DOMAIN`, `ACME_EMAIL` and production secrets.
3. Add `https://<DOMAIN>/api/auth/callback/google` to the Google OAuth client's authorized redirect URIs.
4. `docker compose -f compose.prod.yml up -d --build`

To deploy on every push to `main`, set the repository variables `DEPLOY_HOST`, `DEPLOY_USER` and `DEPLOY_KNOWN_HOSTS` (the output of `ssh-keyscan <host>`) and the secret `DEPLOY_SSH_KEY`.

## AI use

- Claude Fable 5.2 (Anthropic), in Claude Code: scaffolding of this repository, including project structure, tooling and CI configuration, deployment files, the example `farms` module and these docs.
- Claude Fable 5.2 (Anthropic), in Claude Code: the public landing page with its navigation menus and menu pages, the visual system shared with the app, and the lint check that enforces it. The landing's line art is vector geometry drawn in code, not a generated image.
- Codex (OpenAI): frozen model packaging, isolated Python runtime, backend service, integrity/inference tests and model integration documentation; regional soil-wetness training and evaluation; Pergamino rotation/stage/sensitivity/calendar calculations, authenticated API, reproducibility tests and handoff documentation. No new frontend or generated field observations.
- Claude Opus 5.5 (Anthropic), in Claude Code: the `crops` module (crop-map endpoint, contract, tests) and `docs/crop-map.md`; the crop-type models, their evaluation and the per-field summaries it serves, built in the team hub (`research/crop-map/`). The team chose the problem, the zones and the approach.
