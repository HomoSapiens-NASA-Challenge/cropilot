"""Acquire and describe INTA crop maps for the Pergamino research region."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import math
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote

import numpy as np
import rasterio
import requests
from numpy.typing import NDArray
from rasterio.features import geometry_mask
from rasterio.transform import Affine, from_origin
from rasterio.warp import Resampling, reproject, transform_bounds, transform_geom
from rasterio.windows import Window, from_bounds

LOGGER = logging.getLogger(__name__)
BBOX = (-60.67, -34.0, -60.47, -33.8)
POINT = (-60.57, -33.9)
RECORDS = (8286326, 8286310, 8286318, 8284081, 10103323, 13984185, 17652712)
STACK_NODATA = 65535
LIMITATIONS = [
    "The AOI is a research region near Pergamino, not a real farmer field or farm boundary.",
    "Satellite-derived classes are not farmer management records or independent ground truth.",
    "Winter cereals include wheat, barley, oats, rye and winter forage; wheat is not confirmed.",
    "2018/19 uses joint annual classes; subsequent campaigns use separate seasonal maps.",
    "CI classes in 2018/19 also include winter forage and cover crops; do not infer wheat/soybean.",
    "Later soybean maps do not distinguish first-crop from second-crop soybean.",
    "Other crops can include cover crops; these maps cannot establish their presence or absence.",
    "Source masks and unknown codes are retained and are not interpreted as crops.",
    "Valid-pixel fractions have changing denominators: masks are nodata in some source campaigns.",
    "Native counts use pixel centers inside the AOI; fractions describe pixels, not hectares.",
    "The aligned stack uses nearest resampling to a 30 m EPSG:32720 grid, not an HLS grid.",
    "Border pixels, mixed pixels and classification errors can change apparent crop sequences.",
    "No local validation, soil parameters, management, recommendations or yields are inferred.",
]


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def class_entry(code: int, label: str | None, alpha: int = 255) -> dict[str, object]:
    status = "mapped_class"
    if alpha == 0:
        status = "transparent_fill"
    elif label is None:
        status = "unknown_code"
    elif label.casefold() in {"máscara", "mascara"}:
        status = "source_mask"
    interpretation = None
    if label == "Cereales de invierno":
        interpretation = "Winter cereals or winter forage; wheat is not confirmed."
    elif label in {"CI-Soja", "CI-Maiz", "CI sin cultivo verano"}:
        ending = {"CI-Soja": "soybean", "CI-Maiz": "maize"}.get(label)
        interpretation = (
            f"Winter crop, winter forage or cover crop followed by {ending}; "
            "wheat is not confirmed."
            if ending
            else "Winter crop, winter forage or cover crop without summer crop; "
            "wheat is not confirmed."
        )
    return {
        "code": code,
        "label_original": label,
        "status": status,
        "interpretation_en": interpretation,
    }


def pdf_legend(record_id: int, season: str) -> dict[int, dict[str, object]]:
    """Transcriptions of the class tables, not a shared numeric remapping."""
    if record_id == 8286326 and season == "annual":
        labels = {
            0: "Maiz",
            1: "Soja 1ra",
            2: "CI-Soja",
            3: "CI-Maiz",
            4: "MANI",
            5: "Girasol",
            6: "CI sin cultivo verano",
            7: "Ganaderia",
            8: "Leñosa natural",
            9: "Leñosas cultivadas",
            11: "Algodon",
            12: "Poroto",
            13: "Caña",
            14: "Girasol-CV",
            15: "Mascara",
        }
    elif record_id == 8286310 and season == "winter":
        labels = {
            0: "Cereales de invierno",
            6: "Otros cultivos de invierno",
            18: "Caña de azúcar",
            17: "Barbecho",
            19: "No agrícola",
        }
    elif record_id == 8286318 and season == "winter":
        labels = {
            0: "Cereales de invierno",
            6: "Garbanzo",
            24: "Arveja",
            19: "Caña de Azúcar",
            18: "Barbecho",
            20: "No Agrícola",
        }
    elif record_id == 8284081 and season == "winter":
        labels = {
            16: "Cereales de invierno",
            19: "Caña de Azúcar",
            24: "Arveja",
            6: "Garbanzo",
            26: "Papa",
            17: "Otros cultivos",
            18: "Barbecho",
            20: "No Agrícola",
        }
    elif record_id in {8286310, 8286318, 8284081} and season == "summer":
        labels = {
            11: "Soja",
            10: "Maiz" if record_id == 8286310 else "Maíz",
            12: "Girasol",
            13: "Poroto",
            15: "Algodon" if record_id == 8286310 else "Algodón",
            14: "Caña de azúcar",
            17: "Arroz",
            16: "Maní",
            19: "Girasol-CV",
            18: "Sorgo" if record_id == 8286310 else "Sorgo GR",
            21: "Barbecho",
            22: "No agrícola",
        }
        if record_id != 8286310:
            labels.update({26: "Papa", 28: "Verdeo de Sorgo"})
    else:
        raise ValueError(f"No verified PDF legend for record {record_id}, season {season}")
    return {code: class_entry(code, label) for code, label in labels.items()}


def parse_qml(text: str) -> dict[int, dict[str, object]]:
    legend = {}
    for item in ET.fromstring(text).iter("item"):
        if "value" not in item.attrib or "label" not in item.attrib:
            continue
        code = int(item.attrib["value"])
        entry = class_entry(code, item.attrib["label"], int(item.attrib.get("alpha", "255")))
        entry["color_hex"] = item.attrib.get("color")
        if code in legend and legend[code] != entry:
            raise ValueError(f"Conflicting legend for code {code}")
        legend[code] = entry
    if not legend:
        raise ValueError("No categorical legend entries in QML")
    return legend


def effective_validity(
    data: NDArray, source_valid: NDArray, legend: dict[int, dict[str, object]]
) -> NDArray:
    valid = source_valid.copy()
    for code, entry in legend.items():
        if entry["status"] == "transparent_fill":
            valid &= data != code
    return valid


def class_distribution(
    data: NDArray, valid: NDArray, legend: dict[int, dict[str, object]]
) -> list[dict[str, object]]:
    codes, counts = np.unique(data[valid], return_counts=True)
    total = int(counts.sum())
    return [
        {
            **legend.get(int(code), class_entry(int(code), None)),
            "pixel_count": int(count),
            "fraction_of_valid_pixels": int(count) / total,
        }
        for code, count in zip(codes, counts, strict=True)
    ]


def aoi_polygon() -> dict[str, object]:
    west, south, east, north = BBOX
    return {
        "type": "Polygon",
        "coordinates": [
            [[west, south], [east, south], [east, north], [west, north], [west, south]]
        ],
    }


def region_mask(shape: tuple[int, int], transform: Affine, crs: str) -> NDArray:
    polygon = transform_geom("EPSG:4326", crs, aoi_polygon())
    return geometry_mask([polygon], shape, transform, invert=True, all_touched=False)


def target_grid() -> dict[str, object]:
    west, south, east, north = transform_bounds("EPSG:4326", "EPSG:32720", *BBOX)
    west, south = math.floor(west / 30) * 30, math.floor(south / 30) * 30
    east, north = math.ceil(east / 30) * 30, math.ceil(north / 30) * 30
    return {
        "crs": "EPSG:32720",
        "transform": from_origin(west, north, 30, 30),
        "width": int((east - west) / 30),
        "height": int((north - south) / 30),
    }


def reproject_classes(
    source: NDArray,
    valid: NDArray,
    source_transform: Affine,
    source_crs: str,
    grid: dict[str, object],
    inside_aoi: NDArray,
) -> NDArray:
    prepared = np.where(valid, source.astype("uint16"), STACK_NODATA)
    destination = np.full((grid["height"], grid["width"]), STACK_NODATA, dtype="uint16")
    reproject(
        prepared,
        destination,
        src_transform=source_transform,
        src_crs=source_crs,
        src_nodata=STACK_NODATA,
        dst_transform=grid["transform"],
        dst_crs=grid["crs"],
        dst_nodata=STACK_NODATA,
        resampling=Resampling.nearest,
    )
    destination[~inside_aoi] = STACK_NODATA
    return destination


def cached_source(session: requests.Session, url: str, path: Path) -> dict[str, object]:
    if not path.exists():
        response = session.get(url, timeout=(30, 180))
        response.raise_for_status()
        path.write_bytes(response.content)
    return {
        "path": f"sources/{path.name}",
        "source_url": url,
        "retrieved_utc": datetime.fromtimestamp(path.stat().st_mtime, UTC).isoformat(),
        "sha256": sha256(path),
        "size_bytes": path.stat().st_size,
    }


def download_ancillary(
    session: requests.Session,
    record: dict,
    file: dict,
    sources: Path,
) -> dict[str, object]:
    path = sources / f"{record['id']}_{file['key']}"
    result = cached_source(session, file["links"]["self"], path)
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "md5").hexdigest()
    if f"md5:{digest}" != file["checksum"]:
        raise ValueError(f"Source checksum mismatch: {path}")
    result["provider_checksum"] = file["checksum"]
    result["provider_checksum_verified"] = True
    return result


def acquire_clip(
    session: requests.Session,
    record: dict,
    file: dict,
    map_id: str,
    output: Path,
) -> tuple[Path, dict]:
    clip_path = output / "native" / f"{map_id}.tif"
    info_path = output / "native" / f"{map_id}.json"
    url = f"https://zenodo.org/records/{record['id']}/files/{quote(file['key'])}?download=1"
    if clip_path.exists() and info_path.exists():
        info = json.loads(info_path.read_text(encoding="utf-8"))
        if info["bbox_wgs84"] != list(BBOX) or info["sha256"] != sha256(clip_path):
            raise ValueError(f"Cached clip changed or has another AOI: {clip_path}")
        return clip_path, info
    with session.get(url, headers={"Range": "bytes=0-0"}, stream=True, timeout=60) as probe:
        probe.raise_for_status()
        if probe.status_code != 206:
            raise ValueError(
                f"Source does not support HTTP ranges; no full download attempted: {url}"
            )
        content_range = probe.headers.get("Content-Range")
    retrieved = utc_now()
    with (
        rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            GDAL_HTTP_MAX_RETRY="3",
            GDAL_HTTP_RETRY_DELAY="2",
            GDAL_HTTP_TIMEOUT="120",
        ),
        rasterio.open(url) as source,
    ):
        bounds = transform_bounds("EPSG:4326", source.crs, *BBOX)
        fractional = from_bounds(*bounds, transform=source.transform)
        left, top = math.floor(fractional.col_off), math.floor(fractional.row_off)
        right = math.ceil(fractional.col_off + fractional.width)
        bottom = math.ceil(fractional.row_off + fractional.height)
        window = Window(left, top, right - left, bottom - top)
        data = source.read(1, window=window)
        valid = source.read_masks(1, window=window)
        transform = source.window_transform(window)
        profile = {
            "driver": "GTiff",
            "count": 1,
            "dtype": data.dtype,
            "crs": source.crs,
            "transform": transform,
            "width": data.shape[1],
            "height": data.shape[0],
            "nodata": source.nodata,
            "compress": "deflate",
            "tiled": True,
        }
        with rasterio.open(clip_path, "w", **profile) as destination:
            destination.write(data, 1)
            destination.write_mask(valid)
            destination.update_tags(source_url=url, retrieved_utc=retrieved, map_id=map_id)
        info = {
            "map_id": map_id,
            "source_url": url,
            "retrieved_utc": retrieved,
            "record_id": record["id"],
            "doi": record["metadata"]["doi"],
            "source_filename": file["key"],
            "source_size_bytes": file["size"],
            "provider_checksum": file["checksum"],
            "provider_checksum_verified": False,
            "checksum_note": "Remote source is read by ranges; SHA256 below covers the local clip.",
            "http_range_probe": content_range,
            "acquisition": "windowed_http_range",
            "bbox_wgs84": BBOX,
            "source_crs": source.crs.to_string(),
            "source_transform": list(source.transform),
            "source_nodata": source.nodata,
            "source_dimensions_pixels": [source.width, source.height],
            "source_window_col_row_width_height": list(window.flatten()),
            "clip_transform": list(transform),
            "clip_dimensions_pixels": [data.shape[1], data.shape[0]],
            "clip_bounds": list(rasterio.transform.array_bounds(*data.shape, transform)),
            "path": f"native/{map_id}.tif",
            "sha256": sha256(clip_path),
            "size_bytes": clip_path.stat().st_size,
            "units": "categorical original INTA class code",
        }
    write_json(info_path, info)
    return clip_path, info


def prepare_legend(
    session: requests.Session,
    record: dict,
    season: str,
    sources: Path,
) -> tuple[dict[int, dict[str, object]], dict[str, object]]:
    prefix = "inv" if season == "winter" else "ver"
    qml = next(
        (f for f in record["files"] if f["key"].endswith(".qml") and prefix in f["key"]), None
    )
    if qml:
        provenance = download_ancillary(session, record, qml, sources)
        legend = parse_qml((sources / f"{record['id']}_{qml['key']}").read_text(encoding="utf-8"))
        provenance["method"] = "official QML categorical legend"
    else:
        pdf = next(f for f in record["files"] if f["key"].endswith(".pdf"))
        provenance = download_ancillary(session, record, pdf, sources)
        pages = {
            8286326: {"annual": 7},
            8286310: {"winter": 9, "summer": 10},
            8286318: {"winter": 7, "summer": 8},
            8284081: {"winter": 6, "summer": 7},
        }
        provenance.update(
            {
                "method": "visually verified official PDF table transcription",
                "pdf_page_1_based": pages[record["id"]][season],
            }
        )
        legend = pdf_legend(record["id"], season)
    return legend, provenance


def run(output_dir: Path) -> dict[str, object]:
    output = output_dir / "crops"
    for directory in (output / "native", output / "sources", output / "legends"):
        directory.mkdir(parents=True, exist_ok=True)
    grid = target_grid()
    inside = region_mask((grid["height"], grid["width"]), grid["transform"], grid["crs"])
    maps, campaigns, bands, assets = [], [], [], []
    session = requests.Session()
    session.mount("https://", requests.adapters.HTTPAdapter(max_retries=3))
    for year, record_id in enumerate(RECORDS, start=2018):
        record_path = output / "sources" / f"{record_id}.json"
        assets.append(
            cached_source(session, f"https://zenodo.org/api/records/{record_id}", record_path)
        )
        record = json.loads(record_path.read_text(encoding="utf-8"))
        if record_id == 17652712:
            report = next(f for f in record["files"] if f["key"].endswith(".pdf"))
            assets.append(download_ancillary(session, record, report, output / "sources"))
        campaign_maps, campaign_bands = [], []
        campaign = f"{year}/{year + 1}"
        for season in ["annual"] if year == 2018 else ["winter", "summer"]:
            file = next(
                f
                for f in record["files"]
                if f["key"].endswith(".tif")
                and (
                    season == "annual"
                    or ("inv" if season == "winter" else "ver") in f["key"].lower()
                )
            )
            map_id = f"inta_{year}_{year + 1}_{season}"
            LOGGER.info("Acquiring %s", map_id)
            legend, legend_source = prepare_legend(session, record, season, output / "sources")
            assets.append(legend_source)
            legend_path = output / "legends" / f"{map_id}.json"
            write_json(
                legend_path,
                {"map_id": map_id, "source": legend_source, "classes": list(legend.values())},
            )
            clip_path, info = acquire_clip(session, record, file, map_id, output)
            with rasterio.open(clip_path) as source:
                data = source.read(1)
                declared_valid = source.read_masks(1) != 0
                valid = effective_validity(data, declared_valid, legend)
                native_inside = region_mask(data.shape, source.transform, source.crs.to_string())
                selected = valid & native_inside
                distribution = class_distribution(data, selected, legend)
                for entry in distribution:
                    entry["fraction_of_aoi_pixels"] = entry["pixel_count"] / int(
                        native_inside.sum()
                    )
                aligned = reproject_classes(data, valid, source.transform, source.crs, grid, inside)
                row, col = source.index(*POINT)
                point_code = int(data[row, col])
                point = {
                    **legend.get(point_code, class_entry(point_code, None)),
                    "valid": bool(valid[row, col]),
                    "coordinates_wgs84": POINT,
                    "source_pixel_center_wgs84": list(source.xy(row, col)),
                }
                point["usable_named_class_observation"] = (
                    point["valid"] and point["status"] == "mapped_class"
                )
                point["missing_reason"] = (
                    "declared_source_nodata_or_mask"
                    if not declared_valid[row, col]
                    else "qml_transparent_fill"
                    if not valid[row, col]
                    else None
                )
                summary = {
                    **info,
                    "campaign": campaign,
                    "season": season,
                    "band_1_based": len(bands) + 1,
                    "legend_path": f"legends/{map_id}.json",
                    "legend_sha256": sha256(legend_path),
                    "license": record["metadata"].get("license"),
                    "source_version": record["metadata"].get("version"),
                    "legend_source": legend_source,
                    "aoi_pixel_count": int(native_inside.sum()),
                    "valid_pixel_count": int(selected.sum()),
                    "declared_nodata_pixel_count": int((native_inside & ~declared_valid).sum()),
                    "transparent_fill_pixel_count": int(
                        (native_inside & declared_valid & ~valid).sum()
                    ),
                    "valid_fraction": float(selected.sum() / native_inside.sum()),
                    "source_mask_pixel_count": sum(
                        r["pixel_count"] for r in distribution if r["status"] == "source_mask"
                    ),
                    "distribution": distribution,
                    "point_observation": point,
                    "unknown_codes": [
                        r["code"] for r in distribution if r["status"] == "unknown_code"
                    ],
                    "quality_checks": {
                        "histogram_conserves_valid_pixels": sum(
                            r["pixel_count"] for r in distribution
                        )
                        == int(selected.sum()),
                        "aligned_preserves_categorical_codes": bool(
                            set(np.unique(aligned)) <= (set(np.unique(data)) | {STACK_NODATA})
                        ),
                    },
                }
            maps.append(summary)
            campaign_maps.append(summary)
            bands.append(aligned)
            campaign_bands.append(aligned)
        complete = inside & np.all(np.stack(campaign_bands) != STACK_NODATA, axis=0)
        combinations, counts = np.unique(
            np.stack(campaign_bands)[:, complete].T, axis=0, return_counts=True
        )
        campaigns.append(
            {
                "campaign": campaign,
                "map_ids": [m["map_id"] for m in campaign_maps],
                "complete_pixel_count": int(complete.sum()),
                "aoi_aligned_pixel_count": int(inside.sum()),
                "class_combinations": [
                    {
                        "original_codes": codes.tolist(),
                        "pixel_count": int(count),
                        "fraction_of_complete_pixels": int(count) / int(complete.sum()),
                    }
                    for codes, count in zip(combinations, counts, strict=True)
                ],
                "point_observations": [
                    {"season": m["season"], **m["point_observation"]} for m in campaign_maps
                ],
            }
        )
    stack_path = output / "crop_history_original_codes_utm20s_30m.tif"
    with rasterio.open(
        stack_path,
        "w",
        driver="GTiff",
        count=len(bands),
        dtype="uint16",
        nodata=STACK_NODATA,
        compress="deflate",
        tiled=True,
        **grid,
    ) as destination:
        for index, (band, summary) in enumerate(zip(bands, maps, strict=True), start=1):
            destination.write(band, index)
            destination.set_band_description(index, summary["map_id"])
            destination.update_tags(
                index,
                campaign=summary["campaign"],
                season=summary["season"],
                legend_path=summary["legend_path"],
                source_url=summary["source_url"],
            )
    stack = np.stack(bands)
    complete_all = inside & np.all(stack != STACK_NODATA, axis=0)
    sequences, sequence_counts = np.unique(stack[:, complete_all].T, axis=0, return_counts=True)
    sequence_path = output / "crop_sequences.csv"
    with sequence_path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(
            [m["map_id"] for m in maps] + ["pixel_count", "fraction_of_complete_pixels"]
        )
        for sequence, count in zip(sequences, sequence_counts, strict=True):
            writer.writerow([*sequence.tolist(), int(count), int(count) / int(complete_all.sum())])
    summary = {
        "schema_version": 1,
        "generated_utc": utc_now(),
        "dataset": "INTA Argentina National Map of Crops",
        "aoi": {
            "label": "Pergamino research region; not a farmer field",
            "bbox_wgs84": BBOX,
            "reference_point_wgs84": POINT,
            "geometry": aoi_polygon(),
        },
        "units": {
            "raster": "categorical original INTA class code",
            "counts": "pixels",
            "fractions": "unitless [0,1]",
            "aligned_resolution_m": 30,
        },
        "limitations": LIMITATIONS,
        "maps": maps,
        "campaigns": campaigns,
        "sequence_histogram": {
            "path": sequence_path.name,
            "sha256": sha256(sequence_path),
            "sequence_count": len(sequences),
            "pixel_count": int(sequence_counts.sum()),
            "note": "All 13 original codes in band order; mask and unknown codes are retained.",
        },
        "aligned_stack": {
            "path": stack_path.name,
            "sha256": sha256(stack_path),
            "size_bytes": stack_path.stat().st_size,
            "crs": grid["crs"],
            "transform": list(grid["transform"]),
            "width": grid["width"],
            "height": grid["height"],
            "bands": len(bands),
            "nodata": STACK_NODATA,
            "resampling": "nearest",
            "band_order": [m["map_id"] for m in maps],
            "aoi_pixel_count": int(inside.sum()),
            "complete_13_map_pixel_count": int(complete_all.sum()),
            "complete_fraction": float(complete_all.sum() / inside.sum()),
        },
        "source_artifacts": list({a["path"]: a for a in assets}.values()),
        "quality_checks": {
            "campaign_count": len(campaigns),
            "map_count": len(maps),
            "all_histograms_conserve_valid_pixels": all(
                m["quality_checks"]["histogram_conserves_valid_pixels"] for m in maps
            ),
            "all_alignments_preserve_classes": all(
                m["quality_checks"]["aligned_preserves_categorical_codes"] for m in maps
            ),
            "maps_with_unknown_codes": [m["map_id"] for m in maps if m["unknown_codes"]],
        },
    }
    if not all(
        summary["quality_checks"][key]
        for key in ("all_histograms_conserve_valid_pixels", "all_alignments_preserve_classes")
    ):
        raise ValueError("Crop history conservation checks failed; inspect source clips")
    write_json(output / "crop_history.json", summary)
    LOGGER.info("Saved %s maps and %s campaigns to %s", len(maps), len(campaigns), output)
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir", type=Path, default=Path(__file__).resolve().parents[3] / "data/pergamino"
    )
    arguments = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run(arguments.output_dir)


if __name__ == "__main__":
    main()
