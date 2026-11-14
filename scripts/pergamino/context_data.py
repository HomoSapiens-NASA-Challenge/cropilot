"""Acquire public regional context for Pergamino; never infer farm treatments."""

from __future__ import annotations

import argparse
import calendar
import csv
import hashlib
import io
import json
import logging
import math
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from threading import Lock
from urllib.parse import urlencode

import requests

Json = None | bool | int | float | str | list["Json"] | dict[str, "Json"]
Record = dict[str, Json]
ROOT = Path(__file__).resolve().parents[2]
LOGGER = logging.getLogger(__name__)
POINT = {"longitude": -60.57, "latitude": -33.9}
POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
ONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
ONI_DOC_URL = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/"
MAGYP_URL = (
    "https://datos.magyp.gob.ar/dataset/9e1e77ba-267e-4eaa-a59f-3296e86b5f36/"
    "resource/95d066e6-8a0f-4a80-b59d-6f28f88eacd5/download/"
    "estimaciones-agricolas-2026-03.csv"
)
SOIL_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
SEASONS = [
    "DJF",
    "JFM",
    "FMA",
    "MAM",
    "AMJ",
    "MJJ",
    "JJA",
    "JAS",
    "ASO",
    "SON",
    "OND",
    "NDJ",
]
DEPTHS = ["0-5cm", "5-15cm", "15-30cm", "30-60cm", "60-100cm", "100-200cm"]
SOIL_PROPERTIES = ["clay", "sand", "silt", "soc", "bdod", "cec", "phh2o"]
WATER_PROPERTIES = ["wv0010", "wv0033", "wv1500"]
QUANTILES = ["mean", "Q0.05", "Q0.5", "Q0.95"]
SOIL_POINTS = [
    ("center", -60.57, -33.9),
    ("demo_field", -60.641511529655496, -33.94611035488771),
    ("southwest", -60.62, -33.94),
    ("southeast", -60.52, -33.94),
    ("northwest", -60.62, -33.86),
    ("northeast", -60.52, -33.86),
]
POWER_COLUMNS = {
    "T2M_MIN": "temperature_min_c",
    "T2M_MAX": "temperature_max_c",
    "T2M": "temperature_mean_c",
    "PRECTOTCORR": "precip_mm_day",
    "RH2M": "relative_humidity_pct",
    "WS2M": "wind_speed_2m_m_s",
    "ALLSKY_SFC_SW_DWN": "solar_radiation_mj_m2_day",
    "GWETROOT": "root_zone_wetness_fraction",
}
POWER_UNITS = {
    "T2M_MIN": "C",
    "T2M_MAX": "C",
    "T2M": "C",
    "PRECTOTCORR": "mm/day",
    "RH2M": "%",
    "WS2M": "m/s",
    "ALLSKY_SFC_SW_DWN": "MJ/m^2/day",
    "GWETROOT": "1",
}
SIMULATOR_PARAMETERS = [
    "PRECTOTCORR",
    "T2M",
    "T2M_MAX",
    "T2M_MIN",
    "ALLSKY_SFC_SW_DWN",
    "RH2M",
    "WS2M",
]
YIELD_FIELDS = [
    "cultivo",
    "anio",
    "campania",
    "provincia",
    "provincia_id",
    "departamento",
    "departamento_id",
    "superficie_sembrada_ha",
    "superficie_cosechada_ha",
    "produccion_tm",
    "rendimiento_kgxha",
]


def as_record(value: object) -> Record:
    if not isinstance(value, dict):
        raise TypeError(f"Expected a JSON object, got {type(value).__name__}")
    return value


def as_list(value: object) -> list[Json]:
    if not isinstance(value, list):
        raise TypeError("Expected a JSON array")
    return value


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )


def write_csv(path: Path, rows: list[Record]) -> None:
    if not rows:
        raise ValueError(f"No records for {path.name}")
    with path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def number(value: Json, fill_value: Json = None) -> tuple[float | None, str]:
    if value is None or value == "":
        return None, "missing"
    if fill_value is not None and value == fill_value:
        return None, "provider_fill"
    if isinstance(value, bool):
        raise TypeError("Boolean is not a measurement")
    if not isinstance(value, (int, float, str)):
        raise TypeError("Expected a numeric measurement")
    result = float(value)
    if not math.isfinite(result):
        return None, "nonfinite"
    return result, "valid"


