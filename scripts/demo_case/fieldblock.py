"""The field block of the Pergamino case: crop-map lots (prototype) and the reference footprint."""

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

LATEST_CAMPAIGN = "2025/26"
NDVI_MONTHS = [f"2025-{month:02d}" for month in range(9, 13)] + [
    f"2026-{month:02d}" for month in range(1, 6)
]
EARTH_RADIUS_M = 6_371_008.8
# Months of the summer window (November to April) inside the September-to-May curves.
SUMMER = slice(2, 8)
MONTH_NAMES = [
    "September",
    "October",
    "November",
    "December",
    "January",
    "February",
    "March",
    "April",
    "May",
]

# Prototype crop labels (Spanish) and the INTA history labels of the prototype.
PROTOTYPE_CROP = {
    "Maíz": "Maize",
    "Soja": "Soybean",
    "Soja de 2da": "Second soybean",
    "Girasol": "Sunflower",
    "Sorgo": "Sorghum",
    "Barbecho": "Fallow",
    "No agrícola": "Non-agricultural",
    "Otro cultivo": "Other crop",
}
# Labels that mean "no crop to name" rather than a crop.
NO_CROP = {"A verificar", "Sin cultivo", "Sin dato"}
PROTOTYPE_STATUS = {
    "Bien": "ok",
    "Atención": "watch",
    "Alerta": "alert",
    "A verificar": "check",
    "Sin cultivo": "bare",
}
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


def translate_prototype_crop(label: str) -> str | None:
    """Spanish prototype label -> English crop; null when the lot has no nameable crop."""
    if label in NO_CROP:
        return None
    return PROTOTYPE_CROP[label]


def translate_inta_label(label: str) -> str:
    """INTA label -> English; an unknown label is kept and marked, never mistaken for a crop."""
    return INTA_LABEL.get(label, f"{label} (INTA label)")


def polygon_area_ha(rings: list[list[list[float]]]) -> float:
    """Area of a small WGS84 polygon in hectares, on a local equirectangular projection.

    Exact enough for field-sized polygons (error well under 1%); the outer ring minus the holes.
    """
    lat0 = math.radians(sum(point[1] for point in rings[0]) / len(rings[0]))

    def ring_area(ring: list[list[float]]) -> float:
        xy = [
            (
                EARTH_RADIUS_M * math.radians(lon) * math.cos(lat0),
                EARTH_RADIUS_M * math.radians(lat),
            )
            for lon, lat in ring
        ]
        edges = zip(xy, xy[1:] + xy[:1], strict=True)
        twice = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in edges)
        return abs(twice) / 2

    area_m2 = ring_area(rings[0]) - sum(ring_area(hole) for hole in rings[1:])
    return area_m2 / 10_000


def _pct(value: float) -> str:
    return f"{round(abs(value) * 100)}%"


def status_reason(props: dict[str, Any]) -> str | None:
    """English reason for the status of an own lot, written only from its numeric fields.

    The Spanish `reason` of the prototype is never translated or copied.
    """
    status = PROTOTYPE_STATUS.get(props.get("status") or "")
    if status is None:
        return None
    peak = props["vigor"]
    if status == "check":
        return (
            "The classifier does not recognize maize, soybean, sunflower or sorghum here, but the "
            f"satellite sees green vegetation in summer (peak NDVI {peak:.2f}). Check it in the "
            "field."
        )
    if status == "bare":
        return (
            f"The satellite sees almost no vegetation in summer (peak NDVI {peak:.2f}): fallow or "
            "unsown."
        )
    crop = translate_prototype_crop(props["crop"])
    if crop is None:
        raise ValueError(f"Lot {props['id']} has status {status} but no crop")
    noun = (crop[0].lower() + crop[1:]) if crop != "Second soybean" else "second-crop soybean"
    gap = props["gap"]
    if abs(gap) < 0.01:
        text = f"Peak summer greenness equal to that of {noun} fields in the zone."
    else:
        side = "above" if gap >= 0 else "below"
        text = f"Peak summer greenness {_pct(gap)} {side} that of {noun} fields in the zone."
    if props["even"] < 0.8:
        even = round(props["even"] * 100)
        text += f" Only {even}% of the lot grows evenly: there are weak areas."
    curve, zone = props["curve"][SUMMER], props["zone"][SUMMER]
    lag = curve.index(max(curve)) - zone.index(max(zone))
    if lag != 0:
        month = MONTH_NAMES[2 + curve.index(max(curve))]
        months = "one month" if abs(lag) == 1 else f"{abs(lag)} months"
        when = "later" if lag > 0 else "earlier"
        text += f" It peaked in {month}, {months} {when} than the zone"
        text += ": possible late sowing." if lag > 0 else "."
    if props["purity"] < 0.7:
        seen = "soybean" if crop == "Second soybean" else noun
        text += (
            f" The model sees {seen} in only {round(props['purity'] * 100)}% of the lot: it may "
            "hold two crops."
        )
    return text


