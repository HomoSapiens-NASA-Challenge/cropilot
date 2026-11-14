"""Acquire a reproducible monthly HLS sample and the OPERA DSWx public catalog.

This study rectangle is not a surveyed farm. No labels or flood statistics are
inferred from NDVI. Downloads and derived data remain in the ignored data tree.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import math
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from threading import Lock
from urllib.parse import urlsplit

import numpy as np
import numpy.typing as npt
import rasterio
import requests
from affine import Affine
from rasterio.features import geometry_mask
from rasterio.warp import Resampling, reproject, transform_bounds, transform_geom
from rasterio.windows import Window, from_bounds
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BBOX = (-60.67, -34.0, -60.47, -33.8)
POINT = (-60.57, -33.9)
STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
TOKEN = "https://planetarycomputer.microsoft.com/api/sas/v1/token"
REFLECTANCE_NODATA = -9999
FMASK_NODATA = 255
BAD_QUALITY_BITS = 2 | 4 | 8 | 16
SCALE = 0.0001
LOGGER = logging.getLogger("pergamino.satellite")
SAS_CACHE: dict[tuple[str, str], tuple[datetime, str]] = {}
SAS_LOCK = Lock()


@dataclass
class Grid:
    crs: str
    transform: Affine
    width: int
    height: int
    aoi_mask: npt.NDArray[np.bool_]


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def session() -> requests.Session:
    client = requests.Session()
    # Public acquisition must not silently use a user's netrc credentials.
    client.trust_env = False
    retry = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
    client.mount("https://", HTTPAdapter(max_retries=retry))
    return client


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def signed_href(client: requests.Session, href: str) -> str:
    parsed = urlsplit(href)
    if not parsed.hostname or not parsed.hostname.endswith(".blob.core.windows.net"):
        raise ValueError("HLS signing expects an Azure Blob Storage asset")
    account = parsed.hostname.split(".")[0]
    container = parsed.path.strip("/").split("/")[0]
    key = account, container
    # One short-lived public token per container avoids per-band signing throttles.
    with SAS_LOCK:
        cached = SAS_CACHE.get(key)
        if cached is None or (cached[0] - datetime.now(UTC)).total_seconds() < 120:
            response = client.get(f"{TOKEN}/{account}/{container}", timeout=60)
            response.raise_for_status()
            payload = response.json()
            expiry = datetime.fromisoformat(payload["msft:expiry"].replace("Z", "+00:00"))
            cached = expiry, payload["token"]
            SAS_CACHE[key] = cached
    return f"{href.split('?')[0]}?{cached[1]}"


def safe_error(error: Exception) -> str:
    # GDAL errors may echo signed URLs; never persist or log their query strings.
    return re.sub(r"https?://[^\s'\"]+", lambda match: match[0].split("?")[0], str(error))


def campaign_for_month(month: str) -> str:
    year, month_number = map(int, month.split("-"))
    start = year if month_number >= 6 else year - 1
    return f"{start}/{str(start + 1)[-2:]}"


def make_grid() -> Grid:
    crs = "EPSG:32720"
    left, bottom, right, top = transform_bounds("EPSG:4326", crs, *BBOX, densify_pts=21)
    left, bottom = math.floor(left / 30) * 30, math.floor(bottom / 30) * 30
    right, top = math.ceil(right / 30) * 30, math.ceil(top / 30) * 30
    width, height = int((right - left) / 30), int((top - bottom) / 30)
    transform = Affine(30, 0, left, 0, -30, top)
    west, south, east, north = BBOX
    geometry = {
        "type": "Polygon",
        "coordinates": [
            [[west, south], [east, south], [east, north], [west, north], [west, south]]
        ],
    }
    projected = transform_geom("EPSG:4326", crs, geometry)
    mask = geometry_mask([projected], (height, width), transform, invert=True)
    return Grid(crs, transform, width, height, mask)


def calculate_ndvi(
    red_dn: npt.NDArray,
    nir_dn: npt.NDArray,
    fmask: npt.NDArray,
    aoi_mask: npt.NDArray | None = None,
) -> tuple[npt.NDArray[np.float32], npt.NDArray[np.bool_]]:
    red = red_dn.astype(np.float32)
    nir = nir_dn.astype(np.float32)
    # Nonpositive reflectance is retained in raw bands, but excluded from NDVI:
    # negative atmospheric-correction artifacts can produce indices outside [-1, 1].
    valid = (
        (fmask != FMASK_NODATA)
        & ((fmask & BAD_QUALITY_BITS) == 0)
        & (red_dn != REFLECTANCE_NODATA)
        & (nir_dn != REFLECTANCE_NODATA)
        & np.isfinite(red)
        & np.isfinite(nir)
        & (red > 0)
        & (nir > 0)
        & ((nir + red) > 0)
    )
    if aoi_mask is not None:
        valid &= aoi_mask
    ndvi = np.full(red.shape, np.nan, dtype=np.float32)
    np.divide(nir - red, nir + red, out=ndvi, where=valid)
    return ndvi, valid


def month_range(start: date, end: date) -> list[str]:
    months = []
    current = start.replace(day=1)
    while current <= end:
        months.append(current.strftime("%Y-%m"))
        current = date(current.year + current.month // 12, current.month % 12 + 1, 1)
    return months


def hls_catalog(output: Path, end: date) -> list[dict]:
    client = session()
    body = {
        "collections": ["hls2-s30", "hls2-l30"],
        "bbox": list(BBOX),
        "datetime": f"2020-06-01T00:00:00Z/{end.isoformat()}T23:59:59Z",
        "limit": 1000,
    }
    items, page = [], 1
    while body:
        path = output / "catalog" / f"hls_page_{page:03d}.json"
        if path.exists():
            payload = json.loads(path.read_text(encoding="utf-8"))
        else:
            response = client.post(f"{STAC}/search", json=body, timeout=90)
            response.raise_for_status()
            payload = response.json()
            write_json(path, {"retrieved_utc": utc_now(), "request": body, "response": payload})
            payload = {"response": payload}
        features = payload["response"]["features"]
        items.extend(features)
        next_link = next(
            (link for link in payload["response"]["links"] if link["rel"] == "next"),
            None,
        )
        body = next_link["body"] if next_link else None
        page += 1
    for collection in ("hls2-s30", "hls2-l30"):
        response = client.get(f"{STAC}/collections/{collection}", timeout=60)
        response.raise_for_status()
        write_json(output / "catalog" / f"{collection}.json", response.json())
    return items


def read_band(
    client: requests.Session, href: str, grid: Grid, quality: bool = False
) -> tuple[npt.NDArray, dict]:
    signed = signed_href(client, href)
    nodata = FMASK_NODATA if quality else REFLECTANCE_NODATA
    dtype = "uint8" if quality else "int16"
    destination = np.full((grid.height, grid.width), nodata, dtype=dtype)
    with (
        rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
            CPL_VSIL_CURL_CHUNK_SIZE="1048576",
            GDAL_HTTP_MAX_RETRY="3",
            GDAL_HTTP_RETRY_DELAY="1",
            GDAL_HTTP_TIMEOUT="60",
        ),
        rasterio.open(signed) as source,
    ):
        bounds = transform_bounds("EPSG:4326", source.crs, *BBOX, densify_pts=21)
        raw_window = from_bounds(*bounds, transform=source.transform)
        x0, y0 = math.floor(raw_window.col_off), math.floor(raw_window.row_off)
        x1 = math.ceil(raw_window.col_off + raw_window.width)
        y1 = math.ceil(raw_window.row_off + raw_window.height)
        window = Window(x0, y0, x1 - x0, y1 - y0).intersection(
            Window(0, 0, source.width, source.height)
        )
        data = source.read(1, window=window)
        source_transform = source.window_transform(window)
        reproject(
            data,
            destination,
            src_transform=source_transform,
            src_crs=source.crs,
            src_nodata=nodata,
            dst_transform=grid.transform,
            dst_crs=grid.crs,
            dst_nodata=nodata,
            resampling=Resampling.nearest,
        )
        metadata = {
            "canonical_url": href,
            "retrieved_utc": utc_now(),
            "source_crs": str(source.crs),
            "source_window_transform": list(source_transform),
            "source_window": [x0, y0, int(window.width), int(window.height)],
            "source_nodata": source.nodata,
            "source_scale": source.scales[0],
            "source_offset": source.offsets[0],
        }
    destination[~grid.aoi_mask] = nodata
    return destination, metadata


def write_raster(
    path: Path,
    data: npt.NDArray,
    grid: Grid,
    nodata: float,
    names: list[str],
    scales: tuple | None = None,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if data.ndim == 2:
        data = data[np.newaxis, ...]
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        width=grid.width,
        height=grid.height,
        count=data.shape[0],
        dtype=data.dtype,
        crs=grid.crs,
        transform=grid.transform,
        nodata=nodata,
        compress="deflate",
        tiled=True,
        blockxsize=256,
        blockysize=256,
    ) as target:
        target.write(data)
        target.descriptions = tuple(names)
        if scales:
            target.scales = scales
        target.update_tags(study_region="Pergamino study rectangle; not a real farmer field")


def process_month(
    month: str,
    candidates: list[dict],
    output: Path,
    grid: Grid,
    max_candidates: int,
    rgb_month: str,
) -> dict:
    record_path = output / "hls" / month / "scene.json"
    if record_path.exists():
        record = json.loads(record_path.read_text(encoding="utf-8"))
        if month == rgb_month and not (record_path.parent / "rgb_reflectance_dn.tif").exists():
            item = next(item for item in candidates if item["id"] == record["scene_id"])
            with rasterio.open(record_path.parent / "reflectance_dn.tif") as source:
                red = source.read(1)
            record["bands"].extend(write_rgb(session(), item, red, record_path.parent, grid))
            path = record_path.parent / "rgb_reflectance_dn.tif"
            record["files"].append(
                {
                    "path": path.relative_to(output).as_posix(),
                    "sha256": sha256(path),
                    "bytes": path.stat().st_size,
                }
            )
            write_json(record_path, record)
        return record
    base = {
        "month": month,
        "campaign": campaign_for_month(month),
        "available_scene_count": len(candidates),
    }
    if not candidates:
        return {
            **base,
            "status": "missing",
            "provenance": "missing",
            "reason": "No scenes in public mirror for month",
        }
    ranked = sorted(
        candidates,
        key=lambda item: (
            item["properties"].get("eo:cloud_cover", 100),
            abs(int(item["properties"]["datetime"][8:10]) - 15),
            item["id"],
        ),
    )
    best, attempts = None, []
    client = session()
    for item in ranked[:max_candidates]:
        nir_band = "B8A" if item["collection"] == "hls2-s30" else "B05"
        try:
            red, red_metadata = read_band(client, item["assets"]["B04"]["href"], grid)
            nir, nir_metadata = read_band(client, item["assets"][nir_band]["href"], grid)
            fmask, qa_metadata = read_band(client, item["assets"]["Fmask"]["href"], grid, True)
            ndvi, valid = calculate_ndvi(red, nir, fmask, grid.aoi_mask)
            fraction = float(valid.sum() / grid.aoi_mask.sum())
            attempts.append({"scene_id": item["id"], "valid_fraction": fraction, "status": "read"})
            if best is None or fraction > best[0]:
                best = (
                    fraction,
                    item,
                    red,
                    nir,
                    fmask,
                    ndvi,
                    valid,
                    [red_metadata, nir_metadata, qa_metadata],
                )
            if fraction >= 0.70:
                break
        except (
            requests.RequestException,
            rasterio.errors.RasterioError,
            ValueError,
        ) as error:
            attempts.append(
                {
                    "scene_id": item["id"],
                    "status": "failed",
                    "reason": safe_error(error),
                }
            )
    if best is None:
        return {
            **base,
            "status": "download_failed",
            "provenance": "missing",
            "attempts": attempts,
        }
    fraction, item, red, nir, fmask, ndvi, valid, bands = best
    folder = record_path.parent
    write_raster(
        folder / "reflectance_dn.tif",
        np.stack([red, nir]),
        grid,
        REFLECTANCE_NODATA,
        ["red_dn", "nir_dn"],
        (SCALE, SCALE),
    )
    write_raster(folder / "fmask.tif", fmask, grid, FMASK_NODATA, ["HLS_Fmask"])
    reflectance = np.stack([red, nir]).astype(np.float32) * SCALE
    reflectance[:, ~valid] = np.nan
    write_raster(
        folder / "reflectance_masked.tif",
        reflectance,
        grid,
        np.nan,
        ["red_reflectance", "nir_reflectance"],
    )
    write_raster(folder / "ndvi.tif", ndvi, grid, np.nan, ["NDVI"])
    validity = valid.astype(np.uint8)
    validity[~grid.aoi_mask] = 255
    write_raster(
        folder / "valid_mask.tif",
        validity,
        grid,
        255,
        ["valid_1_invalid_0_outside_255"],
    )
    values = ndvi[valid]
    quality_valid = (fmask != 255) & grid.aoi_mask
    if month == rgb_month:
        bands.extend(write_rgb(client, item, red, folder, grid))
    record = {
        **base,
        "status": "retrieved" if fraction >= 0.70 else "low_coverage",
        "provenance": "observed",
        "retrieved_utc": utc_now(),
        "scene_id": item["id"],
        "acquired_utc": item["properties"]["datetime"],
        "collection": item["collection"],
        "tile_cloud_cover_percent": item["properties"].get("eo:cloud_cover"),
        "valid_fraction": fraction,
        "valid_pixel_count": int(valid.sum()),
        "aoi_pixel_count": int(grid.aoi_mask.sum()),
        "ndvi_mean": float(values.mean()) if values.size else None,
        "ndvi_median": float(np.median(values)) if values.size else None,
        "ndvi_p10": float(np.quantile(values, 0.1)) if values.size else None,
        "ndvi_p90": float(np.quantile(values, 0.9)) if values.size else None,
        "high_aerosol_fraction_of_valid": float((((fmask >> 6) == 3) & valid).sum() / valid.sum())
        if valid.any()
        else None,
        "fmask_water_fraction_of_nonfill": float(
            ((fmask & 32 != 0) & quality_valid).sum() / quality_valid.sum()
        )
        if quality_valid.any()
        else None,
        "attempts": attempts,
        "bands": bands,
        "files": [
            {
                "path": str(path.relative_to(output)).replace("\\", "/"),
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
            for path in sorted(folder.glob("*.tif"))
        ],
    }
    write_json(record_path, record)
    return record


def write_rgb(
    client: requests.Session, item: dict, red: npt.NDArray, folder: Path, grid: Grid
) -> list[dict]:
    rgb_assets, metadata_rows = [red], []
    for band in ("B03", "B02"):
        color, metadata = read_band(client, item["assets"][band]["href"], grid)
        rgb_assets.append(color)
        metadata_rows.append(metadata)
    write_raster(
        folder / "rgb_reflectance_dn.tif",
        np.stack(rgb_assets),
        grid,
        REFLECTANCE_NODATA,
        ["red_dn", "green_dn", "blue_dn"],
        (SCALE, SCALE, SCALE),
    )
    return metadata_rows


def opera_catalog(output: Path, end: date) -> dict:
    client = session()
    entries = []
    requests_log = []
    page = 1
    while True:
        params = {
            "short_name": "OPERA_L3_DSWX-HLS_V1",
            "point": f"{POINT[0]},{POINT[1]}",
            "page_size": 1000,
            "page_num": page,
            "sort_key": "-start_date",
            "temporal": f"2016-01-01T00:00:00Z,{end.isoformat()}T23:59:59Z",
        }
        response = client.get(CMR, params=params, timeout=120)
        response.raise_for_status()
        payload = response.json()
        retrieved = utc_now()
        write_json(
            output / "opera" / f"cmr_page_{page:03d}.json",
            {
                "retrieved_utc": retrieved,
                "request_url": response.url,
                "response": payload,
            },
        )
        requests_log.append(
            {
                "url": response.url,
                "retrieved_utc": retrieved,
                "cmr_hits": response.headers.get("CMR-Hits"),
            }
        )
        batch = payload["feed"]["entry"]
        entries.extend(batch)
        if len(batch) < 1000:
            break
        page += 1
    rows = []
    for entry in entries:
        urls = [
            link["href"] for link in entry.get("links", []) if link["href"].startswith("https://")
        ]
        rows.append(
            {
                "granule_id": entry["id"],
                "scene_id": entry["title"],
                "acquired_utc": entry["time_start"],
                "cloud_cover_percent": entry.get("cloud_cover"),
                "water_url": next((url for url in urls if url.endswith("_B01_WTR.tif")), None),
                "confidence_url": next(
                    (url for url in urls if url.endswith("_B03_CONF.tif")), None
                ),
            }
        )
    write_csv(output / "opera" / "granules.csv", rows)
    monthly_coverage = []
    for month in month_range(date(2016, 1, 1), end):
        month_rows = [row for row in rows if row["acquired_utc"].startswith(month)]
        monthly_coverage.append(
            {
                "month": month,
                "catalog_granule_count": len(month_rows),
                "first_catalog_observation_utc": min(
                    (row["acquired_utc"] for row in month_rows), default=None
                ),
                "last_catalog_observation_utc": max(
                    (row["acquired_utc"] for row in month_rows), default=None
                ),
                "provenance": "retrieved",
                "pixel_data_in_catalog": False,
            }
        )
    write_csv(output / "opera" / "monthly_catalog_coverage.csv", monthly_coverage)
    credentials = {
        "earthdata_environment_present": any(
            bool(os.environ.get(name))
            for name in [
                "EARTHDATA_TOKEN",
                "EARTHDATA_USERNAME",
                "EARTHDATA_PASSWORD",
                "EARTHDATA_LOGIN",
                "EARTHACCESS_TOKEN",
            ]
        ),
        "netrc_file_present": any((Path.home() / name).exists() for name in [".netrc", "_netrc"]),
        "credential_values_read": False,
    }
    attempts = []
    for row in rows[:1]:
        response = client.get(
            row["water_url"],
            headers={"Range": "bytes=0-1023"},
            timeout=60,
            allow_redirects=False,
            stream=True,
        )
        location = response.headers.get("Location", "")
        attempts.append(
            {
                "canonical_url": row["water_url"],
                "retrieved_utc": utc_now(),
                "http_status": response.status_code,
                "redirect_host": urlsplit(location).hostname,
                "redirect_path": urlsplit(location).path,
                "content_type": response.headers.get("Content-Type"),
            }
        )
        response.close()
    if not rows:
        access_status = "catalog_empty"
        access_reason = "CMR returned no intersecting granules for the requested period."
    elif (
        attempts[0]["http_status"] in {301, 302, 303, 307, 308}
        and attempts[0]["redirect_host"] == "urs.earthdata.nasa.gov"
    ):
        access_status = "authentication_required"
        access_reason = (
            "Public CMR metadata is accessible. Protected PO.DAAC water TIFF redirects "
            "to Earthdata Login; no credentials read or authentication attempted."
        )
    else:
        access_status = "download_not_completed"
        access_reason = (
            "The public download probe did not return the expected Earthdata redirect. "
            "Inspect its recorded HTTP status before interpreting pixel availability."
        )
    result = {
        "provenance": "retrieved",
        "pixel_provenance": "missing",
        "status": access_status,
        "granule_count": len(rows),
        "requested_period": ["2016-01-01", end.isoformat()],
        "catalog_first_observation_utc": min((row["acquired_utc"] for row in rows), default=None),
        "catalog_last_observation_utc": max((row["acquired_utc"] for row in rows), default=None),
        "months_without_catalog_granules": [
            row["month"] for row in monthly_coverage if not row["catalog_granule_count"]
        ],
        "requests": requests_log,
        "public_download_attempts": attempts,
        "credential_availability": credentials,
        "reason": access_reason,
        "ready_download_route": (
            "Authenticate to Earthdata as the data owner's account, then download "
            "water_url and confidence_url from granules.csv using earthaccess or "
            "podaac-data-subscriber. No jobs were submitted."
        ),
        "limitations": [
            "No DSWx pixels downloaded, so no water area or recurrence estimates are available.",
            "Surface-water extent cannot measure saturated soil hidden under a dense canopy.",
            (
                "CMR query intersects the center point; tile metadata covers the study "
                "rectangle but pixel coverage has not been verified."
            ),
        ],
    }
    access_path = output / "opera" / "access_status.json"
    if access_path.exists():
        access_path = output / "opera" / "latest_public_access_probe.json"
    write_json(access_path, result)
    return result


def write_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        return
    fields = list(dict.fromkeys(key for row in rows for key in row))
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[3] / "data/pergamino",
    )
    parser.add_argument("--end-date", type=date.fromisoformat, default=datetime.now(UTC).date())
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--max-candidates", type=int, default=3)
    parser.add_argument("--only-month", help="Run a single month for a smoke check")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    output = args.output_dir / "satellite"
    output.mkdir(parents=True, exist_ok=True)
    started = utc_now()
    grid = make_grid()
    items = hls_catalog(output, args.end_date)
    months = month_range(date(2020, 6, 1), args.end_date)
    if args.only_month:
        months = [args.only_month]
    grouped = {month: [] for month in months}
    for item in items:
        month = item["properties"]["datetime"][:7]
        if month in grouped:
            grouped[month].append(item)
    LOGGER.info("Catalog: %s HLS scenes; sampling %s months", len(items), len(months))
    rgb_month = max(
        (
            month
            for month in months
            if any(item["properties"].get("eo:cloud_cover", 100) <= 10 for item in grouped[month])
        ),
        default="",
    )
    records = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(
                process_month,
                month,
                grouped[month],
                output,
                grid,
                args.max_candidates,
                rgb_month,
            ): month
            for month in reversed(months)
        }
        for future in as_completed(futures):
            record = future.result()
            records.append(record)
            LOGGER.info(
                "%s %s valid=%s",
                record["month"],
                record["status"],
                record.get("valid_fraction"),
            )
    records.sort(key=lambda record: record["month"])
    summary = [
        {key: value for key, value in record.items() if key not in {"bands", "attempts", "files"}}
        for record in records
    ]
    write_csv(output / "hls_monthly_summary.csv", summary)
    write_json(output / "hls_monthly_records.json", records)
    opera = opera_catalog(output, args.end_date)
    authenticated_path = output / "opera" / "authenticated_manifest.json"
    if authenticated_path.exists():
        authenticated = json.loads(authenticated_path.read_text(encoding="utf-8"))
        opera = {
            "status": authenticated["status"],
            "provenance": authenticated["provenance"],
            "pixel_provenance": authenticated["pixel_provenance"],
            "granule_count": opera["granule_count"],
            "months_with_rasters": authenticated["months_with_rasters"],
            "months_with_valid_region_pixels": authenticated["months_with_valid_region_pixels"],
            "months_with_valid_primary_field_pixels": authenticated[
                "months_with_valid_primary_field_pixels"
            ],
            "authenticated_manifest": "opera/authenticated_manifest.json",
            "historical_public_access_probe": "opera/access_status.json",
        }
    manifest = {
        "schema_version": "1.0",
        "started_utc": started,
        "completed_utc": utc_now(),
        "scope": "Pergamino study rectangle, not a real farmer field or validated crop label set",
        "bbox_wgs84": list(BBOX),
        "center_wgs84": list(POINT),
        "grid": {
            "crs": grid.crs,
            "transform": list(grid.transform),
            "width": grid.width,
            "height": grid.height,
            "resolution_m": 30,
            "aoi_pixel_count": int(grid.aoi_mask.sum()),
        },
        "hls": {
            "provenance": "observed",
            "catalog_scene_count": len(items),
            "sampled_month_count": len(months),
            "retrieved_month_count": sum(
                record["status"] in {"retrieved", "low_coverage"} for record in records
            ),
            "missing_months": [
                record["month"]
                for record in records
                if record["status"] not in {"retrieved", "low_coverage"}
            ],
            "low_coverage_months": [
                record["month"] for record in records if record["status"] == "low_coverage"
            ],
            "months_without_valid_ndvi": [
                record["month"] for record in records if not record.get("valid_pixel_count")
            ],
            "selection": (
                "Rank by whole-tile cloud percentage, then distance to day 15. Read up "
                "to max_candidates; accept first >=70% valid AOI or retain best tested "
                "scene. This is a monthly representative scene, not a monthly composite."
            ),
            "max_candidates": args.max_candidates,
            "reflectance_scale": SCALE,
            "reflectance_nodata": REFLECTANCE_NODATA,
            "fmask_nodata": FMASK_NODATA,
            "masked_fmask_bits": [1, 2, 3, 4],
            "aerosol_policy": (
                "High aerosol retained; fraction reported. "
                "Water flag retained; not interpreted as DSWx."
            ),
            "ndvi_policy": (
                "(NIR-red)/(NIR+red), positive finite red/NIR only; "
                "all invalid values NaN; no temporal interpolation"
            ),
            "sources": [
                "https://doi.org/10.5067/HLS/HLSS30.002",
                "https://doi.org/10.5067/HLS/HLSL30.002",
                f"{STAC}/collections/hls2-s30",
                f"{STAC}/collections/hls2-l30",
                "https://lpdaac.usgs.gov/documents/1698/HLS_User_Guide_V2.pdf",
                "https://github.com/nasa/HLS-Data-Resources/blob/main/r/HLS_Tutorial.Rmd",
            ],
            "limitations": [
                (
                    "NDVI is observed spectral greenness, not bare soil, crop identity, "
                    "biomass, or a yield label."
                ),
                (
                    "Region includes multiple land uses; no agricultural mask or "
                    "farmer-validated field geometry applied."
                ),
                "A single sampled date can miss within-month vegetation events and flood episodes.",
                (
                    "Early S30 imagery has larger geolocation uncertainty than "
                    "post-August-2021 imagery."
                ),
                "No optical data were fabricated or gap-filled. Current month may be incomplete.",
                (
                    "Only red/NIR/QA and RGB overviews are delivered; "
                    "this is not a full multispectral training cube."
                ),
            ],
        },
        "opera": opera,
        "files": [
            {
                "path": str(path.relative_to(output)).replace("\\", "/"),
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
            for path in sorted(output.rglob("*"))
            if path.is_file() and path.name != "manifest.json" and path.suffix != ".log"
        ],
    }
    write_json(output / "manifest.json", manifest)
    LOGGER.info(
        "Complete: %s monthly scenes; %s OPERA metadata records",
        manifest["hls"]["retrieved_month_count"],
        opera["granule_count"],
    )


if __name__ == "__main__":
    main()
