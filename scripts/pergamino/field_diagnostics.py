"""Summarize observed INTA crop classes inside preselected modeled field polygons."""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
from collections import Counter
from pathlib import Path

import numpy as np
import rasterio
from crop_history import STACK_NODATA, class_entry, sha256, utc_now, write_json
from numpy.typing import NDArray
from rasterio.features import geometry_mask, geometry_window
from rasterio.warp import transform_geom

LOGGER = logging.getLogger(__name__)
LIMITATIONS = [
    "These are modeled remote-sensing field units, not verified farmer or cadastral boundaries.",
    "A 2025 modeled footprint is used for earlier maps; historical stability is unverified.",
    "Dominant mapped classes are satellite classifications, not verified crops or management.",
    "Winter cereals include winter forage and several cereal species; wheat is not confirmed.",
    "2018/19 CI classes permit cover crops; later soybean does not distinguish sowing order.",
    "Histograms include mixed pixels and classification errors; local ground truth is unavailable.",
    "Fractions count pixel centers, not hectares. Grid changes can alter boundary counts.",
    "Aligned campaign combinations use nearest-neighbor 30 m EPSG:32720 pixels.",
    "No sowing dates, fertilization, farmer strategy, yields or recommendations are inferred.",
]


def summarize_pixels(
    data: NDArray,
    source_valid: NDArray,
    inside: NDArray,
    legend: dict[int, dict[str, object]],
) -> dict[str, object]:
    counts = {
        "field": int(inside.sum()),
        "mapped_class": 0,
        "source_mask": 0,
        "transparent_fill": 0,
        "unknown_code": 0,
        "missing": int((inside & ~source_valid).sum()),
    }
    codes, pixel_counts = np.unique(data[inside & source_valid], return_counts=True)
    histogram = []
    for code, count in zip(codes, pixel_counts, strict=True):
        entry = legend.get(int(code), class_entry(int(code), None))
        counts[entry["status"]] += int(count)
        histogram.append({**entry, "pixel_count": int(count)})
    for entry in histogram:
        entry["fraction_of_field_pixels"] = entry["pixel_count"] / counts["field"]
        entry["fraction_of_mapped_pixels"] = (
            entry["pixel_count"] / counts["mapped_class"]
            if entry["status"] == "mapped_class" and counts["mapped_class"]
            else None
        )
    named = sorted(
        (entry for entry in histogram if entry["status"] == "mapped_class"),
        key=lambda entry: (-entry["pixel_count"], entry["code"]),
    )
    dominant = None
    dominance_status = "no_mapped_pixels"
    if named:
        if len(named) > 1 and named[0]["pixel_count"] == named[1]["pixel_count"]:
            dominance_status = "tie_between_mapped_classes"
        else:
            dominant = {**named[0], "interpretation_status": "observed_map_class_not_verified_crop"}
            dominance_status = "unique_dominant_mapped_class"
    if sum(count for category, count in counts.items() if category != "field") != counts["field"]:
        raise ValueError("Field pixel categories do not conserve the field pixel count")
    return {
        "pixel_counts": counts,
        "fractions_of_field_pixels": {
            category: count / counts["field"] if counts["field"] else None
            for category, count in counts.items()
            if category != "field"
        },
        "class_histogram": histogram,
        "dominant_mapped_class": dominant,
        "dominance_status": dominance_status,
    }


def read_field_summary(
    path: Path, geometry: dict, legend: dict[int, dict[str, object]]
) -> dict[str, object]:
    with rasterio.open(path) as source:
        projected = transform_geom("EPSG:4326", source.crs, geometry)
        window = geometry_window(source, [projected], boundless=True)
        data = source.read(1, window=window, boundless=True, fill_value=0)
        source_valid = source.read_masks(1, window=window, boundless=True) != 0
        transform = source.window_transform(window)
        inside = geometry_mask([projected], data.shape, transform, all_touched=False, invert=True)
        summary = summarize_pixels(data, source_valid, inside, legend)
        rows, cols = np.indices(data.shape)
        outside = (
            (rows + window.row_off < 0)
            | (rows + window.row_off >= source.height)
            | (cols + window.col_off < 0)
            | (cols + window.col_off >= source.width)
        )
        summary["outside_clip_pixel_count"] = int((outside & inside).sum())
        summary["sampling"] = {
            "crs": source.crs.to_string(),
            "transform": list(transform),
            "window_col_row_width_height": list(window.flatten()),
            "all_touched": False,
            "source_nodata": source.nodata,
        }
    return summary


