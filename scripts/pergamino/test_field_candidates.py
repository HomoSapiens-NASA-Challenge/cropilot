"""Regression checks for UTC source years and geometric selection filters."""

from pathlib import Path

import duckdb
from field_candidates import BBOX, QUERY


def test_source_year_is_utc_even_in_argentina_timezone(tmp_path: Path) -> None:
    connection = duckdb.connect()
    connection.execute("LOAD spatial")
    connection.execute("SET TimeZone='America/Argentina/Buenos_Aires'")
    connection.execute(
        """
        CREATE TABLE candidates AS
        SELECT id, instant::TIMESTAMPTZ AS "determination:datetime",
               'auto-imagery' AS "determination:method", area AS "metrics:area",
               confidence,
               ST_GeomFromText('POLYGON((-60.64 -33.96,-60.63 -33.96,
                 -60.63 -33.95,-60.64 -33.95,-60.64 -33.96))') AS geometry,
               {'xmin': -60.64, 'xmax': -60.63, 'ymin': -33.96, 'ymax': -33.95} AS bbox
        FROM (VALUES
          ('utc_2025', '2025-01-01 00:00:00+00', 1000000, 80),
          ('utc_2024', '2024-01-01 00:00:00+00', 1000000, 80),
          ('low_confidence', '2025-01-01 00:00:00+00', 1000000, 20),
          ('too_small', '2025-01-01 00:00:00+00', 1000, 80)
        ) AS records(id, instant, area, confidence)
        """
    )
    path = tmp_path / "candidates.parquet"
    connection.execute("COPY candidates TO ? (FORMAT parquet)", [str(path)])
    west, south, east, north = BBOX
    result = connection.execute(QUERY, [str(path), west, east, south, north]).fetchall()
    connection.close()
    assert len(result) == 1
    assert result[0][0] == "utc_2025"
    assert result[0][1].startswith("2025-01-01")
    assert result[0][1].endswith("Z")
