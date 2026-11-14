"""Render modeled boundary candidates over an acquired, quality-masked HLS RGB scene."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import rasterio
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform

DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "data/pergamino"


def render(output_dir: Path, scene_month: str) -> Path:
    fields = json.loads((output_dir / "fields/shortlist.geojson").read_text(encoding="utf-8"))
    source = output_dir / "satellite/hls" / scene_month / "rgb_reflectance_dn.tif"
    with rasterio.open(source) as dataset:
        bands = dataset.read().astype(np.float32) * 0.0001
        rgb = np.moveaxis(np.clip(bands / 0.3, 0, 1) ** 0.7, 0, -1)
        bounds = dataset.bounds
        target_crs = dataset.crs
    valid_path = source.with_name("valid_mask.tif")
    scene = json.loads(source.with_name("scene.json").read_text(encoding="utf-8"))
    review = json.loads(Path(__file__).with_name("field_review.json").read_text(encoding="utf-8"))
    with rasterio.open(valid_path) as valid:
        rgb[valid.read(1) == 0] = [0.13, 0.16, 0.19]
    projection = Transformer.from_crs("EPSG:4326", target_crs, always_xy=True)
    geometries = [transform(projection.transform, shape(f["geometry"])) for f in fields["features"]]
    extent = [bounds.left, bounds.right, bounds.bottom, bounds.top]
    figure, axes = plt.subplots(1, len(geometries), figsize=(15, 5.7), layout="constrained")
    for axis, geometry, feature in zip(
        np.atleast_1d(axes), geometries, fields["features"], strict=True
    ):
        axis.imshow(rgb, extent=extent)
        polygons = [geometry] if geometry.geom_type == "Polygon" else geometry.geoms
        for polygon in polygons:
            x, y = polygon.exterior.xy
            axis.plot(x, y, color="#ffdf5d", linewidth=1.7)
        west, south, east, north = geometry.bounds
        padding = 180
        axis.set_xlim(west - padding, east + padding)
        axis.set_ylim(south - padding, north + padding)
        axis.set_aspect("equal")
        axis.set_xticks([])
        axis.set_yticks([])
        properties = feature["properties"]
        selection_label = (
            "Selected demo" if feature["id"] == review["selected_source_id"] else "Not selected"
        )
        axis.set_title(
            f"{selection_label} | {feature['id']}\n"
            f"{properties['geodesic_area_ha']:.1f} ha (modeled footprint)",
            fontsize=11,
        )
    figure.suptitle("Pergamino demo field shortlist - satellite boundary review", fontsize=16)
    figure.supxlabel(
        f"NASA HLS v2.0 | {scene['acquired_utc'][:10]} | FTW 2025 boundaries | "
        "RGB display stretch only; boundaries unvalidated by a farmer\n"
        "Contains modified Copernicus Sentinel data. Prepared with AI-assisted code.",
        fontsize=9,
    )
    destination = output_dir / "fields/shortlist_preview.png"
    figure.savefig(destination, dpi=160)
    plt.close(figure)
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--scene-month", default="2026-09")
    args = parser.parse_args()
    render(args.output_dir, args.scene_month)


if __name__ == "__main__":
    main()
