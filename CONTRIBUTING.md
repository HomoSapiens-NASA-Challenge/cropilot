# Contributing

Product monorepo: web, mobile and backend. The model core (soil, market, water, RL, computer vision) lives inside the backend, one module per domain.

## Architecture

```
webapp (Vite)  ─┐
mobile (Expo)  ─┴─ one origin ─── /api/* → backend (FastAPI) → Postgres
```

- **One origin.** Traefik in production and the Vite proxy in development route by path. There is no CORS.
- **Identity without sign-in.** There are no accounts or passwords. The reader types a name or handle and `handleFromName` (`packages/api/src/identity.ts`) turns it into the user id. It travels as `Authorization: Bearer <handle>` and `apps/backend/app/core/auth.py` validates it with the same rule. It identifies, it does not authenticate: anyone who types the same name opens the same workspace, so judges can open the demo without signing up.
- **Contract.** The backend's OpenAPI schema generates `packages/api`: client, types, query options and Zod schemas used by web and mobile.
- **Database.** One Postgres, schema `public`, migrated with Alembic by the backend.

## Commands

From the repository root:

| Command                     | What it does                                                 |
| --------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                  | Starts the database, runs migrations, serves backend and web |
| `pnpm mobile`               | Starts Expo                                                  |
| `pnpm lint` · `pnpm format` | Biome, Ruff and the visual-system check                      |
| `pnpm typecheck`            | `tsc` and `ty`                                               |
| `pnpm test`                 | `pytest` and `node --test`                                   |
| `pnpm generate`             | Regenerates `packages/api` from the backend                  |
| `pnpm migrate`              | Applies the backend migrations                               |

- New migration: `cd apps/backend && uv run alembic revision --autogenerate -m "<what changes>"`.
- Dependencies: `pnpm --filter @cropilot/<package> add <lib>`, `uv add <lib>` in `apps/backend`, `pnpm exec expo install <lib>` in `apps/mobile`.
- UI components: `pnpm dlx shadcn@latest add <component>` in `apps/webapp` and `pnpm dlx @react-native-reusables/cli@latest add <component>` in `apps/mobile`, then adapt them to the visual system before use.

## Code rules

They apply to the whole repository. Linters, type checkers and hooks cover formatting; these cover what they cannot see.

- **Reuse before writing.** Look for an existing helper, component or type first. Code used by both apps goes to `packages/`; code used by one stays in that app. No abstraction before its second real use.
- **One source of truth.** API types and validation come from `@cropilot/api` and are never redeclared. Shared versions live in the `catalog` of `pnpm-workspace.yaml`. Every environment variable is declared in `.env.example` and read in one file per app (`core/config.py`, `src/env.ts`, `lib/env.ts`).
- **Minimal.** No features outside the demo path, no empty layers, no dead or commented-out code.
- **Strict types.** No `any`, no `# type: ignore`, no `as` to silence the compiler. Fix the code instead of disabling a lint rule.
- **Fail early.** Errors propagate with a clear message. Do not swallow exceptions or invent defaults.
- **Names.** Complete and descriptive, with the unit when there is one (`precip_mm`). Files in kebab-case (TypeScript) and snake_case (Python).
- **Comments.** In English, only to explain why.
- **Data.** Never an invented number. Mock or synthetic data says so in its name and in the interface. Every indicator shown carries its source: dataset, period and location.
- **Do not edit by hand:** `packages/api/src/generated/`, `packages/api/openapi.json`, `routeTree.gen.ts`, `pnpm-lock.yaml`, `uv.lock`, `apps/backend/app/modules/cases/resources/` (built by `scripts/demo_case/build.py`), `apps/backend/vendor/`.
- **Hooks.** Never skip them with `--no-verify`.

## Backend · `apps/backend/app`

```
core/          config.py · db.py · auth.py      shared infrastructure
modules/<x>/   router.py → service.py → repository.py · models.py · schemas.py
main.py        registers the routers in ROUTERS
```

