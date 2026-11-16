# Water models

The backend ships three frozen water releases. Weights and data are GitHub release assets, checked against manifests committed in `apps/backend/app/modules/water/resources/`.

| Release                | What it contains                                                                                      | Doc                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `models-water-v1`      | Regional seasonal water and heat models, and a daily physical water balance for rotations             | This page                                  |
| `models-moisture-v1`   | Regional root-zone soil wetness 7 and 14 days ahead                                                   | [moisture-models.md](moisture-models.md)   |
| `models-strategies-v1` | 1,170 precomputed Pergamino water scenarios: rotations, crop stages, soil and sowing-date sensitivity | [water-strategies.md](water-strategies.md) |

The scientific models run in their own pinned environment (Python 3.12.7, `apps/backend/.venv-models`), separate from the API (Python 3.14). No model library is imported into the API process.

## Install

Requires `uv` and the GitHub CLI with read access to this repository. From the repository root:

```sh
uv sync --frozen --directory apps/backend
uv run --directory apps/backend python -m app.modules.water.cli setup
```

`setup` downloads [models-water-v1](https://github.com/HomoSapiens-NASA-Challenge/cropilot/releases/tag/models-water-v1), checks the archive and every file against `release.json`, and installs the training environment. Use `setup --archive /absolute/path/cropilot-water-models-v1.tar.gz` for a downloaded archive. No database, Docker or `.env` is needed.

| Location in `apps/backend`             | Contents                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| `models/water-v1/enso-water-v1.joblib` | Fitted estimators                                             |
| `models/water-v1/runtime/`             | Pinned model source and its tests                             |
| `data/water-v1/regional/`              | Regional panel, NASA POWER snapshots, NOAA ONI and audit      |
| `data/water-v1/water_cache/`           | NASA POWER and INTA/IDECOR responses with provenance sidecars |
| `data/water-runs/comparison-*/`        | Output of each physical-model run                             |
| `.venv-models/`                        | Python 3.12.7 and the pinned package environment              |

`WATER_MODELS_DIR`, `WATER_DATA_DIR` and `WATER_ENVIRONMENT` override these paths (see `.env.example`). They must be absolute and must not overlap.

## Run

```sh
uv run --directory apps/backend python -m app.modules.water.cli verify     # check files and environment
uv run --directory apps/backend python -m app.modules.water.cli regional   # regional inference
uv run --directory apps/backend python -m app.modules.water.cli water      # 3 rotations × 4 episodes × 3 initial-water levels
```

`regional --request /absolute/path/request.json` takes the contract in [request.example.json](../apps/backend/app/modules/water/resources/request.example.json); the expected output is [response.example.json](../apps/backend/app/modules/water/resources/response.example.json). Features must come from the original regional pipeline; a field polygon alone is not a valid request.

`water --config /absolute/path/config.json` takes a modified [example configuration](../apps/backend/app/modules/water/resources/water-config.example.json): other supported crop sequences, initial water or historical episodes. This release only has weather and soil for an illustrative Río Cuarto point (-64.3, -33.2). Each run writes a new directory with a `comparison.json` manifest and daily series.

## Results

| Component                                 | Method                                     | Held-out result                                                                             | Use                                                    |
| ----------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Regional dry/intermediate/wet regime      | Logistic regression without ONI            | Multiclass Brier **0.6911**, climatology **0.6939**; accuracy **39.17%**, equal to baseline | Experimental regional context, shown with its baseline |
| Regional precipitation minus reference ET | Histogram gradient boosting                | MAE **80.31 mm**, baseline **89.92 mm**                                                     | Research climate-balance indicator                     |
| Regional hot-day count                    | Histogram gradient boosting                | MAE **6.08 days**, baseline **6.56 days**                                                   | Research heat indicator                                |
| Crop-water scenario model                 | Daily physical water balance (not trained) | No field validation available                                                               | Compare reserves, crop deficits and sensitivity        |

Evaluation used ten Argentine regional points and 41 campaigns (1984/85-2024/25): 23 for training, 6 for validation and 12 for test, with targets over December 10 - January 20. The release holds nine learned candidates and six statistical baselines; the wrapper returns the three selected on validation. Their point estimates improve on the baselines, but every bootstrap confidence interval of the improvement includes zero. These are research results on revised historical inputs, not operational forecasts. [Full metrics](../apps/backend/app/modules/water/resources/metrics.json).

The physical example compares soybean; maize/soybean; and wheat + second soybean/maize over three-campaign episodes. Soil capacity is mapped (84 mm for an assumed 1 m profile), not measured; initial storage at 25, 50 and 75% is an assumption. Neither model predicts yield, profit, nitrates, carbon or flooding, and lower water use alone does not make a rotation better.

## Call from the backend

```python
from app.modules.water.service import compare_water_scenarios, predict_regional

regional = predict_regional(request)  # request matches request.example.json
comparison = compare_water_scenarios()
```

Both functions verify the installed release and run in the separate environment. They are synchronous and CPU-bound: call them from a `def` handler, a worker or `run_in_threadpool`, never inside `async def`. They raise `ArtifactError` or `ValueError`.

## Tests

```sh
uv run --directory apps/backend pytest -q
```

Without the installed release, the three integration tests that run real inference are skipped. `verify` rejects altered code, weights or data and unexpected files before any inference. If verification fails, move the affected installation directory aside and rerun `setup`.

## Provenance

[release.json](../apps/backend/app/modules/water/resources/release.json) pins the archive, every file and the source commits; [sources.json](../apps/backend/app/modules/water/resources/sources.json) and the response sidecars keep dataset provenance; [requirements-lock.txt](../apps/backend/app/modules/water/resources/requirements-lock.txt) pins the environment.

- Regional models: `HomoSapiens-NASA-Challenge/hub`, commit `ae9c545625709f8f3397ff4cd2c325fea2e6725c`.
- Physical model: `HomoSapiens-NASA-Challenge/simulator`, commit `36ca379879f292fef773ce2e7f7d38688f11a548`.
- [NASA POWER](https://power.larc.nasa.gov/docs/services/api/temporal/daily/): daily meteorology and modeled soil wetness; snapshots, not field measurements.
- [NOAA CPC ONI](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt): revised historical ENSO index; the selected regime model does not use it.
- [INTA/Córdoba/IDECOR](https://www.argentina.gob.ar/node/501898): mapped available-water capacity, [CC BY-SA 4.0](https://www.idecor.gob.ar/terminos-y-condiciones/); keep attribution and share-alike terms for derived material.
- [FAO-56](https://www.fao.org/4/x0490e/x0490e00.htm): reference ET and crop-water method.
