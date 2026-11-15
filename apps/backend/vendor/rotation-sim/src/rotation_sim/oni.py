"""NOAA Oceanic Niño Index, read as "what was known when the decision was taken".

Team convention (research/sintesis.md in the hub): the June 1 decision sees the
February-April value and the end-of-August decision sees the July-September value.

Two declared limits:
- July-September is published in early October, so the August decision sees about one month
  of ocean data that a farmer would not have yet. Pass ``august_season="MJJ"`` to the
  environment for the value that was strictly published by then.
- The NOAA file holds revised values, not the ones issued at each date.
"""

from __future__ import annotations

from pathlib import Path

SEASONS = ("DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ")
JUNE_SEASON = "FMA"
AUGUST_SEASON = "JAS"


class Oni:
    def __init__(self, anomalies: dict[tuple[str, int], float]) -> None:
        self._anomalies = anomalies

    @classmethod
    def from_file(cls, path: str | Path) -> Oni:
        """Parse NOAA's oni.ascii.txt: columns SEAS, YR, TOTAL, ANOM."""
        anomalies: dict[tuple[str, int], float] = {}
        lines = Path(path).read_text(encoding="ascii").splitlines()
        if lines[0].split() != ["SEAS", "YR", "TOTAL", "ANOM"]:
            raise ValueError(f"Unexpected ONI header: {lines[0]!r}")
        for line in lines[1:]:
            if not line.strip():
                continue
            season, year, _total, anomaly = line.split()
            if season not in SEASONS:
                raise ValueError(f"Unknown ONI season {season!r}")
            anomalies[season, int(year)] = float(anomaly)
        return cls(anomalies)

    def anomaly(self, season: str, year: int) -> float:
        """ONI of a three-month season; ``year`` is the calendar year NOAA files it under."""
        try:
            return self._anomalies[season, year]
        except KeyError:
            raise KeyError(f"No ONI value for {season} {year}") from None