- **One-way dependencies:** `router → service → repository → models`. `core` never imports from `modules`. A module uses another only through its `service`.
- `router.py`: HTTP only. Declares `response_model`, receives `CurrentUser` and `SessionDep`, calls a service. No logic or SQL.
- `service.py`: business rules and owner of the transaction (`commit`). Does not import FastAPI: business errors are module exceptions that the router maps to HTTP.
- `repository.py`: the only place with queries. Never commits.
- `models.py`: tables. `schemas.py`: API input and output. An ORM model is never returned without `response_model`.
- **Authorization.** Every private endpoint receives `CurrentUser` and filters by `user.id`. The owner of a record never comes from the client.
- **Endpoint names.** The function name becomes the TypeScript client name (`list_farms` → `listFarms`): a verb, unique across the API.
- **ML models.** Same module layout. CPU work (inference) never runs inside `async def`: use a `def` endpoint or `run_in_threadpool`. Weights and data stay out of Git; a script installs them into `apps/backend/models/` and `apps/backend/data/`.
- **Demo cases.** `modules/cases` serves the read-only `case-v1` contract (`schemas.py`) without sign-in: a national index and one case per region. The JSON files in `resources/` are built offline by `scripts/demo_case/` from results the models already computed; HTTP computes nothing. See `scripts/demo_case/README.md`.
- **Rotation planner.** `modules/rotation_planner` runs the `rotation_sim` simulator live. It is vendored in `apps/backend/vendor/rotation-sim` (a byte-for-byte copy of the `simulator` repository at commit 672a222, refreshed as described in `scripts/rotation_sim/install.sh`), which also installs its inputs into `apps/backend/data/rotation-sim`. Runs live in memory and execute on a single thread, so the backend must run as one process. See `docs/rotation-planner.md`.
- **Public MCP.** `modules/mcp` exposes bounded views of the same cases at `/api/mcp` with the official SDK, without a session or access to private farms. It keeps sources and limits and runs no inference. Host and origin are validated against `PUBLIC_URL`.
- **Schema.** Changes only through a reviewed, autogenerated Alembic migration. Never `create_all`.
- **Tests** in `tests/`, wherever a wrong number would mislead an agronomist (transformations, scoring) and for security.

## Web · `apps/webapp/src`

```
routes/          file-based routes (TanStack Router); thin: loader and composition
features/<x>/    components, hooks and logic of one domain
components/ui/   shadcn; added with the CLI and adapted to the visual system
lib/             clients and domain-free utilities
```

- Routes under `routes/_authenticated/` require a handle and a region in the workspace (`getWorkspaceOptions()`); without a region they redirect to `/onboarding`. The region changes later through `components/region-dialog.tsx`, which saves and calls `router.invalidate()`. The layout passes `user` and `region` through the route context. Routes under `routes/_site/` are the public site: the landing and its menu pages, built from `features/landing/site-content.ts`.
- `routes/_site/case.$zoneId.tsx` is the public case of a region (`/case/pergamino`), with no sign-in. Its blocks live in `features/case/` and are reused by Overview, Years like this, Strategies and Farm map.
- Colors that encode data (crop, lot status, yield anomaly, wetness scale) are declared once in `lib/data-colors.ts`.
- **Server state only through TanStack Query**, with the generated options (`listFarmsOptions()`, `createFarmMutation()`). No `fetch` or `useEffect` for data. The route preloads with `loader` and `ensureQueryData`; the component reads with `useSuspenseQuery`.
- **Forms** with TanStack Form, the generated Zod schemas (`zFarmCreate`) and the `Field` components.
- Local state with `useState`. No global store.
- **Styles** with Tailwind classes and theme tokens (`text-muted-foreground`). No loose colors or new CSS files. Conditional classes with `cn`.
- A feature never imports from another. Shared code moves up to `components/` or `lib/`.
- Internal imports use the `@/` alias.

### Languages

English is the default, whatever the browser language. The header's EN / ES selector switches the interface and stores the choice locally under `cropilot.language.v1`.

- `useI18n()` subscribes a component to the locale. `t(source, values)` looks up the English source text in `src/locales/es-*.ts` and fills named placeholders. Presentation helpers use `translate()`, and the component that renders them must subscribe through `useI18n()`.
- Translate only labels and explanations, at render time. Routes, identifiers, form values, API enums, source URLs, dataset names, numbers and units stay as they are. Changing language must not reset a form, map or scenario selection.
- Add the English source string and its Spanish translation together. `pnpm --filter @cropilot/webapp test` checks catalog coverage, duplicates, placeholders, numeric tokens and URLs. Unknown strings fall back to English.

