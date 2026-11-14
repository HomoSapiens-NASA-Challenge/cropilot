"""Select one OPERA observation per calendar month using cloud metadata, never water outcomes."""

from __future__ import annotations

import argparse
import csv
import json
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "data/pergamino"


def prepare(output_dir: Path, start_month: str = "2023-06") -> Path:
    folder = output_dir / "satellite/opera"
    with (folder / "granules.csv").open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    months: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        if row["acquired_utc"][:7] < start_month:
            continue
        months.setdefault(row["acquired_utc"][:7], []).append(row)
    selected = []
    assets = []
    for month, candidates in sorted(months.items(), reverse=True):
        choice = min(
            candidates,
            key=lambda row: (
                float(row["cloud_cover_percent"]) if row["cloud_cover_percent"] else 101.0,
                abs(int(row["acquired_utc"][8:10]) - 15),
                row["scene_id"],
            ),
        )
        selected.append({"month": month, "candidate_count": len(candidates), **choice})
        for band, key in (("water", "water_url"), ("confidence", "confidence_url")):
            if choice[key]:
                assets.append(
                    {
                        "month": month,
                        "band": band,
                        "scene_id": choice["scene_id"],
                        "url": choice[key],
                        "filename": Path(urlparse(choice[key]).path).name,
                    }
                )
    if not assets:
        raise ValueError("No downloadable OPERA assets in the retained catalog")
    path = folder / "download_plan.json"
    payload = {
        "schema_version": "pergamino-opera-download-plan-v1",
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "selection_rule": (
            "One catalog granule per calendar month: lowest whole-tile cloud-cover percentage, "
            "then closest day to the 15th, then scene ID. Metadata-only selection; no water, "
            "crop, yield or flood outcome inspected. A selected scene is not a monthly mean."
        ),
        "catalog_granule_count": len(rows),
        "sampling_start_month": start_month,
        "selected_month_count": len(selected),
        "selections": selected,
        "assets": assets,
        "authentication": (
            "Use the owner's Earthdata Login session; never store credentials in Git."
        ),
    }
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--start-month", default="2023-06")
    args = parser.parse_args()
    prepare(args.output_dir, args.start_month)


if __name__ == "__main__":
    main()
