"""The field block of a case: crop-map lots (`crop-map-v1`) and Pergamino's reference footprint."""

import csv
import json
import math
from pathlib import Path
from typing import Any

from app.modules.cases.schemas import (
    Lot,
    LotCampaign,
    NdviSample,
    ReferenceCrop,
    ReferenceField,
    SoilCapacity,
)
from app.modules.crops.schemas import CampaignRecord, CropField, FieldMap, FieldProperties

LATEST_CAMPAIGN = "2025/26"
NDVI_MONTHS = [f"2025-{month:02d}" for month in range(9, 13)] + [
    f"2026-{month:02d}" for month in range(1, 6)
]
# Crop codes of the crop map that name a summer crop (fallow and non-agricultural do not).
RECOGNIZED_CROPS = {0, 1, 2, 3, 6, 7, 8}

# Labels of the INTA national crop map found at the reference footprint (all maps).
INTA_LABEL = {
    "Maiz": "Maize",
    "Maíz": "Maize",
    "Soja": "Soybean",
    "Soja 1ra": "First-crop soybean",
    "CI-Soja": "Winter crop followed by soybean",
    "Cereales de invierno": "Winter cereals",
    "Barbecho": "Fallow",
    "Ganaderia": "Livestock",
    "No Agrícola": "Non-agricultural",
    "No agrícola": "Non-agricultural",
}


def translate_inta_label(label: str) -> str:
    """INTA label -> English; an unknown label is kept and marked, never mistaken for a crop."""
    return INTA_LABEL.get(label, f"{label} (INTA label)")


def _pct(value: float) -> str:
    return f"{round(abs(value) * 100)}%"


def _noun(crop: str) -> str:
    """'Second soybean' -> 'second-crop soybean', 'Maize' -> 'maize'."""
    if crop.startswith("Second "):
        return f"second-crop {crop.removeprefix('Second ').lower()}"
    return crop[0].lower() + crop[1:]


def status_reason(lot: FieldProperties, latest: CampaignRecord) -> str:
    """English reason for the lot's status, written from its numeric fields only."""
    peak = latest.vigor
    if lot.status_code == "check" and latest.gap is None and latest.crop_code in RECOGNIZED_CROPS:
        return (
            f"Too few {_noun(latest.crop)} fields in the zone to compare with "
            f"(peak NDVI {peak:.2f})."
        )
    if lot.status_code == "check":
        return (
            "The classifier does not recognize a summer crop here, but the satellite sees green "
            f"vegetation in summer (peak NDVI {peak:.2f}). Check it in the field."
        )
    if lot.status_code == "bare":
        return (
            f"The crop map finds no summer crop here (peak NDVI {peak:.2f}): fallow, unsown or not "
            "farmland."
        )
    if latest.gap is None or latest.even is None or latest.lag is None:
        raise ValueError(f"Lot {lot.id} has status {lot.status_code} but no zone comparison")
    noun = _noun(latest.crop)
    if abs(latest.gap) < 0.01:
        text = f"Peak summer greenness equal to that of {noun} fields in the zone."
    else:
        side = "above" if latest.gap >= 0 else "below"
        text = f"Peak summer greenness {_pct(latest.gap)} {side} that of {noun} fields in the zone."
    if latest.even < 0.8:
        text += f" Only {round(latest.even * 100)}% of the lot grows evenly: there are weak areas."
    # The crop map's own lag, computed before rounding; re-deriving it from the rounded curves
    # breaks ties differently.
    lag = latest.lag
    if lag != 0:
        months = "one month" if abs(lag) == 1 else f"{abs(lag)} months"
        when = "later" if lag > 0 else "earlier"
        text += f" Its greenness peaked {months} {when} than that of the zone's {noun} fields"
        text += ": possible late sowing." if lag > 0 else "."
    if latest.purity < 0.7:
        text += (
            f" The model sees {noun} in only {round(latest.purity * 100)}% of the lot: it may "
            "hold two crops."
        )
    return text


def long_campaign(campaign: str) -> str:
    """Crop-map campaign '25/26' -> case campaign '2025/26'."""
    return f"20{campaign}"


def crop_name(record: CampaignRecord) -> str | None:
    """The crop of a campaign; null when the classifier or INTA named no class."""
    return None if record.crop_code is None else record.crop


def lot_from_crop_map(feature: CropField) -> Lot:
    """One field of the released crop map (`crop-map-v1`) as a case lot."""
    props = feature.properties
    *past, latest = props.history
    if long_campaign(latest.campaign) != LATEST_CAMPAIGN or latest.source != "model":
        raise ValueError(
            f"Lot {props.id}: the latest campaign is not the modeled {LATEST_CAMPAIGN}"
        )
    recognized = props.status_code in ("ok", "watch", "alert")
    number = int(props.id[1:])
    return Lot(
        field_id=props.id,
        name=f"Lot {number}" if props.own else f"Field {props.id}",
        area_ha=props.ha,
        is_demo_farm=props.own,
        polygon=[[list(point) for point in ring] for ring in feature.geometry.coordinates],
        latest_campaign=LATEST_CAMPAIGN,
        latest_crop=crop_name(latest),
        latest_crop_source="model",
        status=props.status_code,
        status_reason=status_reason(props, latest),
        crop_purity=latest.purity if recognized else None,
        vigor_ndvi=latest.vigor,
        vigor_gap=latest.gap,
        evenness=latest.even,
        history=[
            LotCampaign(
                campaign=long_campaign(record.campaign),
                crop=crop_name(record),
                source=record.source,
            )
            for record in past
        ],
        ndvi_curve=list(latest.curve),
        zone_ndvi_curve=(
            list(latest.zone_curve) if latest.zone_curve is not None else [None] * len(NDVI_MONTHS)
        ),
    )


