# Field map prototype

A standalone map of one farm near Pergamino. Click a lot to see its 2025/26 crop, how green it got against the same crop in the zone, how even it grew, and the last five summers. It is a prototype for the team to review and is not wired into `apps/webapp`.

> **The UI is in Spanish.** The repo rule is English, so it needs translating before it moves into the webapp.

## Run

```bash
cd prototypes/field-map
python3 -m http.server 8765
# open http://127.0.0.1:8765  (a lot opens directly with #L05)
```

## What is real

Only the producer is made up: "Campo La Celina" is a name given to 18 real neighbouring lots. Every number per lot comes from data:

| Shown                      | Source                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lot outlines               | Fields of The World, CC BY 4.0. Near-duplicate outlines are dropped.                                                                                 |
| Crop 2025/26               | Our crop classifier on NASA HLS. INTA has not published this season.                                                                                 |
| Vigor and the season curve | NASA HLS NDVI, monthly medians, Sep 2025 to May 2026                                                                                                 |
| Status                     | Lot's highest summer NDVI vs the median of all pixels with the same crop in a 20 × 20 km box. Second-crop soy is compared only with second-crop soy. |
| Previous seasons           | INTA National Map of Crops, CC BY 4.0, 2020/21 to 2024/25                                                                                            |
| Base map                   | Esri World Imagery                                                                                                                                   |

The classifier agrees with INTA on 86% of pixels in seasons it did not see in training. It misses maize in drought years and has no double-crop class, so lots it can't place are shown as "A verificar".

## Rebuild the data

`fields.geojson` is generated. The inputs (HLS composites, INTA labels and the model output) are not in git.

```bash
python fetch_fields.py                # -> fields_raw.geojson (DuckDB over the FTW parquet)
python real_attrs.py <cv-work dir>    # -> fields.geojson
```

## AI use

Built with Claude Code. The team chose what to show. Claude wrote the code and the data scripts.
