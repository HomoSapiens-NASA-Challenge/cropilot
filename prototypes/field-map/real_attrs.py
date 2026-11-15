"""Real per-lot attributes for the demo -> fields.geojson.

Everything shown per lot comes from data, except the producer's name:
- crop 2025/26: majority of the winning model's map (agents/spatial/pred_2025-26.npy) inside the lot;
- vigor: NASA HLS NDVI, monthly medians Sep..May of campaign 2025/26 (data/pergamino_2025-26.npz);
- status: the lot's highest summer NDVI vs the median of every pixel the model labels with the same crop in
  the 20 x 20 km box (same season, same weather); second-crop soy is compared only with second-crop soy;
- uniformity: share of the lot that reaches 85 % of the lot's own median vigor;
- history: INTA National Map of Crops, majority inside the lot, 2020/21..2024/25.

The producer ("La Celina") is made up: it owns the most compact group of OWN_LOTS real Fields of The World
outlines that INTA mapped as cropland. Run next to fields_raw.geojson (from fetch_fields.py):
    python real_attrs.py <cv-work dir>
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from rasterio.features import rasterize
from rasterio.transform import Affine
from rasterio.warp import transform_geom
from scipy.ndimage import binary_erosion

if len(sys.argv) != 2:
    sys.exit("usage: python real_attrs.py <cv-work dir>  (needs data/pergamino_*.npz and agents/spatial/pred_2025-26.npy)")
CV = Path(sys.argv[1])
FARM = "La Celina"
OWN_LOTS = 18
CAMPAIGN = "2025-26"
HISTORY = ["2024-25", "2023-24", "2022-23", "2021-22", "2020-21"]

# Common class ids (build_dataset.CLASSES) -> Spanish names shown in the demo.
NAME = {0: "Maíz", 1: "Soja", 2: "Girasol", 3: "Sorgo", 4: "Barbecho", 5: "No agrícola", 6: "Otro cultivo"}
NO_CROP = "Sin cultivo"
UNSURE = "A verificar"
SUMMER_CROPS = ["Maíz", "Soja", "Girasol", "Sorgo"]
# Vigor = the highest monthly NDVI of the summer (Nov..Apr), so a lot sown late isn't punished for timing;
# timing gets its own note.
SUMMER = slice(2, 8)
MONTH_NAME = ["septiembre", "octubre", "noviembre", "diciembre", "enero", "febrero", "marzo", "abril", "mayo"]
# Soy sown after a winter crop (green in Sep-Oct) peaks later and lower than first-crop soy, so it is
# compared only with other second-crop soy.
WINTER_GREEN = 0.6
# Status from the gap vs the zone's median for the same crop.
OK_GAP, BAD_GAP = -0.05, -0.15

d = np.load(CV / f"data/pergamino_{CAMPAIGN}.npz")
H, W = d["y"].shape
T = Affine(*d["transform"])
ndvi = d["X"][:, 6].astype("float32")  # (9, H, W)
pred = np.load(CV / f"agents/spatial/pred_{CAMPAIGN}.npy")
inta = {c: np.load(CV / f"data/pergamino_{c}.npz")["y"] for c in HISTORY}

fc = json.load(open("fields_raw.geojson"))
feats = [f for f in fc["features"] if f["properties"]["area_m2"] >= 4e4 and f["geometry"]["type"] == "Polygon"]


def centroid(f):
    ring = f["geometry"]["coordinates"][0]
    return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)


def dist(a, b):
    return math.hypot((a[0] - b[0]) * math.cos(math.radians(a[1])), a[1] - b[1])


# Lot id raster on the HLS 30 m grid. Edge pixels mix the lot with roads and neighbours, so each lot keeps
# only its interior (one pixel eroded), unless that leaves too little.
geoms = [transform_geom("EPSG:4326", str(d["crs"]), f["geometry"]) for f in feats]
masks = [rasterize([(g, 1)], out_shape=(H, W), transform=T, fill=0, dtype="uint8").astype(bool) for g in geoms]
# Fields of The World ships near-duplicate outlines of the same field (74 pairs overlap by more than half).
# Keep the larger one of each overlapping group.
keep, taken = [], np.zeros((H, W), bool)
for i in sorted(range(len(feats)), key=lambda i: -masks[i].sum()):
    if masks[i].sum() and (masks[i] & taken).sum() / masks[i].sum() <= 0.3:
        keep.append(i)
        taken |= masks[i]
keep.sort()
print(f"dropped {len(feats) - len(keep)} duplicate outlines of {len(feats)}")
feats, masks = [feats[i] for i in keep], [masks[i] for i in keep]
lot_px = []
for m in masks:
    inner = binary_erosion(m)
    lot_px.append(inner if inner.sum() >= 20 else m)


def majority(arr, m, ignore=255):
    v = arr[m]
    v = v[v != ignore]
    if not v.size:
        return None, 0.0
    ids, n = np.unique(v, return_counts=True)
    return int(ids[n.argmax()]), float(n.max() / v.size)


# The made-up producer farms: only lots of 10 ha or more that INTA mapped as a summer crop in at least 3 of
# the 5 campaigns (so the farm isn't the quintas and pastures next to town). Among those, the most compact group.
CROP_IDS = {0, 1, 2, 3, 6}
farmland = [i for i, f in enumerate(feats) if f["properties"]["area_m2"] >= 1e5
            and sum(majority(inta[c], lot_px[i])[0] in CROP_IDS for c in HISTORY) >= 3]
cents = [centroid(f) for f in feats]
best = min(farmland, key=lambda i: sorted(dist(cents[i], cents[j]) for j in farmland)[OWN_LOTS - 1])
own = set(sorted(farmland, key=lambda j: dist(cents[best], cents[j]))[:OWN_LOTS])


def vigor(px):
    """Highest summer NDVI, per pixel (px is (9, N))."""
    return np.nanmax(px[SUMMER], axis=0)


# The zone: every pixel of the box the model labels with that crop (soy split into first and second crop).
winter = np.nanmax(ndvi[0:2], axis=0) >= WINTER_GREEN
zone_mask = {crop: pred == cid for cid, crop in NAME.items() if crop in SUMMER_CROPS}
zone_mask["Soja de 2da"] = zone_mask["Soja"] & winter
zone_mask["Soja"] = zone_mask["Soja"] & ~winter
zone_curve, zone_vigor = {}, {}
for crop, m in zone_mask.items():
    if m.sum() < 200:
        continue
    zone_curve[crop] = [round(float(v), 2) for v in np.nanmedian(ndvi[:, m], axis=1)]
    zone_vigor[crop] = float(np.nanmedian(vigor(ndvi[:, m])))


def fmt_pct(x):
    return f"{abs(round(x * 100))} %"


out = []
own_sorted = sorted(own, key=lambda i: (-cents[i][1], cents[i][0]))  # number lots north to south
for n, i in enumerate(own_sorted, start=1):
    f, m = feats[i], lot_px[i]
    cid, purity = majority(pred, m)
    crop = NAME.get(cid, NO_CROP)
    px = ndvi[:, m]
    curve = [round(float(v), 2) for v in np.nanmedian(px, axis=1)]
    if crop == "Soja" and max(curve[0:2]) >= WINTER_GREEN:
        crop = "Soja de 2da"
    history = [NAME.get(majority(inta[c], m)[0], "Sin dato") for c in HISTORY]
    p = {"id": f"L{n:02d}", "own": True, "name": f"Lote {n}", "farm": FARM,
         "ha": round(f["properties"]["area_m2"] / 1e4, 1), "curve": curve, "history": history,
         "purity": round(purity, 2), "px": int(m.sum())}
    if crop in zone_vigor:
        v = vigor(px)
        lot_v = float(np.nanmedian(v))
        gap = lot_v / zone_vigor[crop] - 1
        even = float(np.mean(v >= 0.85 * lot_v))
        status = "Bien" if gap >= OK_GAP else "Atención" if gap >= BAD_GAP else "Alerta"
        if abs(gap) < 0.01:
            reason = f"Vigor igual al de los lotes de {crop.lower()} de la zona."
        else:
            word = "por encima" if gap >= 0 else "por debajo"
            reason = f"Vigor {fmt_pct(gap)} {word} de los lotes de {crop.lower()} de la zona."
        if even < 0.8:
            reason += f" Solo el {round(even * 100)} % del lote crece parejo: hay sectores flojos."
        zc = zone_curve[crop]
        lag = int(np.argmax(curve[SUMMER])) - int(np.argmax(zc[SUMMER]))
        if abs(lag) >= 1:
            when = "después" if lag > 0 else "antes"
            n_m = "un mes" if abs(lag) == 1 else f"{abs(lag)} meses"
            reason += (f" Llegó a su máximo en {MONTH_NAME[2 + int(np.argmax(curve[SUMMER]))]}, {n_m} {when} que la zona"
                       + (": posible siembra tardía." if lag > 0 else "."))
        p.update(crop=crop, status=status, reason=reason, vigor=round(lot_v, 2), gap=round(gap, 3),
                 even=round(even, 2), zone=zone_curve[crop])
    elif max(curve[2:8]) >= 0.7:
        # Green in summer, yet the model calls it no crop: say what the curve looks like and ask to check.
        c = curve
        if max(c[0:2]) >= 0.6 and max(c[5:7]) >= 0.7 and min(c[3:5]) <= max(c[5:7]) - 0.25:
            what = "verde en invierno, baja en diciembre-enero y vuelve a crecer en verano: parece trigo seguido de soja de 2da"
        elif min(c) >= 0.5:
            what = "verde todo el año: parece pastura o alfalfa"
        else:
            what = "vegetación verde en verano"
        p.update(crop=UNSURE, status=UNSURE, vigor=round(max(c[2:8]), 2), gap=None, even=None, zone=None,
                 reason=f"El modelo no lo reconoce como maíz, soja, girasol ni sorgo, pero el satélite ve {what}. Conviene verificarlo en el campo.")
    else:
        p.update(crop=NO_CROP, status=NO_CROP, vigor=round(max(curve[2:8]), 2), gap=None, even=None, zone=None,
                 reason="El satélite casi no ve vegetación en verano: barbecho o lote sin sembrar.")
    if purity < 0.7 and crop in zone_vigor:
        p["reason"] += f" Ojo: el modelo ve {NAME[cid].lower()} solo en el {round(purity * 100)} % del lote; puede tener dos cultivos."
    out.append({"type": "Feature", "geometry": f["geometry"], "properties": p})
for i, f in enumerate(feats):
    if i not in own:
        out.append({"type": "Feature", "geometry": f["geometry"], "properties": {"id": f"N{i:03d}", "own": False}})

for f in out:  # ~1 m precision is plenty for the map and halves the file
    f["geometry"]["coordinates"] = [[[round(x, 5), round(y, 5)] for x, y in ring] for ring in f["geometry"]["coordinates"]]
meta = {"farm": FARM, "campaign": "2025/26", "history": [c[2:4] + "/" + c[-2:] for c in HISTORY], "zone": zone_curve}
json.dump({"type": "FeatureCollection", "meta": meta, "features": out}, open("fields.geojson", "w"),
          separators=(",", ":"), ensure_ascii=False)

from collections import Counter  # noqa: E402

mine = [f["properties"] for f in out if f["properties"]["own"]]
print(len(mine), "own lots,", round(sum(p["ha"] for p in mine)), "ha;", Counter(p["status"] for p in mine), Counter(p["crop"] for p in mine))
print("zone vigor:", {k: round(v, 2) for k, v in zone_vigor.items()}, "px:", {k: int(m.sum()) for k, m in zone_mask.items()})
for p in mine:
    print(p["id"], p["crop"], p["status"], p["vigor"], p["gap"], p["even"], p["purity"], p["px"], p["history"])
