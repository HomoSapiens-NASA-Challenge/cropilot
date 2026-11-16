# Cropilot

Decision support for agronomists: compare crop rotation strategies using NASA Earth observations together with local soil, crop and market data. Built for the NASA Space Apps Challenge 2026, _Field Shift: Adapting Farms with NASA Data_.

For a field, Cropilot finds the past campaigns that started like the current one (El Niño state from NOAA ONI and root-zone soil wetness from NASA POWER) and shows what happened to each rotation in each of them, by name and date. It supports the agronomist's judgment. It never replaces it.

The demo is simplified: similar years are searched within each zone only, with two signals, and several NASA products could not be used because Earthdata access was not enabled in time. See [demo scope and next steps](docs/demo-scope.md).

## Run it

Requires Node 24, pnpm, uv and Docker.

```sh
cp .env.example .env
pnpm install
pnpm dev               # http://localhost:5173
```

The public cases open without a name. Farms and the planner ask for a name or handle, with no account or password.

Mobile app: `cp apps/mobile/.env.example apps/mobile/.env`, then `pnpm mobile`. Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS origin, or use a simulator against `localhost` (Android: `adb reverse tcp:5173 tcp:5173`).

## What is inside

| Path           | What                                                                   | Stack                                                             |
| -------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/webapp`  | Web app and public site, in English and Spanish                        | Vite, React, TanStack Router, Query and Form, Tailwind, shadcn/ui |
| `apps/mobile`  | Mobile app                                                             | Expo, Expo Router, TanStack Query, NativeWind                     |
| `apps/backend` | API and model core                                                     | FastAPI, SQLAlchemy, Alembic, Postgres                            |
| `packages/api` | Typed API client for web and mobile, generated from the OpenAPI schema | Hey API                                                           |
| `scripts`      | Offline builders: demo cases, Pergamino data, deployment, MCP checks   | Python                                                            |

```
webapp (Vite)  ─┐
mobile (Expo)  ─┴─ one origin ─── /api/* → backend (FastAPI) → Postgres
```

Traefik in production and the Vite proxy in development route by path, so every client talks to one origin. There are no accounts: the reader's handle is the user id and travels as the bearer credential, so judges can open the demo without signing up.

## Commands

| Command                     | What it does                                                 |
| --------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                  | Starts the database, runs migrations, serves backend and web |
| `pnpm mobile`               | Starts Expo                                                  |
| `pnpm lint` · `pnpm format` | Biome and Ruff                                               |
| `pnpm typecheck`            | `tsc` and `ty`                                               |
| `pnpm test`                 | `pytest` and `node --test`                                   |
| `pnpm generate`             | Regenerates the API client after a backend change            |

Code conventions are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

| Doc                                                      | What it covers                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Demo scope](docs/demo-scope.md)                         | How "Years like this" works, what is simplified and why, next steps                   |
| [Rotation planner](docs/rotation-planner.md)             | The live simulator, the exact optimum, Q-learning agents and the held-out backtest    |
| [Water models](docs/models.md)                           | Frozen regional water and heat models and the physical water balance                  |
| [Pergamino water scenarios](docs/water-strategies.md)    | 1,170 historical runs: rotations, crop-stage stress, soil and sowing-date sensitivity |
| [Soil wetness at 7 and 14 days](docs/moisture-models.md) | Regional wetness models, evaluation and limits                                        |
| [Crop map by field](docs/crop-map.md)                    | Summer crop per field from INTA and a model on NASA HLS, vigor against the zone       |
| [Evidence assistant](docs/assistant.md)                  | Text and voice questions over the case and planner evidence                           |
| [Public MCP server](docs/mcp.md)                         | The same evidence for MCP clients at `/api/mcp`, with an interactive rotation card    |
| [Data provenance](docs/source-attribution.md)            | How the interface separates original data from the team's calculations                |
| [Deployment](docs/deployment.md)                         | VPS runbook with Docker Compose and Traefik                                           |

## AI use

The team chose the problem, the approach, the zones and the data. Claude (Anthropic, in Claude Code) and Codex (OpenAI) helped write code, tests, data and model-packaging scripts and documentation, and Claude helped design the landing page; the landing's line art is vector geometry drawn in code, not a generated image. At runtime, the assistant uses OpenAI models to explain existing evidence, transcribe questions and read an excerpt aloud; spoken replies are labelled as AI-generated. The site's _Use of AI_ page (`/resources/use-of-ai`) summarizes the full register.