def summer_crop_identity(observation: dict, dominant: dict) -> str | None:
    if observation["season"] == "annual":
        if observation["record_id"] != 8286326:
            return None
        return {
            0: "maize",
            1: "soybean",
            2: "soybean",
            3: "maize",
            4: "peanut",
            5: "sunflower",
            11: "cotton",
            12: "bean",
            13: "sugarcane",
        }.get(dominant["code"])
    return {
        "Soja": "soybean",
        "Maíz": "maize",
        "Maiz": "maize",
        "Girasol": "sunflower",
        "Poroto": "bean",
        "Algodón": "cotton",
        "Algodon": "cotton",
        "Caña de azúcar": "sugarcane",
        "Arroz": "rice",
        "Maní": "peanut",
        "Sorgo": "sorghum",
        "Sorgo GR": "grain_sorghum",
        "Papa": "potato",
        "Verdeo de Sorgo": "forage_sorghum",
        "Verdeo de Maíz": "forage_maize",
        "Tabaco": "tobacco",
    }.get(dominant["label_original"])


def summer_recurrence(observations: list[dict]) -> dict[str, object]:
    counts = Counter()
    included_observations = []
    for observation in observations:
        if observation["season"] not in {"annual", "summer"}:
            continue
        dominant = observation["dominant_mapped_class"]
        pixel_counts = observation["pixel_counts"]
        item = {
            "campaign": observation["campaign"],
            "included": False,
            "dominant_mapped_class": dominant,
        }
        if not dominant:
            item["reason"] = observation["dominance_status"]
        elif not pixel_counts["field"] or any(
            pixel_counts[category]
            for category in ("missing", "source_mask", "transparent_fill", "unknown_code")
        ):
            item["reason"] = "incomplete_or_masked_field_observation"
        elif dominant["fraction_of_mapped_pixels"] <= 0.5:
            item["reason"] = "no_majority_crop_class"
        else:
            crop = summer_crop_identity(observation, dominant)
            if crop is None:
                item["reason"] = "not_an_unambiguous_single_summer_crop_class"
            else:
                item.update(
                    {
                        "included": True,
                        "summer_crop_identity": crop,
                        "reason": "majority_named_crop_with_complete_mapped_coverage",
                    }
                )
                counts[crop] += 1
        included_observations.append(item)
    return {
        "metric": "Counts of dominant summer crop classifications; not verified rotations",
        "rule": (
            "Require complete named-class coverage and a strict majority crop, with no missing, "
            "mask or unknown pixels. Mixed classes may remain; fractions accompany observations. "
            "Majority is a descriptive rule, not a calibrated confidence threshold."
        ),
        "classification_counts": dict(sorted(counts.items())),
        "observations": included_observations,
    }


def campaign_histograms(
    crop_pack: dict,
    crop_root: Path,
    geometry: dict,
    legends: dict,
) -> list[dict[str, object]]:
    with rasterio.open(crop_root / crop_pack["aligned_stack"]["path"]) as source:
        projected = transform_geom("EPSG:4326", source.crs, geometry)
        window = geometry_window(source, [projected], boundless=True)
        data = source.read(window=window, boundless=True, fill_value=STACK_NODATA)
        inside = geometry_mask(
            [projected],
            data.shape[1:],
            source.window_transform(window),
            all_touched=False,
            invert=True,
        )
    map_lookup = {entry["map_id"]: entry for entry in crop_pack["maps"]}
    campaigns = []
    for campaign in crop_pack["campaigns"]:
        map_ids = campaign["map_ids"]
        selected = data[[map_lookup[map_id]["band_1_based"] - 1 for map_id in map_ids]]
        valid = inside.copy()
        for band, map_id in zip(selected, map_ids, strict=True):
            named_codes = [
                code for code, entry in legends[map_id].items() if entry["status"] == "mapped_class"
            ]
            valid &= np.isin(band, named_codes)
        combinations, counts = np.unique(selected[:, valid].T, axis=0, return_counts=True)
        campaigns.append(
            {
                "campaign": campaign["campaign"],
                "map_ids": map_ids,
                "aligned_field_pixel_count": int(inside.sum()),
                "joint_mapped_pixel_count": int(valid.sum()),
                "joint_excluded_pixel_count": int((inside & ~valid).sum()),
                "class_combinations": [
                    {
                        "classes": [
                            {"map_id": map_id, **legends[map_id][int(code)]}
                            for map_id, code in zip(map_ids, combination, strict=True)
                        ],
                        "pixel_count": int(count),
                        "fraction_of_joint_mapped_pixels": int(count) / int(valid.sum()),
                        "fraction_of_field_pixels": int(count) / int(inside.sum()),
                    }
                    for combination, count in zip(combinations, counts, strict=True)
                ],
            }
        )
    return campaigns


