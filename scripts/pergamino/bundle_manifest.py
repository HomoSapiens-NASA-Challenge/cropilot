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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--archive", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    inventory(args.output_dir, archive=args.archive)


if __name__ == "__main__":
    main()
