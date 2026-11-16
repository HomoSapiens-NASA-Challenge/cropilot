# Pergamino acquisition and diagnostic scripts

Offline scripts that acquire and process the Pergamino data behind the demonstration field: INTA crop maps, NASA POWER, NOAA ONI, MAGyP yields, SoilGrids, NASA HLS vegetation, OPERA surface water and Fields of The World boundaries. Raw data are not tracked in Git.

By default the scripts write to `data/pergamino/` in the parent workspace that holds this repository (the team's research repository, where the data guides and file catalog live). Every script accepts `--output-dir` for another location.

## Environment

Python 3.12, separate from the backend's Python 3.14. From the repository root:

```powershell
python -m venv apps/backend/data/pergamino/.venv
& apps/backend/data/pergamino/.venv/Scripts/python.exe -m pip install -r scripts/pergamino/requirements.txt
& apps/backend/data/pergamino/.venv/Scripts/python.exe scripts/pergamino/acquire.py
```

OPERA downloads need an Earthdata login; `opera_data.py` only reads local TIFFs.

## Scripts

| Script                      | Purpose                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `acquire.py`                | Run crop, context, satellite and boundary acquisition; keep successful components if another fails |
| `crop_history.py`           | Acquire 13 INTA crop-map clips, official legends and aligned sequences                             |
| `context_data.py`           | Acquire POWER, NOAA ONI, MAGyP and SoilGrids; normalize units and quality flags                    |
| `satellite_data.py`         | Acquire quality-masked HLS samples and the OPERA metadata catalog                                  |
| `field_candidates.py`       | Query the FTW Argentina source and freeze the geometry-ranked shortlist                            |
| `select_demo_field.py`      | Apply the recorded visual review (`field_review.json`) with a geometry-hash check                  |
| `field_preview.py`          | Render observed RGB with the modeled boundary outlines                                             |
| `field_diagnostics.py`      | Extract per-field crop histograms, keeping source codes and missing values                         |
| `field_vegetation.py`       | Extract NDVI and coverage for each frozen footprint                                                |
| `opera_plan.py`             | Prepare the monthly OPERA download plan from metadata                                              |
| `import_opera_downloads.py` | Copy only catalog-matched WTR/CONF files from Downloads, keeping the originals                     |
| `opera_data.py`             | Validate and process local WTR/CONF downloads                                                      |
| `bundle_manifest.py`        | Hash the bundle and optionally create a local ZIP                                                  |

## Tests

```powershell
& apps/backend/data/pergamino/.venv/Scripts/python.exe -m pytest scripts/pergamino -q
& apps/backend/data/pergamino/.venv/Scripts/python.exe -m ruff check --config apps/backend/pyproject.toml scripts/pergamino
```

The tests target numerical behavior that would mislead: crop-class changes between years, nodata versus a valid zero, masks, denominators, soil units and climate-index values not yet published at the decision date. Synthetic fixtures are used only in tests.

`bundle_manifest.py --tables-only` creates `pergamino-tables-and-field.zip`, which keeps the weather, soil, yield and ENSO tables, the field summaries and small crop clips; the full satellite rasters stay in the complete bundle.
