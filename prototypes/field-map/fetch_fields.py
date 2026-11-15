"""Real field outlines (Fields of The World, CC BY 4.0) for a small area east of Pergamino -> fields_raw.geojson."""
import json
import duckdb
from shapely import wkb
from shapely.geometry import mapping

URL = ("https://data.source.coop/ftw/global-data/predictions/vectors/alpha/results-by-admin-conf/"
       "admin:country_code=AR/Argentina.parquet")
BOX = (-60.545, -33.905, -60.475, -33.845)
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;")
rows = con.execute(f"""
  SELECT id, "metrics:area" AS area, ST_AsWKB(geometry) AS g FROM read_parquet('{URL}')
  WHERE bbox.xmin > {BOX[0]} AND bbox.xmax < {BOX[2]} AND bbox.ymin > {BOX[1]} AND bbox.ymax < {BOX[3]}
""").fetchall()
feats = []
for fid, area, g in rows:
    geom = wkb.loads(bytes(g)).simplify(0.00009, preserve_topology=True)
    feats.append({"type": "Feature", "properties": {"ftw_id": str(fid), "area_m2": area}, "geometry": mapping(geom)})
json.dump({"type": "FeatureCollection", "features": feats}, open("fields_raw.geojson", "w"))
areas = sorted(f["properties"]["area_m2"] / 1e4 for f in feats)
print(len(feats), "fields; ha min/median/max", round(areas[0], 1), round(areas[len(areas)//2], 1), round(areas[-1], 1))