def dates_between(start: date, end: date) -> list[str]:
    return [
        (start + timedelta(days=offset)).strftime("%Y%m%d")
        for offset in range((end - start).days + 1)
    ]


class Fetcher:
    """Cache bytes together with their actual retrieval time and checked hash."""

    def __init__(self, directory: Path, refresh: bool = False) -> None:
        self.directory = directory
        self.refresh = refresh
        self.sources: list[Record] = []
        self.last_soil_request = 0.0
        self.request_lock = Lock()
        self.failure_lock = Lock()
        self.directory.mkdir(parents=True, exist_ok=True)

    def fetch(
        self,
        source_id: str,
        url: str,
        filename: str,
        timeout: int = 120,
        attempts: int = 3,
    ) -> bytes:
        path = self.directory / filename
        sidecar = path.with_suffix(path.suffix + ".source.json")
        if path.exists() and sidecar.exists() and not self.refresh:
            record = as_record(json.loads(sidecar.read_text(encoding="utf-8")))
            raw = path.read_bytes()
            if record.get("request_url") != url or record.get("sha256") != digest(raw):
                raise ValueError(f"Cache URL/hash mismatch: {path}")
            record["cache_used"] = True
            self.sources.append(record)
            return raw
        error: Exception | None = None
        for attempt in range(attempts):
            if url.startswith(SOIL_URL):
                with self.request_lock:
                    wait = max(0.0, 13.0 - (time.monotonic() - self.last_soil_request))
                    time.sleep(wait)
                    self.last_soil_request = time.monotonic()
            try:
                response = requests.get(
                    url,
                    timeout=(20, timeout),
                    headers={"User-Agent": "Cropilot-research/0.1"},
                )
                response.raise_for_status()
                raw = response.content
                if not raw:
                    raise ValueError("Empty provider response")
                record = {
                    "source_id": source_id,
                    "request_url": url,
                    "response_url": response.url,
                    "retrieved_utc": utc_now(),
                    "sha256": digest(raw),
                    "bytes": len(raw),
                    "http_status": response.status_code,
                    "content_type": response.headers.get("Content-Type"),
                    "last_modified": response.headers.get("Last-Modified"),
                    "etag": response.headers.get("ETag"),
                    "file": str(Path("raw") / filename).replace("\\", "/"),
                    "cache_used": False,
                }
                temporary = path.with_suffix(path.suffix + ".part")
                temporary.write_bytes(raw)
                temporary.replace(path)
                write_json(sidecar, record)
                self.sources.append(record)
                LOGGER.info("Retrieved %s (%s bytes)", source_id, len(raw))
                return raw
            except (requests.RequestException, ValueError) as failure:
                error = failure
                failure_record: Record = {
                    "source_id": source_id,
                    "request_url": url,
                    "failed_utc": utc_now(),
                    "attempt": attempt + 1,
                    "error_type": type(failure).__name__,
                    "error": str(failure),
                    "provider_null": False,
                }
                if isinstance(failure, requests.HTTPError) and failure.response is not None:
                    failure_record["http_status"] = failure.response.status_code
                with (
                    self.failure_lock,
                    (self.directory / "failed_attempts.jsonl").open(
                        "a", encoding="utf-8"
                    ) as stream,
                ):
                    stream.write(json.dumps(failure_record, ensure_ascii=False) + "\n")
                LOGGER.warning("%s attempt %s failed: %s", source_id, attempt + 1, failure)
                if attempt < attempts - 1:
                    time.sleep(3 * (attempt + 1))
        raise RuntimeError(f"Acquisition failed for {source_id}: {error}") from error


