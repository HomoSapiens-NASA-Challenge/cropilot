"""Inventory acquired diagnostic artifacts without including environments or credentials."""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import zipfile
from datetime import UTC, datetime
from pathlib import Path

LOGGER = logging.getLogger(__name__)
DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "data/pergamino"
COMPONENTS = ("crops", "context", "satellite", "fields", "docs")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inventory(output_dir: Path, *, archive: bool = False) -> Path:
    """Hash only the explicit component directories, never the adjacent virtual environment."""
    files = [
        path
        for component in COMPONENTS
        for path in sorted((output_dir / component).rglob("*"))
        if path.is_file()
        and not path.name.endswith((".tmp", ".part", ".pyc", ".log"))
        and "__pycache__" not in path.parts
    ]
    files.extend(path for path in sorted(output_dir.glob("*.md")) if path.is_file())
    manifest_path = output_dir / "bundle_manifest.json"
    payload = {
        "schema_version": "pergamino-diagnostic-bundle-v1",
        "created_at_utc": datetime.now(UTC).isoformat(),
        "study_region": {
            "name": "Pergamino study area",
            "bbox_wgs84": [-60.67, -34.0, -60.47, -33.8],
            "reference_point_wgs84": [-60.57, -33.9],
            "farmer_validated": False,
        },
        "data_location": "hub/data/pergamino (data ignored by Git; guides tracked)",
        "code_location": "cropilot/scripts/pergamino",
        "component_file_counts": {
            component: sum(path.relative_to(output_dir).parts[0] == component for path in files)
            for component in COMPONENTS
        },
        "total_files": len(files),
        "total_bytes": sum(path.stat().st_size for path in files),
        "not_a_recommendation": True,
        "not_an_rl_transition_dataset": True,
        "missing_farmer_inputs": [
            "Farmer-confirmed field boundary and historical crop/management records",
            "Sowing and harvest dates, varieties, fertilizer, irrigation and tillage records",
            "Measured soil profile, current soil water and water-table depth",
            "Field-level yield observations, costs and current rotation",
        ],
        "interpretation": [
            "Read component manifests for actual access status, periods, missingness and units.",
            "A file count or successful download does not establish agronomic validity.",
            "A surface-water catalog is not a downloaded or validated water map.",
            "Regional estimates must not be labeled as measured values of the demonstration field.",
            "Historical source data may be revised and do not prove decision-time availability.",
        ],
        "files": [
            {
                "path": path.relative_to(output_dir).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
            }
            for path in files
        ],
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    if archive:
        archive_path = output_dir / "pergamino-diagnostic-data.zip"
        with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
            bundle.write(manifest_path, manifest_path.name)
            for path in files:
                bundle.write(path, path.relative_to(output_dir).as_posix())
        LOGGER.info("Wrote %s (%s bytes)", archive_path, archive_path.stat().st_size)
    LOGGER.info("Inventoried %s data files (%s bytes)", len(files), payload["total_bytes"])
    return manifest_path


def table_subset(output_dir: Path) -> Path:
    """Package tables and small crop clips without copying bulky HLS rasters or raw catalogs."""
    full_manifest = json.loads((output_dir / "bundle_manifest.json").read_text(encoding="utf-8"))
    selected = []
    for entry in full_manifest["files"]:
        path = Path(entry["path"])
        parts = path.parts
        include = (
            path.suffix == ".md"
            or (parts[0] == "fields" and path.name != "candidates.geojson")
            or (path.parent.as_posix() == "context" and path.suffix in {".json", ".csv"})
            or (parts[0] == "crops" and "sources" not in parts)
            or (path.parent.as_posix() == "satellite" and path.suffix in {".json", ".csv"})
            or (
                path.parent.as_posix() == "satellite/opera"
                and path.suffix in {".json", ".csv"}
                and not path.name.startswith("cmr_page_")
            )
            or path.parent.as_posix() == "satellite/opera/processed"
        )
        if include:
            if sha256_file(output_dir / path) != entry["sha256"]:
                raise ValueError(f"File changed since the full inventory: {path}")
            selected.append(entry)
    payload = {
        "schema_version": "pergamino-table-subset-v1",
        "created_at_utc": datetime.now(UTC).isoformat(),
        "full_manifest_sha256": sha256_file(output_dir / "bundle_manifest.json"),
        "not_an_rl_transition_dataset": True,
        "exclusions": [
            "HLS image rasters and original STAC catalog responses",
            "Original OPERA rasters and per-scene clipped rasters",
            "Original context-provider responses and national MAGyP CSV",
            "Official crop PDF reports and source metadata; map legends are included",
            "Full 177-polygon candidate pool; the selected field and shortlist are included",
        ],
        "files": selected,
    }
    readme = (
        "# Pergamino tables and field subset\n\n"
        "This small archive contains the prepared tables, field footprints, crop clips, "
        "legends, preview and explanatory guides. It does not contain the complete "
        "satellite imagery or original provider-response archive.\n\n"
        "Extract into hub/data/pergamino/. Start with FIELD_GUIDE.md and CATALOG.md. "
        "The included guides describe the full dataset; links to omitted raw files "
        "require pergamino-diagnostic-data.zip from the same release. "
        "subset_manifest.json lists exactly what is included and excluded.\n\n"
        "For simulator input, context/simulator_power_1984_2025.json supplies seven "
        "daily variables in UTC; do not silently mix it with LST data. This is input "
        "data, not an RL transition dataset, a verified farm history or a recommendation. "
        "All source/quality limitations in the guides still apply.\n"
    )
    target = output_dir / "pergamino-tables-and-field.zip"
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        bundle.writestr("START_HERE.md", readme)
        bundle.writestr("subset_manifest.json", json.dumps(payload, indent=2) + "\n")
        for entry in selected:
            bundle.write(output_dir / entry["path"], entry["path"])
    target.with_suffix(target.suffix + ".sha256").write_text(
        f"{sha256_file(target)}  {target.name}\n", encoding="utf-8"
    )
    LOGGER.info("Wrote %s (%s files, %s bytes)", target, len(selected), target.stat().st_size)
    return target


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--archive", action="store_true")
    parser.add_argument("--tables-only", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if args.tables_only:
        table_subset(args.output_dir)
    else:
        inventory(args.output_dir, archive=args.archive)


if __name__ == "__main__":
    main()
