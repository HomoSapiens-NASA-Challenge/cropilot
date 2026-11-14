"""Acquire modeled field boundaries and freeze an outcome-independent demo shortlist."""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
from datetime import UTC, datetime
from pathlib import Path

import duckdb
import requests
from pyproj import Geod, Transformer
from shapely import from_wkb
from shapely.geometry import box, mapping
from shapely.ops import transform

LOGGER = logging.getLogger(__name__)
DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "data/pergamino"
BBOX = (-60.67, -34.0, -60.47, -33.8)
RURAL_ANCHOR = (-60.63, -33.95)
SOURCE_URL = (
    "https://data.source.coop/ftw/global-data/predictions/vectors/alpha/"
    "results-by-admin-conf/admin:country_code=AR/Argentina.parquet"
)
SOURCE_README = SOURCE_URL.removesuffix(".parquet") + ".README.md"
COLLECTION_URL = "https://data.source.coop/ftw/global-data/predictions/vectors/collection.json"
QUERY = """
SELECT id, CAST("determination:datetime" AT TIME ZONE 'UTC' AS VARCHAR) || 'Z' AS source_datetime,
       "determination:method", "metrics:area", confidence, ST_AsWKB(geometry)
FROM read_parquet(?)
WHERE bbox.xmin >= ? AND bbox.xmax <= ? AND bbox.ymin >= ? AND bbox.ymax <= ?
  AND "metrics:area" BETWEEN 200000 AND 1500000
  AND confidence >= 69
  AND EXTRACT(YEAR FROM "determination:datetime" AT TIME ZONE 'UTC') = 2025
ORDER BY id
"""


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def acquire(output_dir: Path) -> Path:
    """Use geometry and source quality only, before examining crop or flood outcomes."""
    target = output_dir / "fields"
    target.mkdir(parents=True, exist_ok=True)
    retrieved_at = datetime.now(UTC).isoformat()
    for name, url in (("source_readme.md", SOURCE_README), ("collection.json", COLLECTION_URL)):
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        (target / name).write_bytes(response.content)
    (target / "selection_query.sql").write_text(QUERY, encoding="utf-8")
    connection = duckdb.connect()
    connection.execute("SET threads=4")
    connection.execute("SET TimeZone='UTC'")
    connection.execute("INSTALL httpfs")
    connection.execute("LOAD httpfs")
    connection.execute("INSTALL spatial")
    connection.execute("LOAD spatial")
    west, south, east, north = BBOX
    rows = connection.execute(QUERY, [SOURCE_URL, west, east, south, north]).fetchall()
    connection.close()
    projection = Transformer.from_crs("EPSG:4326", "EPSG:32720", always_xy=True)
    anchor_x, anchor_y = projection.transform(*RURAL_ANCHOR)
    geod = Geod(ellps="WGS84")
    study_area = box(*BBOX)
    candidates = []
    rejected = []
    for identifier, source_datetime, method, source_area_m2, confidence, geometry_wkb in rows:
        geometry = from_wkb(geometry_wkb)
        if not geometry.is_valid or geometry.is_empty or not study_area.covers(geometry):
            rejected.append({"source_id": identifier, "reason": "invalid_or_outside_study_area"})
            continue
        projected = transform(projection.transform, geometry)
        point = projected.representative_point()
        distance_m = ((point.x - anchor_x) ** 2 + (point.y - anchor_y) ** 2) ** 0.5
        area_m2 = abs(geod.geometry_area_perimeter(geometry)[0])
        candidates.append(
            {
                "type": "Feature",
                "id": identifier,
                "geometry": mapping(geometry),
                "properties": {
                    "source_id": identifier,
                    "source_datetime": source_datetime,
                    "source_method": method,
                    "source_area_m2": source_area_m2,
                    "geodesic_area_ha": area_m2 / 10000,
                    "source_confidence_0_100": confidence,
                    "distance_to_predeclared_anchor_m": distance_m,
                    "provenance": "modeled",
                    "boundary_status": "unvalidated_remote_sensing_field_unit",
                    "farmer_confirmed": False,
                    "cadastral_boundary": False,
                },
            }
        )
    candidates.sort(
        key=lambda feature: (
            feature["properties"]["distance_to_predeclared_anchor_m"],
            feature["id"],
        )
    )
    if not candidates:
        raise RuntimeError("No field candidate meets the predeclared geometric criteria")
    for rank, feature in enumerate(candidates, 1):
        feature["properties"]["geometry_selection_rank"] = rank
    write_json(target / "candidates.geojson", {"type": "FeatureCollection", "features": candidates})
    shortlist = candidates[:3]
    write_json(target / "shortlist.geojson", {"type": "FeatureCollection", "features": shortlist})
    write_json(
        target / "selection.json",
        {
            "schema_version": "pergamino-field-selection-v1",
            "retrieved_at_utc": retrieved_at,
            "source_url": SOURCE_URL,
            "source_version": (
                "FTW global map alpha, 2025 boundaries, confidence-enriched AR partition"
            ),
            "source_license": "CC-BY-4.0; see source collection metadata",
            "study_bbox_wgs84": BBOX,
            "predeclared_anchor_wgs84": RURAL_ANCHOR,
            "selection_rule": (
                "2025 source polygons fully inside study bbox; source area 20-150 ha; source "
                "confidence >=69 (source recommendation, not polygon accuracy); valid geometry; "
                "rank by distance to predeclared southwest rural anchor, then source ID. "
                "Top three await RGB visual inspection. No crop, yield, NDVI or flood outcome used."
            ),
            "source_rows": len(rows),
            "valid_candidates": len(candidates),
            "rejected": rejected,
            "shortlist_ids": [feature["id"] for feature in shortlist],
            "visual_review": "pending",
            "final_demo_field_id": None,
            "limitations": [
                "Modeled boundaries can merge or split agricultural fields; no cadastral validity.",
                "Confidence is sampled from a 500 m model reliability layer, not field accuracy.",
                "Applying a 2025 boundary to older rasters assumes a fixed study footprint, "
                "not stable management.",
                "No landowner identity, consent, management records "
                "or measured soil profile is available.",
            ],
            "artifacts": [
                {
                    "path": str(path.relative_to(output_dir)).replace("\\", "/"),
                    "bytes": path.stat().st_size,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                }
                for path in sorted(target.iterdir())
                if path.is_file() and path.name != "selection.json"
            ],
        },
    )
    LOGGER.info(
        "Acquired %s modeled field candidates; shortlist=%s", len(candidates), len(shortlist)
    )
    return target / "selection.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    acquire(args.output_dir)


if __name__ == "__main__":
    main()
