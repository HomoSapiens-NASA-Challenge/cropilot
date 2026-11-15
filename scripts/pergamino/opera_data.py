"""Process owner-authorized local OPERA DSWx-HLS downloads without credentials.

WTR is categorical water evidence. A partial-water pixel is not a measurement of
its actual water-covered area, and cloud/fill must never become non-water.
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

import numpy as np
import numpy.typing as npt
import rasterio
from rasterio.features import geometry_mask
from rasterio.warp import Resampling, reproject, transform_geom
from satellite_data import (
    Grid,
    make_grid,
    month_range,
    sha256,
    utc_now,
    write_csv,
    write_json,
    write_raster,
)

DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "data/pergamino"
SPEC_URL = (
    "https://archive.podaac.earthdata.nasa.gov/podaac-ops-cumulus-docs/web-misc/opera/"
    "OPERA_DSWx-HLS_ProductSpec_v1.0.0_D-107395_RevB.pdf"
)
WATER_CLASSES = {
    0: "not_water",
    1: "open_water",
    2: "partial_surface_water",
    252: "snow_ice",
    253: "cloud_shadow_adjacency",
    254: "ocean_masked",
    255: "fill",
}
CLEAR_CONFIDENCE = {
    0: "not_water",
    1: "open_water_high_confidence",
    2: "open_water_moderate_confidence",
    3: "partial_surface_water_conservative",
    4: "partial_surface_water_aggressive",
}
CONFIDENCE_CLASSES = {
    **CLEAR_CONFIDENCE,
    **{value + 10: "cloud_masked_" + name for value, name in CLEAR_CONFIDENCE.items()},
    **{value + 20: "snow_ice_masked_" + name for value, name in CLEAR_CONFIDENCE.items()},
    254: "ocean_masked",
    255: "fill",
}
LOGGER = logging.getLogger("pergamino.opera")


def water_validity(
    water: npt.NDArray, confidence: npt.NDArray | None
) -> tuple[npt.NDArray[np.bool_], npt.NDArray[np.bool_]]:
    unexpected = set(np.unique(water).tolist()) - WATER_CLASSES.keys()
    if unexpected:
        raise ValueError(f"Unknown WTR classes: {sorted(unexpected)}")
    valid = np.isin(water, [0, 1, 2])
    inconsistent = np.zeros(water.shape, dtype=bool)
    if confidence is not None:
        if confidence.shape != water.shape:
            raise ValueError("WTR and CONF must have the same shape")
        unexpected = set(np.unique(confidence).tolist()) - CONFIDENCE_CLASSES.keys()
        if unexpected:
            raise ValueError(f"Unknown CONF classes: {sorted(unexpected)}")
        clear_confidence = confidence <= 4
        matching = (
            ((water == 0) & (confidence == 0))
            | ((water == 1) & np.isin(confidence, [1, 2]))
            | ((water == 2) & np.isin(confidence, [3, 4]))
        )
        inconsistent = valid & clear_confidence & ~matching
        valid &= clear_confidence & matching
    return valid, inconsistent


def summarize_water(
    water: npt.NDArray, confidence: npt.NDArray | None, inside: npt.NDArray
) -> dict:
    if inside.shape != water.shape:
        raise ValueError("Field mask and WTR must have the same shape")
    valid, inconsistent = water_validity(water, confidence)
    usable = inside & valid
    total, count = int(inside.sum()), int(usable.sum())
    open_count = int((usable & (water == 1)).sum())
    partial_count = int((usable & (water == 2)).sum())
    water_count = open_count + partial_count
    result = {
        "water_metric_provenance": "observed" if count else "missing",
        "total_pixel_count": total,
        "valid_pixel_count": count,
        "valid_fraction": count / total if total else None,
        "not_water_pixel_count": int((usable & (water == 0)).sum()),
        "open_water_pixel_count": open_count,
        "partial_water_pixel_count": partial_count,
        "water_class_pixel_count": water_count,
        "water_class_fraction_of_valid": water_count / count if count else None,
        "open_water_fraction_of_valid": open_count / count if count else None,
        "partial_water_fraction_of_valid": partial_count / count if count else None,
        "water_class_footprint_ha": water_count * 0.09 if count else None,
        "open_water_class_footprint_ha": open_count * 0.09 if count else None,
        "partial_water_class_footprint_ha": partial_count * 0.09 if count else None,
        "snow_ice_pixel_count": int((inside & (water == 252)).sum()),
        "cloud_shadow_adjacency_pixel_count": int((inside & (water == 253)).sum()),
        "ocean_masked_pixel_count": int((inside & (water == 254)).sum()),
        "fill_pixel_count": int((inside & (water == 255)).sum()),
        "confidence_available": confidence is not None,
        "inconsistent_clear_confidence_pixel_count": int((inside & inconsistent).sum()),
    }
    for value, name in [
        (1, "open_high_confidence"),
        (2, "open_moderate_confidence"),
        (3, "partial_conservative"),
        (4, "partial_aggressive"),
    ]:
        result[f"{name}_pixel_count"] = (
            int((usable & (confidence == value)).sum()) if confidence is not None else None
        )
    return result


def read_local_band(path: Path, grid: Grid) -> tuple[npt.NDArray, dict]:
    result = np.full((grid.height, grid.width), 255, dtype=np.uint8)
    with rasterio.open(path) as source:
        if source.count != 1 or source.dtypes[0] != "uint8":
            raise ValueError(f"Expected a single UInt8 OPERA classification band: {path.name}")
        if source.nodata != 255:
            raise ValueError(f"Unexpected OPERA nodata value in {path.name}: {source.nodata}")
        reproject(
            rasterio.band(source, 1),
            result,
            src_transform=source.transform,
            src_crs=source.crs,
            src_nodata=255,
            dst_transform=grid.transform,
            dst_crs=grid.crs,
            dst_nodata=255,
            resampling=Resampling.nearest,
        )
        metadata = {
            "verified_local_utc": utc_now(),
            "filename": path.name,
            "sha256": sha256(path),
            "bytes": path.stat().st_size,
            "source_crs": str(source.crs),
            "source_transform": list(source.transform),
            "source_shape": list(source.shape),
            "source_tags": source.tags(),
        }
    result[~grid.aoi_mask] = 255
    return result, metadata


def observation_status(stats: dict) -> str:
    if not stats["valid_pixel_count"]:
        return "all_masked_or_fill"
    return "partial_coverage" if stats["valid_fraction"] < 0.8 else "observed"


def process_observation(row: dict, folder: Path, grid: Grid, fields: list[dict]) -> dict | None:
    raw = folder / "raw"
    water_path = raw / Path(urlsplit(row["water_url"]).path).name
    if not water_path.exists():
        return None
    water, water_metadata = read_local_band(water_path, grid)
    confidence_path = raw / Path(urlsplit(row["confidence_url"]).path).name
    confidence, confidence_metadata = (None, None)
    if confidence_path.exists():
        confidence, confidence_metadata = read_local_band(confidence_path, grid)
    valid, _ = water_validity(water, confidence)
    target = folder / "processed" / "scenes" / row["scene_id"]
    write_raster(target / "wtr.tif", water, grid, 255, ["OPERA_WTR"])
    if confidence is not None:
        write_raster(target / "conf.tif", confidence, grid, 255, ["OPERA_CONF"])
    valid_layer = valid.astype(np.uint8)
    valid_layer[~grid.aoi_mask] = 255
    write_raster(
        target / "valid_mask.tif", valid_layer, grid, 255, ["valid_1_invalid_0_outside_255"]
    )
    region = summarize_water(water, confidence, grid.aoi_mask)
    field_records = []
    for field in fields:
        geometry = transform_geom("EPSG:4326", grid.crs, field["geometry"])
        inside = geometry_mask([geometry], (grid.height, grid.width), grid.transform, invert=True)
        stats = summarize_water(water, confidence, inside & grid.aoi_mask)
        field_records.append(
            {"field_id": str(field["id"]), "status": observation_status(stats), **stats}
        )
    metadata = {
        "scene_id": row["scene_id"],
        "granule_id": row.get("granule_id"),
        "month": row["acquired_utc"][:7],
        "acquired_utc": row["acquired_utc"],
        "processed_utc": utc_now(),
        "provenance": "observed",
        "canonical_water_url": row["water_url"],
        "canonical_confidence_url": row["confidence_url"],
        "raw_water": water_metadata,
        "raw_confidence": confidence_metadata,
        "region": {"status": observation_status(region), **region},
        "fields": field_records,
        "output_files": [
            {
                "path": path.relative_to(folder).as_posix(),
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
            for path in sorted(target.glob("*.tif"))
        ],
    }
    write_json(target / "scene.json", metadata)
    return metadata


def process(output_dir: Path, field_geojson: Path, primary_field_id: str) -> dict:
    satellite = output_dir / "satellite"
    folder = satellite / "opera"
    with (folder / "granules.csv").open(encoding="utf-8", newline="") as handle:
        catalog = list(csv.DictReader(handle))
    plan_path = folder / "download_plan.json"
    plan = json.loads(plan_path.read_text(encoding="utf-8")) if plan_path.exists() else {}
    fields = json.loads(field_geojson.read_text(encoding="utf-8"))["features"]
    if primary_field_id not in {str(field["id"]) for field in fields}:
        raise ValueError("The primary field must be present in the frozen field shortlist")
    grid = make_grid()
    records = []
    for row in catalog:
        record = process_observation(row, folder, grid, fields)
        if record is not None:
            records.append(record)
            LOGGER.info("%s valid=%s", record["month"], record["region"]["valid_fraction"])
    if not records:
        raise RuntimeError("No catalog-matched WTR files found in satellite/opera/raw")
    month_groups: dict[str, list[dict]] = {}
    for record in records:
        month_groups.setdefault(record["month"], []).append(record)
    end = date.fromisoformat(max(row["acquired_utc"][:10] for row in catalog))
    planned_months = {selection["month"] for selection in plan.get("selections", [])}
    requested_months = (
        sorted(planned_months | month_groups.keys())
        if planned_months
        else month_range(date(2016, 1, 1), end)
    )
    region_rows, field_rows = [], []
    selected_records = []
    for month in requested_months:
        observations = month_groups.get(month, [])
        if not observations:
            missing = {
                "month": month,
                "status": "not_downloaded",
                "provenance": "missing",
                "scene_id": None,
                "acquired_utc": None,
                "valid_pixel_count": None,
                "valid_fraction": None,
                "water_class_fraction_of_valid": None,
                "water_class_footprint_ha": None,
            }
            region_rows.append(missing)
            field_rows.extend({**missing, "field_id": str(field["id"])} for field in fields)
            continue
        selected = max(
            observations,
            key=lambda record: (
                next(
                    field["valid_fraction"] or 0
                    for field in record["fields"]
                    if field["field_id"] == primary_field_id
                ),
                record["region"]["valid_fraction"] or 0,
                record["raw_confidence"] is not None,
                -abs(int(record["acquired_utc"][8:10]) - 15),
                record["scene_id"],
            ),
        )
        selected_records.append(selected)
        base = {
            "month": month,
            "scene_id": selected["scene_id"],
            "acquired_utc": selected["acquired_utc"],
            "provenance": "observed",
            "downloaded_scene_count": len(observations),
        }
        region_rows.append({**base, **selected["region"]})
        field_rows.extend({**base, **field} for field in selected["fields"])
    processed = folder / "processed"
    write_json(processed / "observations.json", records)
    for name, rows in [
        ("region_monthly_summary", region_rows),
        ("field_monthly_summary", field_rows),
    ]:
        write_json(processed / f"{name}.json", rows)
        write_csv(processed / f"{name}.csv", rows)
    usable_region_months = sum(
        bool(record["region"]["valid_pixel_count"]) for record in selected_records
    )
    manifest = {
        "schema_version": "pergamino-opera-authenticated-v1",
        "generated_utc": utc_now(),
        "status": "available"
        if len(selected_records) == len(region_rows)
        else "partially_downloaded",
        "provenance": "observed",
        "pixel_provenance": "observed" if usable_region_months else "missing",
        "raw_files_provenance": "retrieved",
        "authentication_route": (
            "Files downloaded by the owner-authorized Chrome Earthdata session; "
            "this processor reads no credentials."
        ),
        "catalog_granule_count": len(catalog),
        "catalog_period": [
            min(row["acquired_utc"] for row in catalog),
            max(row["acquired_utc"] for row in catalog),
        ],
        "catalog_month_count": len({row["acquired_utc"][:7] for row in catalog}),
        "planned_month_count": len(planned_months),
        "downloaded_water_scenes": len(records),
        "downloaded_confidence_scenes": sum(
            record["raw_confidence"] is not None for record in records
        ),
        "months_with_rasters": len(selected_records),
        "months_with_valid_region_pixels": usable_region_months,
        "months_with_valid_primary_field_pixels": sum(
            row["field_id"] == primary_field_id and bool(row.get("valid_pixel_count"))
            for row in field_rows
        ),
        "requested_month_count": len(region_rows),
        "months_not_downloaded": [
            row["month"] for row in region_rows if row["status"] == "not_downloaded"
        ],
        "months_without_valid_primary_field_pixels": [
            row["month"]
            for row in field_rows
            if row["field_id"] == primary_field_id and not row.get("valid_pixel_count")
        ],
        "primary_field_id": primary_field_id,
        "field_ids": [str(field["id"]) for field in fields],
        "boundary_sha256": sha256(field_geojson),
        "boundary_status": (
            "Satellite-estimated demonstration footprints; no farmer or cadastral validation"
        ),
        "selection": (
            "From locally downloaded candidates: highest valid-pixel coverage of the frozen "
            "primary field, then region coverage, confidence availability, proximity to day 15 "
            "and scene ID. Water outcomes never enter selection. "
            "One scene per month, not a monthly composite."
        ),
        "download_plan_sha256": sha256(plan_path) if plan else None,
        "grid": {
            "crs": grid.crs,
            "transform": list(grid.transform),
            "resolution_m": 30,
            "width": grid.width,
            "height": grid.height,
        },
        "wtr_classes": WATER_CLASSES,
        "confidence_classes": CONFIDENCE_CLASSES,
        "quality_policy": (
            "Only WTR 0/1/2 are valid. If CONF exists, require clear CONF 0..4 and consistent "
            "collapsed WTR class. Never interpret masked/fill as non-water. "
            "Unknown classes fail explicitly."
        ),
        "source_specification": {
            "url": SPEC_URL,
            "version": "1.0.1 Rev B, July 10 2024",
            "tables": "Table 4-1, printed pages 10 and 12 (PDF pages 16 and 18)",
        },
        "doi": "https://doi.org/10.5067/OPDSW-PL3V1",
        "limitations": [
            (
                "Water-class footprint counts full 30 m pixels classified open or partial "
                "water; it is not exact water-covered area."
            ),
            "CONF is categorical, not a numerical probability; no mean confidence is computed.",
            (
                "All-masked observations remain missing. Zero observed water does not exclude "
                "saturated soil or water below a dense canopy."
            ),
            (
                "One sampled scene per month can miss short events; this is not flood "
                "frequency, duration, or an agronomic risk probability."
            ),
            (
                "Surface-water observations cannot establish waterlogging damage "
                "or the cause of crop/yield loss."
            ),
            (
                "Coverage below 80% is flagged for review; this is an operational display "
                "threshold, not local agronomic validation."
            ),
            (
                "NASA describes validated observations from April 2023; earlier backfilled "
                "observations require additional validation."
            ),
        ],
        "historical_public_access_probe": "access_status.json",
        "files": [
            {
                "path": path.relative_to(folder).as_posix(),
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
            for path in sorted(processed.rglob("*"))
            if path.is_file()
        ],
    }
    write_json(folder / "authenticated_manifest.json", manifest)
    master_path = satellite / "manifest.json"
    if master_path.exists():
        master = json.loads(master_path.read_text(encoding="utf-8"))
        master["opera"] = {
            "status": manifest["status"],
            "provenance": "observed",
            "pixel_provenance": manifest["pixel_provenance"],
            "granule_count": len(catalog),
            "months_with_rasters": len(selected_records),
            "months_with_valid_region_pixels": manifest["months_with_valid_region_pixels"],
            "months_with_valid_primary_field_pixels": manifest[
                "months_with_valid_primary_field_pixels"
            ],
            "downloaded_water_scenes": len(records),
            "authenticated_manifest": "opera/authenticated_manifest.json",
            "historical_public_access_probe": "opera/access_status.json",
        }
        master["completed_utc"] = utc_now()
        master["files"] = [
            {
                "path": path.relative_to(satellite).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
            for path in sorted(satellite.rglob("*"))
            if path.is_file() and path != master_path and path.suffix != ".log"
        ]
        write_json(master_path, master)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--field-geojson", type=Path)
    parser.add_argument("--primary-field-id", default="268949")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    fields = args.field_geojson or args.output_dir / "fields/shortlist.geojson"
    result = process(args.output_dir, fields, args.primary_field_id)
    LOGGER.info("Processed %s OPERA months", result["months_with_rasters"])


if __name__ == "__main__":
    main()