def power_rows(payloads: list[Record], end: date) -> tuple[list[Record], Record, Record]:
    series: dict[str, Record] = {name: {} for name in POWER_COLUMNS}
    metadata: Record = {}
    source_dates: dict[str, str] = {}
    headers: list[Json] = []
    for index, payload in enumerate(payloads):
        header = as_record(payload["header"])
        if header.get("time_standard") != "UTC":
            raise ValueError("POWER input must explicitly use UTC daily windows")
        headers.append(header)
        parameters = as_record(as_record(payload["properties"])["parameter"])
        units = as_record(payload["parameters"])
        for name, values in parameters.items():
            if name not in series:
                raise ValueError(f"Unexpected POWER parameter {name}")
            parameter_meta = as_record(units[name])
            if parameter_meta.get("units") != POWER_UNITS[name]:
                raise ValueError(f"Unverified POWER units: {name} {parameter_meta}")
            metadata[name] = parameter_meta
            for day, value in as_record(values).items():
                if day in series[name]:
                    raise ValueError(f"Duplicate POWER date: {name} {day}")
                cleaned, flag = number(value, header["fill_value"])
                series[name][day] = {"value": cleaned, "flag": flag}
                source_dates[day] = f"power_{index + 1}"
    rows: list[Record] = []
    for day in dates_between(date(1981, 1, 1), end):
        row: Record = {
            "date": datetime.strptime(day, "%Y%m%d").date().isoformat(),
            "time_standard": "UTC",
            "longitude": POINT["longitude"],
            "latitude": POINT["latitude"],
            "source_id": source_dates.get(day),
            "provenance": "retrieved",
        }
        for parameter, column in POWER_COLUMNS.items():
            default_flag = (
                "not_requested_before_1984"
                if parameter == "ALLSKY_SFC_SW_DWN" and day < "19840101"
                else "missing"
            )
            value = as_record(series[parameter].get(day, {"value": None, "flag": default_flag}))
            row[column] = value["value"]
            row[column + "_flag"] = value["flag"]
        rows.append(row)
    statistics: Record = {}
    for parameter, column in POWER_COLUMNS.items():
        valid = [row for row in rows if row[column] is not None]
        statistics[parameter] = {
            "column": column,
            "units": POWER_UNITS[parameter],
            "valid_count": len(valid),
            "first_valid_date": valid[0]["date"] if valid else None,
            "last_valid_date": valid[-1]["date"] if valid else None,
            "flags": dict(Counter(str(row[column + "_flag"]) for row in rows)),
            "minimum": min(float(str(row[column])) for row in valid) if valid else None,
            "maximum": max(float(str(row[column])) for row in valid) if valid else None,
        }
    return rows, statistics, {"parameters": metadata, "source_headers": headers}


def simulator_payload(payloads: list[Record]) -> Record:
    expected_dates = dates_between(date(1984, 1, 1), date(2025, 12, 31))
    merged: dict[str, Record] = {name: {} for name in SIMULATOR_PARAMETERS}
    metadata: Record = {}
    headers: list[Json] = []
    source_geometry: Json = None
    for payload in payloads:
        header = as_record(payload["header"])
        if header["time_standard"] != "UTC":
            raise ValueError("Cannot combine different POWER daily time standards")
        parameters = as_record(as_record(payload["properties"])["parameter"])
        if str(header["start"]) > "20251231" or str(header["end"]) < "19840101":
            continue
        if source_geometry is not None and source_geometry != payload["geometry"]:
            raise ValueError("POWER geometries differ")
        source_geometry = payload["geometry"]
        headers.append(header)
        for name in SIMULATOR_PARAMETERS:
            metadata[name] = as_record(payload["parameters"])[name]
            for day, raw in as_record(parameters[name]).items():
                if "19840101" <= day <= "20251231":
                    value, flag = number(raw, header["fill_value"])
                    if flag != "valid" or day in merged[name]:
                        raise ValueError(f"Incomplete/duplicate simulator weather: {name} {day}")
                    merged[name][day] = value
    for name, values in merged.items():
        if sorted(values) != expected_dates:
            raise ValueError(f"Simulator weather missing dates for {name}")
    combined_header = dict(as_record(headers[0]))
    combined_header.update({"start": "19840101", "end": "20251231", "time_standard": "UTC"})
    return {
        "type": "Feature",
        "geometry": source_geometry,
        "header": combined_header,
        "properties": {"parameter": merged},
        "parameters": metadata,
        "messages": [],
        "provenance": "retrieved",
        "derivation": {
            "operation": (
                "Concatenated provider UTC date windows; selected exactly seven parameters;"
                " no imputation or unit conversion."
            ),
            "source_headers": headers,
            "not_raw_provider_response": True,
            "existing_simulator_difference": (
                "Existing inputs use default LST and latitude -33.89; this file uses UTC "
                "and latitude -33.9. Do not overwrite them silently."
            ),
        },
    }


