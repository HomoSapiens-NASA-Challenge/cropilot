# Frozen water models

The original `models-water-v1` release makes the existing research models callable from Cropilot's backend. That release preserves the original training and adds no screens or HTTP endpoints.

The branch now also includes [newly trained regional wetness models at 7 and 14 days](moisture-models.md), distributed separately as `models-moisture-v1`.

The [five additional water-model proposals](model-candidates.md) describe the next candidate indicators, data readiness, evaluation and implementation order. They are separate from the trained releases above.

## Install

Requires `uv`, GitHub CLI (`gh`) authenticated with read access to this private repository, and internet for the first installation. No access to the original `hub` or `simulator` repositories is required to run the examples. From the repository root, after checking out `modelos`:

```sh
uv sync --frozen --directory apps/backend
uv run --directory apps/backend python -m app.modules.water.cli setup
uv run --directory apps/backend python -m app.modules.water.cli regional
```

`setup` downloads [models-water-v1](https://github.com/HomoSapiens-NASA-Challenge/cropilot/releases/tag/models-water-v1), checks the archive and every file against the committed manifest, and installs the exact training environment in `apps/backend/.venv-models`. It uses **Python 3.12.7**, separately from the API's **Python 3.14**. `uv` can download the required Python interpreter. Model execution does not inherit `PYTHONPATH` or `PYTHONHOME` from other projects.

No database, Docker, Google login, Node installation or `.env` is needed for these model commands. For a previously downloaded archive use `setup --archive /absolute/path/cropilot-water-models-v1.tar.gz`. Python/packages must still be available from the network or local uv cache.

Files are installed outside Git:

| Location in `apps/backend`             | Contents                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| `models/water-v1/enso-water-v1.joblib` | Frozen fitted estimators                                      |
| `models/water-v1/runtime/`             | Pinned upstream model source and original tests               |
| `data/water-v1/regional/`              | Regional panel, NASA POWER snapshots, NOAA ONI and audit      |
| `data/water-v1/water_cache/`           | NASA POWER and INTA/IDECOR responses with provenance sidecars |
| `data/water-runs/comparison-*/`        | Separate results for each physical-model run                  |
| `.venv-models/`                        | Python 3.12.7 and the complete pinned package environment     |

Optional absolute path overrides are declared in `.env.example`: `WATER_MODELS_DIR`, `WATER_DATA_DIR`, `WATER_ENVIRONMENT`. Keep all three separate. Setup rejects relative or overlapping paths, the application environment, and an existing interpreter with the wrong Python version before synchronizing dependencies. Do not point `WATER_ENVIRONMENT` at another project's environment.

## Run the examples

```sh
# Verify the installed source/data/weights and environment before integration.
uv run --directory apps/backend python -m app.modules.water.cli verify

# Regional inference, using the committed request by default.
uv run --directory apps/backend python -m app.modules.water.cli regional

# Three rotations × four historical episodes × three initial-water assumptions.
uv run --directory apps/backend python -m app.modules.water.cli water
```

`regional --request /absolute/path/request.json` accepts the contract illustrated in [request.example.json](../apps/backend/app/modules/water/resources/request.example.json). The frozen expected result is [response.example.json](../apps/backend/app/modules/water/resources/response.example.json). Input features must be prepared with the original regional pipeline and units; a field polygon alone is not a valid request. Available zones and date checks are enforced by the frozen inference code.

`water --config /absolute/path/config.json` accepts a modified [example configuration](../apps/backend/app/modules/water/resources/water-config.example.json), such as alternative supported crop sequences, initial water assumptions or historical episodes within the snapshot. This release only contains weather and soil for **the illustrative Río Cuarto point (−64.3, −33.2)**. Other coordinates are rejected. Real farm inputs require a separate data acquisition and validation step. The original simulator validates crop calendars, lengths, weather coverage and soil depth.

Each water run prints its output directory and `comparison.json` location. The manifest includes source links, assumptions, summaries and relative `daily_url` paths to daily JSON series. Run directories are unique, so a new request does not overwrite previous output. The frozen source/data directories must not be edited; copy configurations elsewhere.

## What is available and how well it works

| Component                                 | Frozen method                                    | Held-out historical result                                                                  | Appropriate dashboard use                                                         |
| ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Regional dry/intermediate/wet regime      | Logistic regression without ONI                  | Multiclass Brier **0.6911**, climatology **0.6939**; accuracy **39.17%**, equal to baseline | Experimental regional context with baseline and uncertainty                       |
| Regional precipitation minus reference ET | Histogram gradient boosting                      | MAE **80.31 mm**, baseline **89.92 mm**                                                     | A separate research climate-balance indicator                                     |
| Regional hot-day count                    | Histogram gradient boosting                      | MAE **6.08 days**, baseline **6.56 days**                                                   | A separate research heat indicator                                                |
| Crop-water scenario model                 | Daily physical water balance; **not trained ML** | **No field validation error available**                                                     | Compare water reserves, crop deficits and sensitivity across historical rotations |

The regional artifact includes nine learned candidates and six statistical baselines; the wrapper returns the three validation-selected models. Evaluation used ten Argentine regional points and 41 campaigns (1984/85–2024/25): 23 training, six validation and 12 test campaigns. Targets cover December 10–January 20 (42 days). All three selected improvements have bootstrap confidence intervals that include zero. These are **research-only results on revised historical inputs**, not validated operational forecasts. See [full metrics](../apps/backend/app/modules/water/resources/metrics.json).

The physical example compares soybean; maize/soybean; and wheat + second soybean/maize across continuous three-campaign episodes. Soil capacity is mapped CAD (84 mm at the example's assumed 1 m profile), not measured current moisture. Initial storage at 25%, 50% and 75% is a scenario assumption. Neither model predicts field yield, profit, pesticides, nitrates, carbon or flooding. Lower total water use does not establish that a rotation is better.

## Call from the backend

```python
from app.modules.water.service import compare_water_scenarios, predict_regional

# request is a JSON object matching request.example.json.
regional = predict_regional(request)

comparison = compare_water_scenarios()
manifest = comparison.manifest
output_directory = comparison.output_directory
```

These synchronous functions verify the installed release before executing in the separate environment. Use a job worker, a synchronous FastAPI `def` handler or `run_in_threadpool`; never call CPU inference directly inside `async def`. Catch `ArtifactError`/`ValueError` at your HTTP boundary. No model library is imported into the Python 3.14 API process.

When adding endpoints, follow Cropilot's existing auth and `response_model` conventions and regenerate `packages/api`. Do not expose server filesystem paths directly: serve authorized result IDs and daily series. Cache repeated scenario results by validated inputs and model version if needed. Preserve `research_only`, `validation_status`, units, sources and limitations in the interface.

Do not feed the regional 42-day prediction directly into the daily rotation simulator. The simulator needs complete daily historical weather. A future scenario-selection layer may connect them only after its own validation. There is currently no trained ensemble or automatic crop recommendation.

## Verification and recovery

```sh
uv run --directory apps/backend pytest -q
```

On a machine without installed model assets, three frozen-runtime integration tests are skipped; installer and existing app tests still run. After `setup`, those tests execute real frozen inference, reject an invalid request, and export two independent 36-run physical comparisons. `verify` rejects altered code, weights, data, unexpected files and linked paths before inference. The upstream scientific tests are included under each runtime's `tests/` directory, separately from the API tests.

If verification fails, keep the error and inspect the named file. Setup does not overwrite a modified or partial release. Move only the affected `water-v1` installation directories aside, then run setup to download verified replacements. To recreate the isolated Python environment, move only `.venv-models` aside and rerun setup; never remove the API environment or raw farm data. First-time setup needs GitHub read access; published assets remain private with the repository.

## Provenance

[release.json](../apps/backend/app/modules/water/resources/release.json) pins the release archive, every source/data/model file and the original commits. [sources.json](../apps/backend/app/modules/water/resources/sources.json) and the raw response sidecars retain dataset provenance. [requirements-lock.txt](../apps/backend/app/modules/water/resources/requirements-lock.txt) pins the full original Python environment. No weight was retrained or model equation changed in this packaging step.

- Regional source: `HomoSapiens-NASA-Challenge/hub`, commit `ae9c545625709f8f3397ff4cd2c325fea2e6725c`.
- Physical source: `HomoSapiens-NASA-Challenge/simulator`, commit `36ca379879f292fef773ce2e7f7d38688f11a548`.
- [NASA POWER](https://power.larc.nasa.gov/docs/services/api/temporal/daily/): regional daily meteorology/reanalysis and modeled soil wetness; snapshots are not field measurements.
- [NOAA CPC ONI](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt): revised historical ENSO context; the selected regime model does not use ONI.
- [INTA/Córdoba/IDECOR](https://www.argentina.gob.ar/node/501898): mapped available-water capacity. [IDECOR terms](https://www.idecor.gob.ar/terminos-y-condiciones/): CC BY-SA 4.0 with third-party source rights retained; preserve attribution and applicable share-alike terms for derived material.
- [FAO-56](https://www.fao.org/4/x0490e/x0490e00.htm) and the team's existing water kernel: reference ET and crop-water assumptions. INTA calendar references remain in each comparison's sources.
- Numerical/training libraries and versions are recorded in the environment lock and team submission register. GitHub CLI and uv are installation tools, not scientific models.
- Codex (OpenAI) prepared the artifact packaging, backend adapter, tests and handoff documentation. No frontend or additional model training was performed in this step.