def own_lot(feature: dict[str, Any], history_labels: list[str]) -> Lot:
    """A lot of the made-up demonstration farm, with its attributes."""
    props = feature["properties"]
    status = PROTOTYPE_STATUS.get(props["status"])
    crop = translate_prototype_crop(props["crop"])
    recognized = status in ("ok", "watch", "alert")
    history = [
        LotCampaign(campaign=campaign, crop=translate_prototype_crop(label), source="INTA")
        for campaign, label in zip(history_labels, reversed(props["history"]), strict=True)
    ]
    return Lot(
        field_id=props["id"],
        name=props["name"].replace("Lote", "Lot"),
        area_ha=props["ha"],
        is_demo_farm=True,
        polygon=feature["geometry"]["coordinates"],
        latest_campaign=LATEST_CAMPAIGN,
        latest_crop=crop,
        latest_crop_source="model",
        status=status,
        status_reason=status_reason(props),
        crop_purity=props["purity"] if recognized else None,
        vigor_ndvi=props["vigor"],
        vigor_gap=props["gap"],
        evenness=props["even"],
        history=history,
        ndvi_curve=props["curve"],
        zone_ndvi_curve=props["zone"] if props["zone"] is not None else [None] * len(NDVI_MONTHS),
    )


def context_lot(feature: dict[str, Any]) -> Lot:
    """An outline of the 20 x 20 km zone that carries no attributes (only the area is computed)."""
    props = feature["properties"]
    rings = feature["geometry"]["coordinates"]
    return Lot(
        field_id=props["id"],
        name=f"Field {props['id']}",
        area_ha=round(polygon_area_ha(rings), 1),
        is_demo_farm=False,
        polygon=rings,
        latest_campaign=LATEST_CAMPAIGN,
        latest_crop=None,
        latest_crop_source="model",
        status=None,
        status_reason=None,
        crop_purity=None,
        vigor_ndvi=None,
        vigor_gap=None,
        evenness=None,
        history=[],
        ndvi_curve=[None] * len(NDVI_MONTHS),
        zone_ndvi_curve=[None] * len(NDVI_MONTHS),
    )


def history_campaigns(meta: dict[str, Any]) -> list[str]:
    """Prototype history labels ('24/25', newest first) -> campaigns oldest first ('2020/21')."""
    return [f"20{label[:2]}/{label[3:]}" for label in reversed(meta["history"])]


def read_lots(path: Path) -> tuple[list[Lot], dict[str, Any]]:
    """All lots of the prototype crop map: the made-up farm, then the outlines without data."""
    collection = json.loads(path.read_text(encoding="utf-8"))
    meta = collection["meta"]
    if meta["campaign"] != LATEST_CAMPAIGN:
        raise ValueError(f"Unexpected prototype campaign: {meta['campaign']}")
    campaigns = history_campaigns(meta)
    features = collection["features"]
    own = [feature for feature in features if feature["properties"]["own"]]
    others = [feature for feature in features if not feature["properties"]["own"]]
    lots = [own_lot(feature, campaigns) for feature in own]
    lots += [context_lot(feature) for feature in others]
    return lots, meta


# Reference footprint -------------------------------------------------------------------------


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