def acquire_power(fetcher: Fetcher, directory: Path, end: date) -> Record:
    windows = [
        ("19810101", "19831231"),
        ("19840101", "19931231"),
        ("19940101", "20031231"),
        ("20040101", "20131231"),
        ("20140101", "20231231"),
        ("20240101", "20251231"),
        ("20260101", end.strftime("%Y%m%d")),
    ]
    payloads: list[Record] = []
    for index, (start, stop) in enumerate(windows):
        parameters = list(POWER_COLUMNS)
        if start < "19840101":
            parameters.remove("ALLSKY_SFC_SW_DWN")
        query = urlencode(
            {
                "parameters": ",".join(parameters),
                "community": "AG",
                **POINT,
                "start": start,
                "end": stop,
                "format": "JSON",
                "time-standard": "UTC",
            }
        )
        raw = fetcher.fetch(
            f"power_{index + 1}",
            POWER_URL + "?" + query,
            f"power_{start}_{stop}_UTC.json",
        )
        payloads.append(as_record(json.loads(raw)))
    rows, statistics, metadata = power_rows(payloads, end)
    write_csv(directory / "power_daily.csv", rows)
    write_json(directory / "power_metadata.json", metadata)
    simulator = simulator_payload(payloads)
    simulator["derivation"] = {
        **as_record(simulator["derivation"]),
        "sources": [
            source for source in fetcher.sources if str(source["source_id"]).startswith("power_")
        ],
    }
    write_json(directory / "simulator_power_1984_2025.json", simulator)
    return {
        "status": "acquired",
        "rows": len(rows),
        "duplicate_dates": 0,
        "requested_start": "1981-01-01",
        "requested_end": end.isoformat(),
        "time_standard": "UTC",
        "parameters": statistics,
        "schema": list(rows[0]),
        "simulator_rows_per_parameter": len(dates_between(date(1984, 1, 1), date(2025, 12, 31))),
        "spatial_support": (
            "NASA source grid regional context, not a weather station or farm measurement."
        ),
        "limitations": [
            "UTC daily windows differ from local solar days (LST) and Argentina civil days.",
            (
                "GWETROOT is modeled root-zone relative wetness (fraction), not "
                "plant-available water in mm or a field moisture sensor."
            ),
            (
                "Recent parameter availability can differ; fill values are null with "
                "explicit flags, never zero."
            ),
            "Solar radiation was not requested before 1984; AG radiation is already MJ/m2/day.",
            "This is historical/recent regional context, not a forecast or a causal yield model.",
        ],
    }


def season_bounds(year: int, season: str) -> tuple[date, date]:
    middle_month = SEASONS.index(season) + 1
    first = date(year - 1, 12, 1) if middle_month == 1 else date(year, middle_month - 1, 1)
    end_year, end_month = (year + 1, 1) if middle_month == 12 else (year, middle_month + 1)
    last = date(end_year, end_month, calendar.monthrange(end_year, end_month)[1])
    return first, last


def oni_rows(raw: bytes) -> list[Record]:
    lines = raw.decode("utf-8-sig").splitlines()
    if lines[0].split() != ["SEAS", "YR", "TOTAL", "ANOM"]:
        raise ValueError("Unexpected ONI schema")
    rows: list[Record] = []
    seen: set[tuple[str, int]] = set()
    for line in lines[1:]:
        if not line.strip():
            continue
        season, year_text, total_text, anomaly_text = line.split()
        year = int(year_text)
        if (season, year) in seen:
            raise ValueError("Duplicate ONI season/year")
        seen.add((season, year))
        start, end = season_bounds(year, season)
        total, total_flag = number(total_text, "-99.99")
        anomaly, anomaly_flag = number(anomaly_text, "-99.99")
        rows.append(
            {
                "season": season,
                "year": year,
                "season_start": start.isoformat(),
                "season_end": end.isoformat(),
                "sst_c": total,
                "oni_anomaly_c": anomaly,
                "sst_flag": total_flag,
                "anomaly_flag": anomaly_flag,
                "cannot_be_known_before": (end + timedelta(days=1)).isoformat(),
                "actual_release_date": None,
                "historical_vintage_available": False,
                "source_id": "noaa_oni_ascii",
                "provenance": "retrieved",
            }
        )
    return rows