### Visual system

Applies to the landing, the app and every shadcn component, new or existing. The landing is the reference.

- **Color 90/10.** Ink, cool greys and white. `--primary` is the only accent: main action, links, focus, active state and small data highlights. No color gradients or other hues. The exception is colors that encode data, such as the crop on the map, declared in one place.
- **Type.** Geist. `font-light tracking-tight` for page titles and large figures (from `text-xl`); `font-medium` for small titles and labels; `font-normal` for text and buttons. Never `font-semibold` or heavier.
- **Shape.** Radii come from `--radius`: 4px on controls (`rounded-lg`), one step more on cards and panels (`rounded-xl`). Pills only for badges, avatars and the floating assistant bubble (`components/assistant-panel.tsx`).
- **Flat surfaces.** Content in the page flow has a thin border and no shadow. Shadows are for floating layers: menus, popovers, panels over the map. The `shadow-*` scale is redefined in the theme; do not write custom shadows.
- **Glass**, only for layers over content. Panel: `bg-background/75 backdrop-blur-lg`. Backdrop of a modal, sheet or menu: `bg-background/40 backdrop-blur-xs`.
- **New shadcn component.** After `shadcn add`, review the file before using it: weights per the rule above, theme color tokens only (replace `black`, `white` and the Tailwind palette) and modal backdrops use the glass recipe. Do not add radii or shadows: they come from the theme.
- `pnpm lint` fails on a weight above `font-medium` or a color outside the theme (`apps/webapp/scripts/check-design-rules.mjs`, and its mobile counterpart).

## Mobile · `apps/mobile/src`

- Same split: `app/` (thin Expo Router screens), `features/`, `lib/`.
- Uses the same `@cropilot/api` as the web. Logic without UI that serves both goes to `packages/`.
- It is an app, not a shrunken website: it opens on a one-screen welcome (`app/index.tsx`), the full landing lives in `app/tour.tsx` (sections in `features/landing/`) and the public pages come from `features/landing/site-content.ts` (a copy of the web's) in `app/site/[sectionSlug]/[pageSlug].tsx`. When the web changes a text, change it here too.
- The public case (`case-v1`) is shown in bottom tabs (`app/(tabs)/`: Home, Years, Strategies, Map) and in `app/case/[zoneId]/` for any zone, with the blocks in `features/case/blocks/`. Each tab shows one thing to look at (card, chart or map) plus rows that open detail screens with a native header and back navigation (routes in `features/case/routes.ts`, always with the zone). Web texts are copied as they are, but long explanations go to the header's info button (`features/case/info-button.tsx`). Bottom sheets use `components/ui/sheet.tsx`, and a sheet never opens another.
- The public case opens without a name. `app/sign-in.tsx` asks for a name or handle (same contract as the web, stored in `expo-secure-store`) and only `app/farms.tsx` requires it.
- React Native Reusables components live in `src/components/ui/`, adapted to the web's visual system.
- Styles use NativeWind classes (Tailwind v3) and the tokens in `src/global.css`, which mirror `apps/webapp/src/index.css`. Light mode only. Native navigation takes the same values from `src/lib/theme.ts`: when a token changes, change both.
- `react-native-css-interop` is a direct dependency because the JSX that NativeWind emits imports it and pnpm does not hoist it. Its version is the one `nativewind` pins: upgrade them together.
- React is pinned in the catalog to the version the Expo SDK requires. Upgrade it with the SDK.

## API contract · `packages/api`

When an endpoint or schema changes, run `pnpm generate` and commit `openapi.json` and `src/generated/`. CI fails if they are stale. Contract changes need review.

## Before opening a PR

1. `pnpm lint && pnpm typecheck && pnpm test`.
2. Title in Conventional Commits: it becomes the squash commit message.
3. Record every new dataset, library, model or copied snippet in the team's source register (`submission.md` in the hub repository).
