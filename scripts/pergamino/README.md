# Pergamino acquisition and diagnostic scripts

The shared dataset and its explanatory guides live in the **hub**, at
[../../../data/pergamino/README.md](../../../data/pergamino/README.md).
The scripts resolve that location by default, regardless of the working directory.
All accept `--output-dir` for a different data root. Raw data are not tracked in Git.

- [Field guide](../../../data/pergamino/FIELD_GUIDE.md): chosen footprint and actual findings.
- [File catalog and units](../../../data/pergamino/CATALOG.md).
- [Crop methods](../../../data/pergamino/docs/crops.md).
- [Weather, ENSO, yields and soil](../../../data/pergamino/docs/context.md).
- [HLS vegetation and OPERA water](../../../data/pergamino/docs/satellite.md).

## Environment

Tested with Python 3.12 ARM64 and native Windows ARM64 wheels. This offline
acquisition environment is separate from the backend application's Python 3.14
runtime. From the **Cropilot repository root**:

```powershell
python -m venv apps/backend/data/pergamino/.venv
& apps/backend/data/pergamino/.venv/Scripts/python.exe -m pip install -r scripts/pergamino/requirements.txt
& apps/backend/data/pergamino/.venv/Scripts/python.exe scripts/pergamino/acquire.py
```

Only the environment remains in the old backend data location. Acquired data
and derivatives go to `../data/pergamino/`, shared by Cropilot and the simulator.
The hub guide lists the additional offline field-extraction and inventory commands.
OPERA downloads require the owner's authorized Earthdata login; the processor
reads local TIFFs and never reads browser credentials.

## Scripts

| Script                      | Purpose                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `acquire.py`                | Run crop, context, satellite and boundary acquisition; preserve successful independent components if another fails |
| `crop_history.py`           | Acquire 13 INTA crop-map clips, official legends and aligned sequences                                             |
| `context_data.py`           | Acquire POWER, NOAA ONI, MAGyP and SoilGrids; normalize units and quality flags                                    |
| `satellite_data.py`         | Acquire quality-masked HLS samples and the OPERA metadata catalog                                                  |
| `field_candidates.py`       | Query the FTW Argentina source and freeze the geometry-ranked shortlist                                            |
| `select_demo_field.py`      | Apply the recorded visual review with a geometry-hash check                                                        |
| `field_preview.py`          | Render observed RGB and modeled boundary outlines                                                                  |
| `field_diagnostics.py`      | Extract per-field crop histograms, preserving source codes and missingness                                         |
| `field_vegetation.py`       | Extract NDVI and coverage for each frozen footprint                                                                |
| `opera_plan.py`             | Prepare the monthly metadata-based OPERA download plan                                                             |
| `import_opera_downloads.py` | Copy only catalog-matched WTR/CONF files from Downloads, preserving originals                                      |
| `opera_data.py`             | Validate and process authorized local WTR/CONF downloads                                                           |
| `bundle_manifest.py`        | Hash the bundle, include explanatory guides and optionally create a local ZIP                                      |

`field_review.json` records the selected candidate and rationale.
`repository_audit.json` retains the branch tips inspected and the user's final
shared-data placement decision. Nothing here changes an application API, replaces
dashboard mock values, trains a model or produces a farmer recommendation.

## Verification

```powershell
& apps/backend/data/pergamino/.venv/Scripts/python.exe -m pytest scripts/pergamino -q
& apps/backend/data/pergamino/.venv/Scripts/python.exe -m ruff check --config apps/backend/pyproject.toml scripts/pergamino
& apps/backend/data/pergamino/.venv/Scripts/python.exe scripts/pergamino/bundle_manifest.py
```

After generating the full inventory, `bundle_manifest.py --tables-only` creates
`pergamino-tables-and-field.zip` with a separate manifest and explicit exclusions.
It retains weather/soil/yield/ENSO tables, field summaries and small crop clips;
the complete satellite rasters and raw provider archive remain in the full ZIP.

Tests target misleading numerical behavior: crop-class changes between years,
nodata versus valid zero, masks, denominators, soil units and unavailable future
climate-index information. Synthetic fixtures are only for tests.

## AI use

OpenAI Codex assisted with acquisition code, source verification, boundary review,
quality checks and documentation. The bundle contains real source observations,
clearly identified model estimates and documented arithmetic transformations.
No synthetic measurements or satellite pixels replace missing source data.
