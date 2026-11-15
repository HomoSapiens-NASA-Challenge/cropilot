# Demo case builder

Builds the public `case-v1` demonstration case that `GET /api/cases` serves: `index.json` plus one
bundle per zone, written to `apps/backend/app/modules/cases/resources/`. Nothing is computed at
request time. Every output is built as a `CaseBundle` / `CaseIndex` object (the contract in
`apps/backend/app/modules/cases/schemas.py`) and serialized from it, then validated again from the
written text, so an invalid file is never written. The output is deterministic: the same inputs give
the same bytes (`generated_utc` is the latest `generated_utc` of the market runs, or
`--generated-utc`).

| Output                | Size             | Content                                                                                                                                                 |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.json`          | 5.5 KB           | One card per zone: soil wetness at the end of August 2026 and its percentile, analog campaigns, module flags; ONI Jul-Sep 2026 and the highest past one |
| `pergamino.json`      | 1.9 MB           | Years like this, five strategies, 1,170 water episodes, 381 fields of the crop map and the reference footprint                                          |
| `parana.json`         | 1.8 MB           | Years like this, five strategies and 496 fields of the crop map; `water` is `null` and flagged `not_available`                                          |
| the other eight zones | about 59 KB each | Years like this and the strategy comparison; `water` and `field` are `null` and flagged `not_available`                                                 |

## Rebuild

Three steps, from a hub checkout that has the raw inputs (see below) in `$FS_DATA_DIR`, and with the
crop map installed (see [docs/crop-map.md](../../docs/crop-map.md)):

```bash
gh release download crop-map-v1 --repo HomoSapiens-NASA-Challenge/cropilot \
  --pattern 'lots_*_en.geojson' --dir apps/backend/data/crops
