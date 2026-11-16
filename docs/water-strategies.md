# Pergamino water scenarios

Four backend capabilities are available for demonstration footprint **268949**: compare three rotations, locate stress within crop stages, inspect sensitivity to soil depth and initial water, and compare summer sowing calendars. The release contains **1,170 physical simulations**, with daily results and source-linked metadata. These are historical scenarios, not operational forecasts or field-validated recommendations.

## Install and read

From `apps/backend`, with uv and the GitHub CLI authenticated with read access to this repository:

```sh
uv sync --frozen
uv run python -m app.modules.water.cli strategies-setup
uv run python -m app.modules.water.cli strategies > /tmp/pergamino-strategies.json
```

The installer downloads the approximately 86 MB [models-strategies-v1 release](https://github.com/HomoSapiens-NASA-Challenge/cropilot/releases/tag/models-strategies-v1), checks the archive and every member against [the committed manifest](../apps/backend/app/modules/water/resources/strategies-release.json), and installs `data/strategies-v1/` and `models/strategies-v1/`. It refuses to overwrite altered installations. `strategies-setup --archive /path/cropilot-strategies-v1.tar.gz` supports an already downloaded archive. No database, scientific environment or old model installation is required to read these results.

Use a `run_id` from `runs` to read daily details:

```sh
uv run python -m app.modules.water.cli strategies --run-id <run_id>
uv run python -m app.modules.water.cli strategies-verify
```

These sibling directories follow the parents of `WATER_DATA_DIR` and `WATER_MODELS_DIR`; settings are defined in `.env.example`. They do not replace `water-v1` or `moisture-v1`.

## The four analyses

### 1. Three rotations under the same weather

| Strategy ID        | Campaign 1 | Campaign 2             | Campaign 3    | Purpose                                                                           |
| ------------------ | ---------- | ---------------------- | ------------- | --------------------------------------------------------------------------------- |
| `mapped-reference` | Maize      | First soybean          | First soybean | Illustrative reference based on dominant mapped summer classes in 2021/22–2023/24 |
| `winter-wheat`     | Maize      | Wheat + second soybean | First soybean | Explore the water cost of adding a winter crop                                    |
| `summer-maize`     | Maize      | First soybean          | Maize         | Explore replacing the third summer crop                                           |

The reference is **not a farmer-confirmed current rotation**. INTA maps identify dominant summer classes, not verified sowing dates, winter management or complete farm records. The FTW footprint is satellite-estimated and unvalidated. Its soil point is approximately 60.6415° W, 33.9461° S; NASA POWER weather represents the nearby regional point at 60.57° W, 33.90° S.

Each run spans three continuous June–May campaigns. Start years 1984–2022 produce 39 episodes, ending no later than May 31, 2025. Water and surface depletion carry over daily, including fallow periods and campaign boundaries. Water is never reset at sowing. Summaries include crop ET demand, actual crop ET, unmet demand, end water and excess above capacity. `versus_reference_rotation` pairs the same episode, depth, initial fraction and calendar shift. A negative deficit difference means less modeled unmet crop ET under those assumptions, not a superior rotation.

### 2. Stress by crop stage and heat overlap

Every crop event has four configured stages: `initial`, `development`, `mid_season` and `late_season`. Each reports dates, duration, cumulative crop ET deficit, stress days, longest consecutive stress interval, days with maximum temperature above 35 °C, and days when stress and heat coincide.

A stress day has modeled `water_stress_coefficient < 1 - 1e-9`. Longest intervals stop at the stage boundary. Stage deficits reconcile with crop totals. These stages use fixed generic FAO durations; `mid_season` does not mean observed flowering. The 35 °C screen describes overlap and is not a validated crop-damage function. `water_at_sowing_mm` reports the continuous simulated state at the start of the sowing day.

### 3. Sensitivity to soil depth and initial water

The unshifted comparison includes two assumed profile depths and three initial-water fractions (25%, 50%, 75%): **702 runs**. Capacity is the layer-weighted difference between SoilGrids mean retention at 33 and 1500 kPa. The source unit `10-2 cm³/cm³` is divided by 100 before integrating thickness in millimetres.

| Assumed depth | Derived plant-available capacity |
| ------------- | -------------------------------- |
| 0.6 m         | 69.85 mm                         |
| 1.0 m         | 109.05 mm                        |

Neither depth nor initial water is a field measurement. Depth is fixed throughout each run, not dynamic root development. NASA `GWETROOT` is not converted into available millimetres. `robustness` contains 18 strategy/depth/fraction groups with paired minimum, median, maximum and lower/equal/higher deficit counts across the 39 episodes. Equality uses a numerical tolerance of 1e-7 mm. The episodes overlap, so counts are descriptive; they are not independent trials or calibrated probabilities.

### 4. Sowing-date scenarios

All summer crops shift by −14, −7, 0, +7 or +14 days; winter wheat stays fixed. Nominal dates are October 21 for maize, November 8 for first soybean, December 18 for second soybean and June 10 for wheat. Coefficients and stage lengths remain fixed. These inherited calendar assumptions require local agronomic review.

Calendar effects use **only 1 m depth and 50% initial water**. The four additional offsets add 468 runs; their zero-shift references are already in the sensitivity set. `versus_unshifted_calendar` compares each shifted run with the same strategy and initial conditions. `calendar_effects` contains 12 strategy/shift distributions. No crop is shortened or removed to fit a date; overlapping or out-of-campaign schedules are rejected as a complete paired case. This release has zero rejected cases. No date is optimized or automatically recommended.

## API

Both endpoints require a user handle (`Authorization: Bearer <handle>`):

| Endpoint                                  | Response                                                                                                | Generated TanStack Query helper                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `GET /api/water/strategies`               | `StrategiesBundle`: configuration, sources, 1,170 run summaries, sensitivity and calendar distributions | `getWaterStrategiesOptions()`                      |
| `GET /api/water/strategies/runs/{run_id}` | `WaterRunDetail`: three campaign summaries, crop stages and 1,095 or 1,096 daily rows                   | `getWaterStrategyRunOptions({ path: { run_id } })` |

Use the generated client in `@cropilot/api`; do not redeclare response types. Filter the bundle by `strategy_id`, `start_year`, `depth_m`, `initial_water_fraction` and `summer_shift_days`, then fetch one selected run. `daily_path` is an archive-relative provenance path, not a browser URL. The detail endpoint accepts only registered opaque run IDs, checks the requested file hash, and never accepts server paths. Unknown IDs return 404; missing or altered assets return 503 without exposing filesystem paths.

The scenarios are shared demonstration material derived from public sources, not tied to the reader's farms. Handlers only read precomputed results; they never launch simulations.

Show crop demand and per-crop results next to totals: a rotation with more crops can have more total unmet ET simply because it has more crop demand. Keep `research_only`, sources, period, location and assumptions visible.

In production, `scripts/deploy/prepare-strategies.sh` provisions the release and `compose.prod.yml` mounts it read-only (see [deployment](deployment.md)). Without it these endpoints return 503; the public case does not depend on them.

## Reproduce and verify

Full reproduction requires the existing verified `water-v1` Python 3.12.7 runtime. The API itself stays on Python 3.14.

```sh
# From apps/backend; setup installs the unchanged scientific engine.
uv run python -m app.modules.water.cli setup
uv run python -m app.modules.water.cli strategies-build --output /absolute/new/pergamino-build
```

`strategies-build` verifies the old runtime, downloads the pinned Pergamino source ZIP and checks its SHA-256. An optional `--source-archive /path/pergamino-tables-and-field.zip` avoids downloading it again. The output must be a new directory outside immutable inputs. The [configuration](../apps/backend/app/modules/water/resources/strategies-config.json) and [builder](../apps/backend/experiments/strategies.py) define every case. Daily gzip content is deterministic within the pinned runtime; archive compression timestamps may differ on repackaging, so compare payload hashes.

The packaging command, for maintainers creating a new release, is:

```sh
uv run python experiments/package_strategies.py \
  --build /absolute/new/pergamino-build --output data/releases \
  --resources app/modules/water/resources
```

Keep published release assets immutable; a changed calculation requires a new release version and matching manifest. Results and raw inputs stay outside Git.

[Numerical verification](../apps/backend/app/modules/water/resources/strategies-evaluation.json) covers all 1,170 runs, 1,282,020 daily rows, 3,900 crop events and 15,600 stages. It checks schema validity, initial conditions, day-to-day continuity, water bounds, independently recalculated mass balance, stage totals and paired differences. The largest independently recalculated balance residual is approximately 1.42e-14 mm. This confirms numerical consistency, **not agronomic accuracy**; there are no measured field-water observations against which to estimate error.

```sh
uv run pytest -q
uv run ty check experiments --python .venv-models --python-version 3.12 --error-on-warning
.venv-models/bin/python -m pytest experiments -q
```

Scientific tests use explicitly synthetic fixtures to check units, invalid inputs, leap days, calendar boundaries, overlap, stage partitioning and paired joins. API tests check the handle requirement, hash enforcement and path handling. The real-release integration test runs after `strategies-setup`, otherwise it is skipped.

## Sources and limits

- [Pergamino diagnostic snapshot](https://github.com/HomoSapiens-NASA-Challenge/hub/releases/tag/pergamino-diagnostics-2026-11-14), `pergamino-tables-and-field.zip`, SHA-256 `c9cb64544951469e3e765e3107a0d0f43dcee63bd5c22d27828c931cd27d0c2b`: four pinned JSON inputs, each with an individual hash in the result bundle.
- NASA POWER daily weather for 1984–2025, UTC, from that snapshot; reference ET is calculated by the unchanged engine's FAO-56 implementation. The incomplete 2026 weather record is not used.
- SoilGrids modeled retention and the FTW modeled footprint, with attribution and licenses in the team's source register.
- INTA national crop maps for the reference sequence; map classes do not establish farm management.
- The rotation simulator at commit `36ca379879f292fef773ce2e7f7d38688f11a548`, with its FAO and INTA parameter references.

All historical episodes are replayed; there is no ENSO analog selection or future-weather optimization. Unpartitioned excess above capacity is not flooding, waterlogging or nitrate loss. Deficit is unmet crop ET, not a prescription for irrigation. The calculations do not estimate yield, profit, carbon, pests or rotation-induced changes in infiltration. The regional wetness ML experiments remain a separate research product and are not used to initialize these runs.
