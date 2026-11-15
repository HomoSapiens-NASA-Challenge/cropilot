# Crop map by field

For every field of two 20 × 20 km demonstration zones, **Pergamino** (Buenos Aires) and **Paraná** (Entre Ríos), the backend serves what the field grew each summer from 2020/21 to 2025/26, its NASA HLS NDVI curve, its vigor against the zone's fields with the same crop that season, and the El Niño phase of each summer. The file also carries the phase of the current season (2026/27, strong El Niño by the July–September ONI), so a client can point to the past summers of the same phase. Results are precomputed; HTTP never runs a satellite model.

## Install and read

From the repository root, with authenticated GitHub CLI access to the private team repositories:

```sh
gh release download crop-map-v1 --repo HomoSapiens-NASA-Challenge/cropilot --pattern 'lots_*_en.geojson' --dir apps/backend/data/crops
```

`GET /api/crops/zones/{zone}/fields` (`zone` is `pergamino` or `parana`) returns a GeoJSON FeatureCollection. Every file is validated against [the response contract](../apps/backend/app/modules/crops/schemas.py) before it is served; a missing or invalid file returns 503. `CROP_MAP_DIR` overrides the directory (see `.env.example`).

## What one field carries

| Field                                   | Meaning                                                                                                                                                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `history[].crop`, `crop_code`, `source` | Majority summer crop of the field's interior pixels. `INTA` where the INTA National Map of Crops is published (2020/21–2024/25), `model` for 2025/26. Crops sown after a winter cereal come from INTA's winter map (`Second soybean`, `Second maize`) |
| `history[].purity`                      | Share of the field's pixels with that crop                                                                                                                                                                                                            |
| `history[].curve`, `zone_curve`         | Median NDVI by month, September to May: the field's, and the zone's pixels with the same crop that season                                                                                                                                             |
| `history[].vigor`, `zone_vigor`, `gap`  | Each interior pixel's highest NDVI of November–April, and the field's median of those peaks; the same for the zone's pixels with the field's crop; and `vigor / zone_vigor − 1`, computed before rounding to 3 decimals                               |
| `history[].lag`                         | Months between the field's NDVI peak and the zone's. Positive suggests late sowing                                                                                                                                                                    |
| `history[].even`                        | Share of the field's pixels whose peak is at least 85 % of the field's `vigor`                                                                                                                                                                        |
| `history[].phase_code`, `oni`           | ENSO phase of that summer: NOAA ONI, November–January mean, ≥ +0.5 El Niño, ≤ −0.5 La Niña                                                                                                                                                            |
| `crop`                                  | Latest crop (`history[-1].crop`), also when the status is `check` or `bare`                                                                                                                                                                           |
| `status_code`, `reason`                 | Latest campaign: `ok` (gap ≥ −5 %), `watch` (down to −15 %), `alert` (below), `check` (no zone reference or no recognised summer crop), `bare` (no summer vegetation)                                                                                 |
| `confidence`                            | Mean top-class probability of the model over the field, latest campaign                                                                                                                                                                               |

The 18 fields marked `own` form a made-up demonstration farm, "La Celina", and `meta.farm_is_synthetic` is always `true` to say so. It is the most compact group of fields INTA mapped as cropland in most campaigns. Every other value is computed from the sources below. Campaigns are written `25/26` everywhere in the file.

## How good the crop map is

| Zone, trained on         | Model              | 20/21 | 21/22 | 22/23 (drought) | 23/24 | 24/25 | Mean      | Maize F1 | Soybean F1 |
| ------------------------ | ------------------ | ----- | ----- | --------------- | ----- | ----- | --------- | -------- | ---------- |
| Pergamino, Pergamino     | LightGBM           | 0.862 | 0.867 | 0.751           | 0.911 | 0.886 | 0.855     | 0.67     | 0.88       |
| Pergamino, Pergamino     | U-Net              | 0.854 | 0.876 | 0.816           | 0.899 | 0.824 | 0.854     | 0.66     | 0.88       |
| **Pergamino, Pergamino** | **Blend (served)** | 0.867 | 0.877 | 0.773           | 0.911 | 0.879 | **0.862** | 0.68     | 0.89       |
| Paraná, Paraná           | LightGBM           | 0.769 | 0.778 | 0.558           | 0.742 | 0.812 | 0.732     | 0.57     | 0.73       |
| Paraná, both zones       | LightGBM           | 0.807 | 0.793 | 0.608           | 0.787 | 0.835 | 0.766     | 0.64     | 0.78       |
| **Paraná, Pergamino**    | **LightGBM**       | 0.835 | 0.775 | 0.687           | 0.816 | 0.840 | **0.791** | 0.60     | 0.80       |

Agreement with INTA, leave-one-campaign-out, every labeled pixel of the 20 × 20 km zone.

- **Paraná is mapped with the Pergamino model.** Trained on its own labels, the model over-predicts maize (43 % of pixels against INTA's 16 % in 2022/23); correcting for class frequency recovers only 0.01. Adding Paraná to Pergamino's training also lowers Pergamino to 0.820.
- **Second crops as their own classes.** Soybean sown after wheat was read as non-agricultural 20 % of the time; split off as its own training class, 10 %.
- **How early.** With imagery only up to a given month (Pergamino, LightGBM on pixel + segment): November 0.80, December 0.83, February 0.85, the same as the full season.

## Limits

- Agreement with another satellite product, not field truth. INTA's own map is about 0.89 accurate against field data.
- 2025/26 comes only from the model; earlier campaigns use INTA's map directly.
- Vigor compares a field with its neighbours under the same weather. It is not a yield estimate and has not been checked against yields.
- Field outlines are satellite-estimated (Fields of The World) and unvalidated in Argentina.

## Reproduce

The pipeline (HLS download, training, evaluation, per-field summaries) lives in the team hub, `research/crop-map/`, with pinned requirements and tests.

## Sources

- NASA Harmonized Landsat Sentinel-2 v2.0 (HLSS30, HLSL30), via Microsoft Planetary Computer.
- INTA, Mapa Nacional de Cultivos 2020/21–2024/25, summer and winter maps, Zenodo, CC BY 4.0.
- Fields of The World global field boundaries, CC BY 4.0.
- NOAA Climate Prediction Center, Oceanic Niño Index.
