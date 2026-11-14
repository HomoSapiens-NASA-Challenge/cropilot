"""Summarize existing quality-masked HLS observations within demonstration footprints."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np
import rasterio
from numpy.typing import NDArray
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom

DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "data/pergamino"


def summarize_pixels(
    ndvi: NDArray[np.float32],
    valid: NDArray[np.uint8],
    fmask: NDArray[np.uint8],
    inside: NDArray[np.bool_],
) -> dict[str, int | float | None]:
    if not (ndvi.shape == valid.shape == fmask.shape == inside.shape):
        raise ValueError("All rasters and the polygon mask must have identical shapes")
    total = int(inside.sum())
    usable = inside & (valid == 1) & np.isfinite(ndvi)
    values = ndvi[usable]
    count = int(values.size)
    # Keep the source's quality convention: cloud, adjacency, shadow, snow and fill excluded.
    clear = inside & (fmask != 255) & ((fmask & 0b00011110) == 0)
    clear_count = int(clear.sum())
    water_count = int((clear & ((fmask & 0b00100000) != 0)).sum())
    return {
        "field_pixel_count": total,
        "valid_ndvi_pixel_count": count,
        "valid_ndvi_fraction": count / total if total else None,
        "ndvi_mean": float(np.mean(values, dtype=np.float64)) if count else None,
        "ndvi_median": float(np.median(values)) if count else None,
        "ndvi_p10": float(np.percentile(values, 10)) if count else None,
        "ndvi_p90": float(np.percentile(values, 90)) if count else None,
        "quality_clear_pixel_count": clear_count,
        "fmask_water_pixel_count": water_count,
        "fmask_water_fraction_of_quality_clear_pixels": (
            water_count / clear_count if clear_count else None
        ),
    }


def extract(output_dir: Path, field_geojson: Path) -> Path:
    fields = json.loads(field_geojson.read_text(encoding="utf-8"))["features"]
    rows = []
    for scene_path in sorted((output_dir / "satellite/hls").glob("*/scene.json")):
        scene = json.loads(scene_path.read_text(encoding="utf-8"))
        month_dir = scene_path.parent
        if not (month_dir / "ndvi.tif").exists():
            continue
        with (
            rasterio.open(month_dir / "ndvi.tif") as ndvi_dataset,
            rasterio.open(month_dir / "valid_mask.tif") as valid_dataset,
            rasterio.open(month_dir / "fmask.tif") as fmask_dataset,
        ):
            for other in (valid_dataset, fmask_dataset):
                if (
                    other.crs != ndvi_dataset.crs
                    or other.transform != ndvi_dataset.transform
                    or other.shape != ndvi_dataset.shape
                ):
                    raise ValueError(f"Unaligned HLS quality raster in {month_dir}")
            ndvi = ndvi_dataset.read(1)
            valid = valid_dataset.read(1)
            fmask = fmask_dataset.read(1)
            for field in fields:
                geometry = transform_geom("EPSG:4326", ndvi_dataset.crs, field["geometry"])
                inside = geometry_mask(
                    [geometry],
                    out_shape=ndvi_dataset.shape,
                    transform=ndvi_dataset.transform,
                    invert=True,
                    all_touched=False,
                )
                stats = summarize_pixels(ndvi, valid, fmask, inside)
                rows.append(
                    {
                        "field_id": field["id"],
                        "month": scene["month"],
                        "campaign": scene["campaign"],
                        "scene_id": scene["scene_id"],
                        "acquired_utc": scene["acquired_utc"],
                        "source_metadata": scene_path.relative_to(output_dir).as_posix(),
                        "provenance": "observed",
                        **stats,
                    }
                )
    if not rows:
        raise RuntimeError("No HLS scenes were available for field extraction")
    target = output_dir / "fields/vegetation_diagnostics.json"
    payload = {
        "schema_version": "pergamino-field-vegetation-v1",
        "boundary_file": field_geojson.relative_to(output_dir).as_posix(),
        "method": "Pixel centers within each fixed WGS84 footprint, transformed to each HLS grid.",
        "units": {"ndvi": "unitless", "fractions": "0-1", "pixel_counts": "count at 30 m"},
        "limitations": [
            "One selected scene per month, not a monthly mean or a complete event record.",
            "Averages with different valid-pixel counts have different spatial support.",
            "NDVI is spectral greenness, not a verified crop, bare-soil or management label.",
            "Fmask water is a quality-filtered screening flag, "
            "not OPERA or validated flood extent.",
            "Zero visible-water flags do not exclude saturated soil or water beneath canopy.",
            "The modeled boundary has no farmer or cadastral validation.",
        ],
        "records": rows,
    }
    target.write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    with target.with_suffix(".csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return target


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--field-geojson", type=Path)
    args = parser.parse_args()
    field_path = args.field_geojson or args.output_dir / "fields/shortlist.geojson"
    extract(args.output_dir, field_path)


if __name__ == "__main__":
    main()