def acquire_oni(fetcher: Fetcher, directory: Path) -> Record:
    raw = fetcher.fetch("noaa_oni_ascii", ONI_URL, "oni.ascii.txt")
    documentation = fetcher.fetch(
        "noaa_oni_current_documentation", ONI_DOC_URL, "oni_current_documentation.html"
    )
    if "ERSSTv6" not in documentation.decode("utf-8", errors="replace"):
        raise ValueError(
            "NOAA current ONI documentation no longer identifies ERSSTv6; review version"
        )
    rows = oni_rows(raw)
    write_csv(directory / "oni_seasons.csv", rows)
    return {
        "status": "acquired",
        "rows": len(rows),
        "duplicate_season_year": 0,
        "missing_sst_rows": sum(row["sst_c"] is None for row in rows),
        "missing_anomaly_rows": sum(row["oni_anomaly_c"] is None for row in rows),
        "schema": list(rows[0]),
        "first": rows[0],
        "latest": rows[-1],
        "index": "ONI (not RONI)",
        "current_documentation_product": "ERSSTv6",
        "ascii_embedded_version": None,
        "limitations": [
            (
                "ASCII file has no embedded version; current official ONI page identifies "
                "ERSSTv6. Both files are retained."
            ),
            (
                "Revised historical ONI is not an archive of the values published at "
                "historical decision dates."
            ),
            (
                "JAS includes September and cannot be available at the end of August; "
                "season end is only a lower availability bound."
            ),
            (
                "Actual historical release dates are unknown here; no leakage-free "
                "historical vintage claim is made."
            ),
            (
                "Current NOAA documentation says RONI is used for official ENSO monitoring "
                "and prediction; this dataset is ONI."
            ),
            (
                "Recent ONI values are estimates and can be revised. No ENSO episode is "
                "assigned from a single season."
            ),
        ],
    }


def yield_rows(raw: bytes, department_id: str = "06623") -> tuple[list[Record], Record]:
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    if reader.fieldnames != YIELD_FIELDS:
        raise ValueError(f"Unexpected MAGyP schema: {reader.fieldnames}")
    rows: list[Record] = []
    national_count = 0
    for original in reader:
        national_count += 1
        if original["departamento_id"].zfill(5) != department_id:
            continue
        row: Record = dict(original)
        row["departamento_id"] = original["departamento_id"].zfill(5)
        row["provincia_id"] = original["provincia_id"].zfill(2)
        row["anio"] = int(original["anio"])
        for field in YIELD_FIELDS[7:]:
            value, flag = number(original[field])
            if value is not None and value < 0:
                raise ValueError(f"Negative MAGyP measurement: {field}")
            row[field] = value
            row[field + "_flag"] = flag
        harvest = row["superficie_cosechada_ha"]
        planted = row["superficie_sembrada_ha"]
        production = row["produccion_tm"]
        row["zero_harvest"] = harvest == 0 if harvest is not None else None
        row["zero_harvest_positive_production"] = (
            harvest == 0 and isinstance(production, (int, float)) and production > 0
            if harvest is not None and production is not None
            else None
        )
        row["planted_but_zero_harvest"] = (
            harvest == 0 and isinstance(planted, (float, int)) and planted > 0
            if harvest is not None and planted is not None
            else None
        )
        row["yield_usable_as_harvested_area_average"] = (
            isinstance(harvest, (int, float))
            and harvest > 0
            and row["rendimiento_kgxha"] is not None
        )
        row["source_id"] = "magyp_2026_03"
        row["provenance"] = "retrieved"
        rows.append(row)
    if not rows:
        raise ValueError("Pergamino department not present in MAGyP response")
    key_counts = Counter(
        (row["cultivo"], row["campania"], row["provincia_id"], row["departamento_id"])
        for row in rows
    )
    summary: Record = {
        "status": "acquired",
        "national_rows": national_count,
        "rows": len(rows),
        "schema": list(rows[0]),
        "department_id": department_id,
        "department_names": sorted({str(row["departamento"]) for row in rows}),
        "first_campaign": min(str(row["campania"]) for row in rows),
        "last_campaign": max(str(row["campania"]) for row in rows),
        "crop_counts": dict(Counter(str(row["cultivo"]) for row in rows)),
        "duplicate_keys": sum(count - 1 for count in key_counts.values()),
        "zero_harvest_rows": sum(row["zero_harvest"] is True for row in rows),
        "planted_but_zero_harvest_rows": sum(
            row["planted_but_zero_harvest"] is True for row in rows
        ),
        "zero_harvest_positive_production_rows": sum(
            row["zero_harvest_positive_production"] is True for row in rows
        ),
        "missing_counts": {
            field: sum(row[field] is None for row in rows) for field in YIELD_FIELDS[7:]
        },
        "limitations": [
            (
                "All crop categories are retained; totals and first/second-crop or other "
                "subcategories overlap and must not be added as independent observations."
            ),
            (
                "Zero harvest is retained and distinct from missing; its cause is not "
                "documented in this table."
            ),
            (
                "Some zero-harvest-area rows have positive production; zero area must not "
                "automatically be interpreted as crop failure."
            ),
            "Department aggregates are not field yields or crop-rotation treatment trajectories.",
            (
                "No profits, causal drought attribution, farm recommendations or training "
                "are computed."
            ),
        ],
    }
    return rows, summary