```

1. Market runs, in the hub branch `feat/market-demo-export` (`research/ml-market-model`, Python 3.12
   with numpy, pandas, scikit-learn and pytest). The branch is the team's market model plus two
   additions: the rotation `maiz-soja-soja` and the `campaigns` export.

   ```bash
   cd research/ml-market-model
   export FS_DATA_DIR=/path/to/hub/data
   for zone in Pergamino MarcosJuarez Parana TrenqueLauquen RioCuarto Balcarce Anguil Charata Quimili LasLajitas; do
     python -m market.run --zone $zone --out $FS_DATA_DIR/market_runs/${zone}_2026.json
   done
   ```

2. The builder, with the backend environment (standard library and pydantic only). `PYTHONPATH=.` is
   needed because the backend is not an installed package.

   ```bash
   cd cropilot/apps/backend
   PYTHONPATH=. uv run python ../../scripts/demo_case/build.py \
     --hub-data /path/to/hub/data --out app/modules/cases/resources
   ```

   To rebuild only the field blocks from a new crop map, without the hub data, use
   `--refresh-field` instead of `--hub-data`. It reads the committed bundles, replaces their field
   block (and what follows it: the module flag, the crop-map limit, the field-yield reason and the
   source list) and rewrites the index; everything else stays byte for byte.

   ```bash
   PYTHONPATH=. uv run python ../../scripts/demo_case/build.py --refresh-field --out app/modules/cases/resources
   ```

3. The checks. Restart the backend afterwards: the service caches each bundle it has read.

   ```bash
   cd cropilot/apps/backend
   uv run pytest -c pyproject.toml ../../scripts/demo_case/test_build.py
   uv run pytest tests/test_cases.py
   uv run ruff check --config pyproject.toml ../../scripts/demo_case tests/test_cases.py
   ```

Versions used on 2026-11-15: market environment Python 3.12.16 with numpy 2.5.4, pandas 3.1.1,
scikit-learn 1.9.1, pytest 9.2.0 and, for the download and parse scripts only, requests 2.34.2,
openpyxl 3.1.5 and pymupdf 2.1; builder Python 3.14.10 with pydantic 2.14.3 (backend lockfile).

## Inputs

All paths are under `--hub-data` (the git-ignored hub data directory) unless stated otherwise.
Downloads of 2026-11-15 unless a date is given.

| Input                                                                                       | Where it comes from                                                                                                                                                                                                                                                           | Hash or version                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Market runs `market_runs/<Zone>_2026.json` (`dashboard-draft-1`)                            | Hub `research/ml-market-model`, base commit `ca784c5` of `toto` plus the changes of `feat/market-demo-export`                                                                                                                                                                 | `generated_utc` 2026-11-15T05:18-05:19Z; the model reproduces the published README numbers (Pergamino 1997/98: 797, 833, 728, 777 USD/ha) |
| NOAA ONI `raw/oni.txt`                                                                      | <https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt>, DJF 1950 to ASO 2026 (revised values)                                                                                                                                                                             | sha256 `118c56333133...`, identical to the copy in the Pergamino package of 2026-11-14                                                    |
| MAGyP estimates `raw/magyp.csv`                                                             | `estimaciones-agricolas-2026-03.csv` (last modified 2026-03-05), copied from `pergamino/context/raw/`                                                                                                                                                                         | sha256 `7a47a6d35625...`                                                                                                                  |
| NASA POWER `power_full/power_<zone>.json` (19 points)                                       | `fetch_market_data.py power`, community AG, 1981-01-01 to 2026-11-15 (values valid to 2026-11-11)                                                                                                                                                                             | sha256 of the sorted per-file sha256 list `4f9832881de5...`                                                                               |
| MAGyP margin reports `magyp_margenes/`                                                      | 26 "Margenes Resultados" PDFs, May 2020 to September 2026 (manifest with URLs and hashes in the same directory), parsed by `parse_magyp_margenes.py` into `margenes_regiones.csv`                                                                                             | CSV sha256 `b0a6c31deaed...`; sha256 of the sorted PDF hash list `695e3b37dd60...`; 24 reports parse, June and September 2021 are images  |
| A3 futures `a3_futuros/a3_{SOJ,MAI,TRI}_2019_2026.csv`                                      | A3 CEM API `closing-prices` CSV, last settlement 2026-11-13                                                                                                                                                                                                                   | sha256 `82120e0e729a...` (soybean), `48387e28376b...` (maize), `6ca54068e8e0...` (wheat)                                                  |
| A3 history 2005-2019                                                                        | CEM workbook "FUTUROS Y OPCIONES 2005-2019", parsed by `parse_matba_2005_2019.py` (new)                                                                                                                                                                                       | xlsx sha256 `c7358edf8782...`, CSV `831614a218c9...`                                                                                      |
| A3 history 1994-2003                                                                        | CEM workbook "PRECIOS AJUSTE 1994-2003", parsed by `parse_matba_1994_2003.py`                                                                                                                                                                                                 | xlsx sha256 `7a9699c4c55d...`                                                                                                             |
| Price ratios                                                                                | `futures_ratio.py` over the two CSVs and the API                                                                                                                                                                                                                              | `futures_ratios.csv` `5248f5e4eee0...`, `futures_ratios_1994_2003.csv` `6029a5f13219...`                                                  |
| Pergamino package `pergamino/`                                                              | Hub release `pergamino-diagnostics-2026-11-14` (`pergamino-tables-and-field.zip` sha256 `c9cb64544951...`); files used: `fields/demo_field.geojson` `9b0ef16ca43a...`, `fields/crop_diagnostics.csv` `6f76d743dab1...`, `fields/vegetation_diagnostics.csv` `f49e45fbca68...` | `bundle_manifest.json` of the package                                                                                                     |
| Water scenarios                                                                             | Cropilot release `models-strategies-v1`, asset `cropilot-strategies-v1.tar.gz` sha256 `3bac8f4ea3cf...`, installed under `apps/backend/data/strategies-v1` and checksum-verified on every read                                                                                | 1,170 runs, 39 start years 1984-2022                                                                                                      |
| Crop map by field `apps/backend/data/crops/lots_<zone>_en.geojson` (not under `--hub-data`) | Cropilot release `crop-map-v1`, built by hub `research/crop-map/` (NASA HLS + INTA, Fields of The World outlines); validated against `app/modules/crops/schemas.py` on read                                                                                                   | `SHA256SUMS` of the release                                                                                                               |
| Regions                                                                                     | `app/modules/regions/catalog.py` (names, provinces, coordinates, MAGyP departments)                                                                                                                                                                                           | repo                                                                                                                                      |
| Agronomist interview                                                                        | Hub `research/entrevista-agronomo.md` on `toto` (Ing. Agr. MBA Fernando Spelanzon, 2026-11-14, named with his authorization)                                                                                                                                                  | n/a                                                                                                                                       |
| Team notes cited                                                                            | Hub `toto`: `research/ml-market.md` section 9, `research/rl/rotation-mdp/RESULTS.md`, `research/rl.md`, `research/enfoque-anios-como-este.md`                                                                                                                                 | commit `ca784c5`                                                                                                                          |

Raw A3 prices are never written to a bundle: only margins derived from them, the contract months and the
settlement date. Each bundle lists only the `SourceRef`s it cites: 23 in Pergamino, 19 in Paraná, 15 in the other zones, 3 in the index.

## How the inputs map to the contract

- **Candidate campaigns.** All 44 campaigns 1981/82 to 2024/25. No campaign at or after 2026 is a
  candidate (the market code refuses it and `test_cases.py` checks it). The phase of each campaign is
  the ONI Jul-Sep phase (strong El Niño at 1.5 or more, El Niño at 0.5 or more, La Niña at -0.5 or
  less); the summer or hindsight phase never reaches a bundle.
- **Campaign points.** `analog_distance` is filled for every campaign usable as an analog (the distance
  to the 2026 state); `analog_rank` only for the seven analogs.
- **Yield anomalies.** Department yield against its linear trend, in percent. `observed` is MAGyP;
  `modeled` is the NASA POWER climate model where MAGyP has no value (Anguil and Quimilí: 11 of 88
  values each; Balcarce 2; Charata 1; Trenque Lauquen 1; the other five zones none).
- **Strategies.** The five bundle strategies map to market rotations and water strategies as in the
  contract table. The market model also ranks the two-year `trigo/soja2-maiz`; it is not a bundle
  strategy, so the leader of each analog campaign is recomputed among the five (the build stops if the
  market leader is a bundle strategy and disagrees).
- **Previous-crop effect.** `maiz-soja-soja` is computed with the cited effect on the first soybean
  only (the one that follows maize). The existing rotations are unchanged: the hub tests prove it.
- **Water.** Every one of the 1,170 runs is an episode. `deficit_vs_current_mm` is the run's unmet crop
  water minus that of the current rotation under the same start year, soil depth, initial water and
  calendar (negative means less unmet water). The build checks that sign against every run. Episodes
  of an analog start year carry `scenario_id` and per-crop detail (mid-season stress days and
  coincident stress-heat days); 1997/98, 1987/88, 2015/16, 2004/05 and 1991/92 have episodes, 2023/24
  and 1982/83 do not (the release covers start years 1984-2022).
- **Unharvested area.** MAGyP planted against harvested area of the zone's department, soybean as
  "soja total", grouped by the ONI Jul-Sep phase. Campaigns with no planted area are skipped; zero
  harvest is a 100% loss; harvested above planted stops the build. A campaign is named only when the
  loss is above zero.
- **Field block (Pergamino and Paraná).** Every field of the zone's crop map is a lot: the 18 made-up
  "La Celina" lots first (`is_demo_farm`), then the rest of the zone, all with a crop, status and NDVI
  curve. The history holds the INTA campaigns 2020/21 to 2024/25; the latest campaign, 2025/26, is the
  model's (the build stops otherwise). The case's `status_reason` is written only from the numeric
  fields (gap against the zone, evenness, purity, the file's lag of the NDVI peak against the zone),
  never copied from the file. The crop-map limit carries each zone's agreement with INTA.
  The reference footprint 268949 exists only in Pergamino and comes from the Pergamino package, whose
  mapped sequence is checked (maize 2021/22, soybean 2022/23, soybean 2023/24) before the
  current-rotation sentence is written.
- **Sentences.** Computed from the data or from a cited source (`text.py`). A strategy's evidence,
  benefits, missing inputs and local review follow the five answers of the challenge; the benefit
  about water is shown only when the strategy has less unmet water than the current rotation in more
  episodes than it has more.

## Missing or degraded

- **Crop map only in Pergamino and Paraná.** The other eight zones have no field module
  (`modules.field = not_available`). Paraná has no reference footprint, so its rotation comparison
  keeps the assumed current rotation.
- **Water only in Pergamino.** The other nine zones have no water scenario; their strategies carry
  `water_strategy_id = null` and `water_match = none`.
- **Margins** use today's A3 harvest futures and today's MAGyP costs for every past campaign, one
  campaign at a time. The cover-crop cost is a cited scenario (60, 80 used, 86 USD/ha, nominal USD of
  2012 and 2021).
- **Not computed** (listed in every bundle with a reason): waterlogging and flooding, soil carbon,
  nitrogen and nitrate, pest and disease cycles, field-level yield.
- **Limits** carried in every bundle: analog years are not a forecast (backtest: -0.7% against
  climatology), no better rotation policy was found by RL, 2026/27 is outside the historical ONI range,
  ONI Jul-Sep is not strictly known on 31 August and the file holds revised values, POWER describes a
  cell of about 55 km, margins are scenarios, wheat does not respond to the signals, management has
  changed since the old campaigns; plus the water limits in Pergamino and the crop-map limits in Pergamino and Paraná.
- The CORE document behind the second previous-crop figure is cited as found; its attribution to INTA
  Pergamino is only partly verified, as in the market research notes.