def run(field_geojson: Path, output_dir: Path) -> dict[str, object]:
    crop_root = output_dir / "crops"
    crop_manifest = crop_root / "crop_history.json"
    crop_pack = json.loads(crop_manifest.read_text(encoding="utf-8"))
    fields = json.loads(field_geojson.read_text(encoding="utf-8"))
    if fields.get("type") != "FeatureCollection" or fields.get("crs"):
        raise ValueError("Expected a WGS84 GeoJSON FeatureCollection without an alternative CRS")
    legends = {
        entry["map_id"]: {
            row["code"]: row
            for row in json.loads((crop_root / entry["legend_path"]).read_text(encoding="utf-8"))[
                "classes"
            ]
        }
        for entry in crop_pack["maps"]
    }
    diagnostics, csv_rows = [], []
    for index, feature in enumerate(fields["features"], start=1):
        geometry = feature["geometry"]
        if geometry["type"] not in {"Polygon", "MultiPolygon"}:
            raise ValueError("Field geometries must be polygons or multipolygons")
        properties = feature.get("properties") or {}
        field_id = str(feature.get("id", properties.get("source_id", f"feature_{index}")))
        LOGGER.info("Summarizing modeled field %s", field_id)
        observations = []
        for entry in crop_pack["maps"]:
            diagnostic = read_field_summary(
                crop_root / entry["path"], geometry, legends[entry["map_id"]]
            )
            diagnostic.update(
                {
                    key: entry[key]
                    for key in (
                        "map_id",
                        "record_id",
                        "campaign",
                        "season",
                        "source_url",
                        "retrieved_utc",
                        "path",
                        "sha256",
                        "legend_path",
                        "legend_sha256",
                    )
                }
            )
            observations.append(diagnostic)
            rows = list(diagnostic["class_histogram"])
            if diagnostic["pixel_counts"]["missing"]:
                rows.append(
                    {
                        "code": None,
                        "label_original": None,
                        "status": "missing",
                        "pixel_count": diagnostic["pixel_counts"]["missing"],
                        "fraction_of_field_pixels": diagnostic["fractions_of_field_pixels"][
                            "missing"
                        ],
                        "fraction_of_mapped_pixels": None,
                    }
                )
            if not rows:
                rows.append(
                    {
                        "code": None,
                        "label_original": None,
                        "status": "no_field_pixel_centers",
                        "pixel_count": 0,
                        "fraction_of_field_pixels": None,
                        "fraction_of_mapped_pixels": None,
                    }
                )
            for row in rows:
                csv_rows.append(
                    {
                        "field_id": field_id,
                        "map_id": entry["map_id"],
                        "campaign": entry["campaign"],
                        "season": entry["season"],
                        **{
                            key: row[key]
                            for key in (
                                "code",
                                "label_original",
                                "status",
                                "pixel_count",
                                "fraction_of_field_pixels",
                                "fraction_of_mapped_pixels",
                            )
                        },
                    }
                )
        diagnostics.append(
            {
                "field_id": field_id,
                "source_feature_index_1_based": index,
                "source_properties": properties,
                "maps": observations,
                "campaigns": campaign_histograms(crop_pack, crop_root, geometry, legends),
                "repeated_summer_classifications": summer_recurrence(observations),
            }
        )
    result = {
        "schema_version": 1,
        "generated_utc": utc_now(),
        "source_fields": {
            "path": Path(os.path.relpath(field_geojson, output_dir)).as_posix(),
            "sha256": sha256(field_geojson),
        },
        "source_crop_pack": {
            "path": crop_manifest.resolve().relative_to(output_dir.resolve()).as_posix(),
            "sha256": sha256(crop_manifest),
        },
        "selection": "Input feature order preserved; fields are not selected using crop outcomes.",
        "units": {"counts": "pixels", "fractions": "unitless [0,1]"},
        "limitations": LIMITATIONS,
        "fields": diagnostics,
    }
    destination = output_dir / "fields"
    destination.mkdir(parents=True, exist_ok=True)
    csv_path = destination / "crop_diagnostics.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(
            stream,
            fieldnames=[
                "field_id",
                "map_id",
                "campaign",
                "season",
                "code",
                "label_original",
                "status",
                "pixel_count",
                "fraction_of_field_pixels",
                "fraction_of_mapped_pixels",
            ],
        )
        writer.writeheader()
        writer.writerows(csv_rows)
    result["csv"] = {
        "path": "fields/crop_diagnostics.csv",
        "sha256": sha256(csv_path),
        "rows": len(csv_rows),
    }
    write_json(destination / "crop_diagnostics.json", result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir", type=Path, default=Path(__file__).resolve().parents[3] / "data/pergamino"
    )
    parser.add_argument("--field-geojson", type=Path)
    arguments = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run(
        arguments.field_geojson or arguments.output_dir / "fields" / "shortlist.geojson",
        arguments.output_dir,
    )


if __name__ == "__main__":
    main()