def acquire_yields(fetcher: Fetcher, directory: Path) -> Record:
    raw = fetcher.fetch("magyp_2026_03", MAGYP_URL, "estimaciones-agricolas-2026-03.csv")
    rows, summary = yield_rows(raw)
    write_csv(directory / "magyp_pergamino_all_crops.csv", rows)
    write_json(directory / "magyp_pergamino_all_crops.json", rows)
    return summary


def soil_rows(payload: Record, point_id: str, longitude: float, latitude: float) -> list[Record]:
    rows: list[Record] = []
    for layer_value in as_list(as_record(payload["properties"])["layers"]):
        layer = as_record(layer_value)
        units = as_record(layer["unit_measure"])
        divisor, divisor_flag = number(units["d_factor"])
        if divisor_flag != "valid" or divisor is None or divisor <= 0:
            raise ValueError(f"Invalid SoilGrids conversion metadata: {units}")
        for depth_value in as_list(layer["depths"]):
            depth = as_record(depth_value)
            bounds = as_record(depth["range"])
            if bounds.get("unit_depth") != "cm":
                raise ValueError("SoilGrids depth units must be explicitly centimeters")
            for statistic, raw in as_record(depth["values"]).items():
                native, flag = number(raw)
                rows.append(
                    {
                        "point_id": point_id,
                        "longitude": longitude,
                        "latitude": latitude,
                        "property": layer["name"],
                        "depth_label": depth["label"],
                        "depth_top_cm": bounds["top_depth"],
                        "depth_bottom_cm": bounds["bottom_depth"],
                        "statistic": statistic,
                        "native_value": native,
                        "native_unit": units["mapped_units"],
                        "conversion_divisor": divisor,
                        "value": native / divisor if native is not None else None,
                        "unit": units["target_units"],
                        "quality_flag": flag,
                        "provenance": "modeled" if native is not None else "missing",
                        "source_id": "soilgrids_" + point_id,
                    }
                )
    return rows