def read_lots(path: Path) -> tuple[list[Lot], FieldMap]:
    """Every field of one zone's crop map: the made-up farm first, then the rest of the zone."""
    field_map = FieldMap.model_validate_json(path.read_bytes())
    if long_campaign(field_map.meta.latest) != LATEST_CAMPAIGN:
        raise ValueError(f"Unexpected crop-map campaign: {field_map.meta.latest}")
    features = sorted(
        field_map.features, key=lambda feature: (not feature.properties.own, feature.properties.id)
    )
    return [lot_from_crop_map(feature) for feature in features], field_map


# Reference footprint -------------------------------------------------------------------------

# Two outlines are the same field when their centroids are within about 50 m and their areas
# within 5%.
SAME_CENTER_DEG = 0.0005
SAME_AREA = 0.05


def _center(polygon: list[list[list[float]]]) -> tuple[float, float]:
    """Area centroid of the outer ring (shoelace), in degrees; independent of vertex density."""
    ring = polygon[0]
    area = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1], strict=True):
        cross = x0 * y1 - x1 * y0
        area += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    return cx / (3 * area), cy / (3 * area)


def lot_of_reference(reference: ReferenceField, lots: list[Lot]) -> Lot | None:
    """The lot whose outline is the reference footprint (the nearest match), if the map has it."""
    x, y = _center(reference.polygon)
    matches = []
    for lot in lots:
        lx, ly = _center(lot.polygon)
        distance = math.hypot(lx - x, ly - y)
        if distance < SAME_CENTER_DEG and abs(lot.area_ha / reference.area_ha - 1) < SAME_AREA:
            matches.append((distance, lot.field_id, lot))
    return min(matches)[2] if matches else None


def _majority(rows: list[dict[str, str]]) -> dict[str, str]:
    return max(rows, key=lambda row: int(row["pixel_count"]))


def _short_campaign(label: str) -> str:
    """'2018/2019' -> '2018/19'."""
    return f"{label[:5]}{label[7:]}"


def read_crop_history(path: Path, field_id: str) -> list[ReferenceCrop]:
    """Majority INTA class of the footprint in each map, with its share of the footprint pixels."""
    by_map: dict[str, list[dict[str, str]]] = {}
    with path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["field_id"] == field_id:
                by_map.setdefault(row["map_id"], []).append(row)
    out = []
    for rows in by_map.values():
        top = _majority(rows)
        out.append(
            ReferenceCrop(
                campaign=_short_campaign(top["campaign"]),
                season=top["season"],
                crop=translate_inta_label(top["label_original"]),
                fraction_of_field=round(float(top["fraction_of_field_pixels"]), 3),
            )
        )
    season_order = {"annual": 0, "winter": 1, "summer": 2}
    return sorted(out, key=lambda crop: (crop.campaign, season_order[crop.season]))


def read_ndvi(path: Path, field_id: str) -> list[NdviSample]:
    out = []
    with path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["field_id"] != field_id:
                continue
            mean = float(row["ndvi_mean"]) if row["ndvi_mean"] else None
            out.append(
                NdviSample(
                    month=row["month"],
                    ndvi_mean=None if mean is None or math.isnan(mean) else round(mean, 3),
                    valid_fraction=round(float(row["valid_ndvi_fraction"]), 3),
                )
            )
    return sorted(out, key=lambda sample: sample.month)


def summer_sequence(history: list[ReferenceCrop], campaigns: list[str]) -> list[str]:
    """The summer crop of each campaign, in order; a campaign with no summer map stops the build."""
    by_campaign = {crop.campaign: crop.crop for crop in history if crop.season == "summer"}
    return [by_campaign[campaign] for campaign in campaigns]


def read_reference_field(
    package: Path, soil_capacity: list[SoilCapacity]
) -> tuple[ReferenceField, dict[str, Any]]:
    """The footprint 268949 of the Pergamino package, with its INTA history and HLS NDVI."""
    feature = json.loads((package / "fields/demo_field.geojson").read_text(encoding="utf-8"))
    feature = feature["features"][0]
    props = feature["properties"]
    field_id = str(props["source_id"])
    rings = [
        [[round(lon, 5), round(lat, 5)] for lon, lat in ring]
        for ring in feature["geometry"]["coordinates"]
    ]
    field = ReferenceField(
        field_id=field_id,
        area_ha=round(props["geodesic_area_ha"], 2),
        polygon=rings,
        crop_history=read_crop_history(package / "fields/crop_diagnostics.csv", field_id),
        ndvi=read_ndvi(package / "fields/vegetation_diagnostics.csv", field_id),
        soil_capacity=soil_capacity,
        note=(
            "Satellite-estimated outline from Fields of The World (source confidence "
            f"{props['source_confidence_0_100']:.1f} of 100, a source recommendation and not "
            "polygon accuracy). It is not cadastral, no farmer has confirmed it and the crop "
            "sequence is not the farmer's. The water scenarios ran on this footprint."
        ),
    )
    return field, props
