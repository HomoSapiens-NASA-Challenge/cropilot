"""Apply the recorded visual review to the unchanged, source-derived field shortlist."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from shapely.geometry import shape

DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "data/pergamino"
REVIEW_PATH = Path(__file__).with_name("field_review.json")


def select(output_dir: Path) -> Path:
    review = json.loads(REVIEW_PATH.read_text(encoding="utf-8"))
    fields_dir = output_dir / "fields"
    candidates = json.loads((fields_dir / "shortlist.geojson").read_text(encoding="utf-8"))
    selected = next(
        (f for f in candidates["features"] if f["id"] == review["selected_source_id"]), None
    )
    if selected is None:
        raise ValueError(
            "Reviewed field is absent from the current shortlist; repeat visual review"
        )
    geometry_bytes = json.dumps(
        selected["geometry"], sort_keys=True, separators=(",", ":")
    ).encode()
    if hashlib.sha256(geometry_bytes).hexdigest() != review["expected_geometry_sha256"]:
        raise ValueError(
            "Reviewed field geometry changed; repeat visual review before selecting it"
        )
    properties = selected["properties"]
    properties["demo_selected"] = True
    properties["label"] = "Pergamino demonstration footprint - satellite estimate"
    point = shape(selected["geometry"]).representative_point()
    properties["representative_point_wgs84"] = [point.x, point.y]
    properties["review"] = review
    path = fields_dir / "demo_field.geojson"
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": [selected]}, indent=2) + "\n",
        encoding="utf-8",
    )
    selection_path = fields_dir / "selection.json"
    selection = json.loads(selection_path.read_text(encoding="utf-8"))
    selection["visual_review"] = review
    selection["final_demo_field_id"] = selected["id"]
    selection_path.write_text(json.dumps(selection, indent=2) + "\n", encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    select(args.output_dir)


if __name__ == "__main__":
    main()