def acquire_soils(fetcher: Fetcher, directory: Path) -> Record:
    rows: list[Record] = []
    errors: list[Json] = []
    requested = SOIL_PROPERTIES + WATER_PROPERTIES

    def acquire_point(
        point: tuple[str, float, float],
    ) -> tuple[list[Record], list[Json]]:
        point_id, longitude, latitude = point
        point_rows: list[Record] = []
        point_errors: list[Json] = []
        cached_full = fetcher.directory / f"soilgrids_{point_id}.json"
        groups = (
            [("", requested)]
            if cached_full.exists() and not fetcher.refresh
            else [
                ("texture", ["clay", "sand", "silt"]),
                ("chemical_physical", ["soc", "bdod", "cec", "phh2o"]),
                ("water", WATER_PROPERTIES),
            ]
        )
        for group_name, properties in groups:
            source_id = "soilgrids_" + point_id + ("_" + group_name if group_name else "")
            query = urlencode(
                {
                    "lon": longitude,
                    "lat": latitude,
                    "property": properties,
                    "depth": DEPTHS,
                    "value": QUANTILES,
                },
                doseq=True,
            )
            try:
                raw = fetcher.fetch(
                    source_id,
                    SOIL_URL + "?" + query,
                    source_id + ".json",
                    timeout=90,
                    attempts=2,
                )
                payload = as_record(json.loads(raw))
                if as_record(payload["geometry"])["coordinates"] != [
                    longitude,
                    latitude,
                ]:
                    raise ValueError(
                        "SoilGrids response coordinates differ from the requested point"
                    )
                group_rows = soil_rows(payload, point_id, longitude, latitude)
                for row in group_rows:
                    row["source_id"] = source_id
                    row["spatial_support"] = (
                        (
                            "Modeled point inside an exploratory mapped field; not "
                            "whole-field measurement"
                        )
                        if point_id == "demo_field"
                        else "Regional modeled soil point; not farm measurement"
                    )
                point_rows.extend(group_rows)
            except (RuntimeError, TypeError, ValueError, KeyError) as error:
                point_errors.append(
                    {
                        "point_id": point_id,
                        "longitude": longitude,
                        "latitude": latitude,
                        "property_group": group_name,
                        "requested_properties": properties,
                        "source_id": source_id,
                        "error": str(error),
                        "provider_null": False,
                    }
                )
                LOGGER.error("SoilGrids %s unavailable: %s", source_id, error)
        write_json(
            directory / f"soilgrids_point_{point_id}.json",
            {
                "point_id": point_id,
                "longitude": longitude,
                "latitude": latitude,
                "mapped_field_id": "268949" if point_id == "demo_field" else None,
                "scope": "Modeled soil point; not a current or whole-field measurement",
                "rows": point_rows,
                "errors": point_errors,
            },
        )
        LOGGER.info(
            "Completed soil point %s: %s records; %s failed groups",
            point_id,
            len(point_rows),
            len(point_errors),
        )
        return point_rows, point_errors

    with ThreadPoolExecutor(max_workers=2) as executor:
        for point_rows, point_errors in executor.map(acquire_point, SOIL_POINTS):
            rows.extend(point_rows)
            errors.extend(point_errors)
    if rows:
        write_csv(directory / "soilgrids_profile.csv", rows)
        write_json(directory / "soilgrids_profile.json", rows)
    counts = Counter(
        (row["point_id"], row["property"], row["depth_label"], row["statistic"]) for row in rows
    )
    return {
        "status": "partial" if errors else "acquired",
        "rows": len(rows),
        "errors": errors,
        "schema": list(rows[0]) if rows else [],
        "duplicate_keys": sum(count - 1 for count in counts.values()),
        "requested_properties": requested,
        "requested_depths": DEPTHS,
        "requested_statistics": QUANTILES,
        "points": [
            {
                "point_id": point_id,
                "longitude": longitude,
                "latitude": latitude,
                "returned_rows": sum(row["point_id"] == point_id for row in rows),
                "nonmissing_rows": sum(
                    row["point_id"] == point_id and row["value"] is not None for row in rows
                ),
            }
            for point_id, longitude, latitude in SOIL_POINTS
        ],
        "units": {
            str(row["property"]): {
                "native_unit": row["native_unit"],
                "unit": row["unit"],
                "conversion_divisor": row["conversion_divisor"],
            }
            for row in rows
        },
        "missing_value_rows": sum(row["value"] is None for row in rows),
        "expected_rows": len(SOIL_POINTS) * len(requested) * len(DEPTHS) * len(QUANTILES),
        "missing_combinations": [
            {
                "point_id": point_id,
                "property": name,
                "depth_label": depth,
                "statistic": statistic,
            }
            for point_id, _, _ in SOIL_POINTS
            for name in requested
            for depth in DEPTHS
            for statistic in QUANTILES
            if (point_id, name, depth, statistic) not in counts
        ],
        "limitations": [
            (
                "250m global model predictions are regional context, not current farm soil "
                "measurements."
            ),
            (
                "Center and four fixed regional points were selected before viewing soil "
                "values; a sixth point is the separately selected mapped demo field 268949."
                " Missing center values remain missing."
            ),
            (
                "Returned quantiles describe the source model's predicted distribution, not"
                " empirically validated local confidence bounds."
            ),
            (
                "No pedotransfer, plant-available water, storage, carbon stock or farm "
                "calibration is inferred."
            ),
            (
                "Water-retention values are used only if returned by the documented "
                "provider, with its own unit/divisor metadata."
            ),
            (
                "The provider's beta REST service has no uptime guarantee; documentation "
                "currently warns of temporary service issues."
            ),
        ],
        "references": [
            "https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html",
            "https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_04.html",
            "https://doi.org/10.5194/soil-7-217-2021",
            "https://doi.org/10.1016/j.iswcr.2022.08.001",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=ROOT.parent / "data/pergamino")
    parser.add_argument(
        "--end-date",
        type=date.fromisoformat,
        default=datetime.now(UTC).date() - timedelta(days=1),
    )
    parser.add_argument(
        "--datasets",
        nargs="+",
        choices=["power", "oni", "magyp", "soilgrids"],
        default=["power", "oni", "magyp", "soilgrids"],
    )
    parser.add_argument("--refresh", action="store_true")
    arguments = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if arguments.end_date < date(2026, 1, 1) or arguments.end_date >= datetime.now(UTC).date():
        parser.error("--end-date must be in 2026 or later and before the current UTC day")
    directory = arguments.output_dir.resolve() / "context"
    directory.mkdir(parents=True, exist_ok=True)
    fetcher = Fetcher(directory / "raw", arguments.refresh)
    manifest_path = directory / "quality_manifest.json"
    manifest: Record = (
        as_record(json.loads(manifest_path.read_text(encoding="utf-8")))
        if manifest_path.exists()
        else {}
    )
    manifest.update(
        {
            "schema_version": 1,
            "run_started_utc": utc_now(),
            "location": {**POINT, "crs": "EPSG:4326"},
            "scope": (
                "Pergamino regional pre-diagnostic plus a modeled point inside exploratory "
                "mapped field 268949; no confirmed farm management, training or "
                "agronomic/economic recommendations."
            ),
            "aoi_bbox_west_south_east_north": [-60.67, -34.0, -60.47, -33.8],
        }
    )
    datasets = as_record(manifest.get("datasets", {}))
    previous_sources = as_list(manifest.get("sources", []))
    failed = False
    for name in arguments.datasets:
        try:
            if name == "power":
                result = acquire_power(fetcher, directory, arguments.end_date)
            elif name == "oni":
                result = acquire_oni(fetcher, directory)
            elif name == "magyp":
                result = acquire_yields(fetcher, directory)
            else:
                result = acquire_soils(fetcher, directory)
            datasets[name] = result
            failed = failed or result["status"] != "acquired"
            LOGGER.info("Completed %s: %s rows", name, result["rows"])
        except (
            requests.RequestException,
            RuntimeError,
            TypeError,
            ValueError,
            KeyError,
            OSError,
        ) as error:
            failed = True
            datasets[name] = {"status": "failed", "error": str(error)}
            LOGGER.exception("Failed dataset %s", name)
        manifest["datasets"] = datasets
        source_map = {str(as_record(source)["source_id"]): source for source in previous_sources}
        source_map.update({str(source["source_id"]): source for source in fetcher.sources})
        manifest["sources"] = list(source_map.values())
        failure_records: list[Json] = []
        previous_failures = directory / "raw" / "prior_failed_attempts.json"
        if previous_failures.exists():
            failure_records.extend(
                as_list(json.loads(previous_failures.read_text(encoding="utf-8")))
            )
        failures_path = directory / "raw" / "failed_attempts.jsonl"
        if failures_path.exists():
            failure_records.extend(
                json.loads(line)
                for line in failures_path.read_text(encoding="utf-8").splitlines()
                if line.strip()
            )
        manifest["failed_acquisition_attempts"] = failure_records
        manifest["updated_utc"] = utc_now()
        outputs: list[Json] = []
        for path in sorted(directory.iterdir()):
            if path.is_file() and path.name != manifest_path.name:
                raw = path.read_bytes()
                outputs.append({"file": path.name, "bytes": len(raw), "sha256": digest(raw)})
        manifest["outputs"] = outputs
        write_json(manifest_path, manifest)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
