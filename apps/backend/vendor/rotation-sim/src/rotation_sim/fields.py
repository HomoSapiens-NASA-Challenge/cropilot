"""A field: everything the simulator needs to know about one place.

The field carries its own soil capacity, yield anchors and climate summary, each with where it
came from, so adding fields means adding records, not code. Records are built by
``scripts/prepare_data.py`` and stored in ``data/fields.json``.

Scale caveat for anything shown to a user: the weather is a NASA POWER cell of about 55 km and
the yield anchors are department statistics. Only the soil value is local (SoilGrids, 250 m).
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import asdict, dataclass, field
from pathlib import Path

PROVENANCE = ("observed", "retrieved", "modeled", "scenario", "missing")


@dataclass(frozen=True)
class Field:
    field_id: str
    name: str
    province: str
    department: str
    department_id: str
    latitude_deg: float
    longitude_deg: float
    elevation_m: float
    calendar_band: str
    taw_mm: float
    taw_provenance: str
    aridity_index: float  # mean campaign rain / mean campaign ETo over the training years
    yield_anchor_kg_ha: Mapping[str, float]  # crop_id -> attainable yield; absent if unknown
    kind: str = "reference_point"
    sources: Mapping[str, str] = field(default_factory=dict)  # input -> dataset, period, place

    def __post_init__(self) -> None:
        if self.taw_provenance not in PROVENANCE:
            raise ValueError(f"Unknown provenance {self.taw_provenance!r} for {self.field_id}")
        if not self.taw_mm > 0:
            raise ValueError(f"Field {self.field_id} needs a positive soil water capacity")
        for crop_id, anchor in self.yield_anchor_kg_ha.items():
            if not anchor > 0:
                raise ValueError(f"Field {self.field_id} has a non-positive anchor for {crop_id}")


def save_fields(fields: list[Field], path: str | Path) -> None:
    Path(path).write_text(
        json.dumps([asdict(f) for f in fields], indent=2, ensure_ascii=False, allow_nan=False)
        + "\n",
        encoding="utf-8",
    )


def load_fields(path: str | Path) -> list[Field]:
    records = json.loads(Path(path).read_text(encoding="utf-8"))
    fields = [Field(**record) for record in records]
    ids = [f.field_id for f in fields]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate field_id in fields file")
    return fields
