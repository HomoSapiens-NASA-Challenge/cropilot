"""Crops, sowing calendar and the daily crop-coefficient schedule of one campaign.

A campaign holds at most two crops: one in the winter position and one in the summer position.
A crop's slot says where it may go:

- ``winter``: sown after the June 1 decision (wheat);
- ``summer_first``: a summer crop after a winter fallow (first soybean, maize);
- ``summer_second``: a summer crop after a winter crop (second soybean).
"""

from __future__ import annotations

import csv
import datetime as dt
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .parameters import Parameters

SLOTS = ("winter", "summer_first", "summer_second")
STAGES = ("initial", "development", "mid", "late")
WINTER_POSITION = 0
SUMMER_POSITION = 1
BARE = -1


@dataclass(frozen=True)
class Crop:
    crop_id: str
    slot: str
    stage_days: tuple[int, int, int, int]
    kc_mid: float
    kc_end: float
    depletion_fraction: float
    ky: float
    price_usd_t: float
    cost_usd_ha: float
    magyp_crop: str

    @property
    def season_days(self) -> int:
        return sum(self.stage_days)

    def kc_curve(self, kc_initial: float) -> np.ndarray:
        """FAO-56 single crop coefficient: flat, linear rise, flat, linear decline."""
        initial, development, mid, late = self.stage_days
        return np.r_[
            np.full(initial, kc_initial),
            np.linspace(kc_initial, self.kc_mid, development),
            np.full(mid, self.kc_mid),
            np.linspace(self.kc_mid, self.kc_end, late),
        ]


def load_crops(path: str | Path, params: Parameters) -> dict[str, Crop]:
    crops: dict[str, Crop] = {}
    with open(path, newline="", encoding="utf-8") as stream:
        for row in csv.DictReader(stream):
            crop_id, physiology = row["crop"], row["physiology"]
            if crop_id in crops:
                raise ValueError(f"Duplicate crop {crop_id}")
            if row["slot"] not in SLOTS:
                raise ValueError(f"Crop {crop_id} has unknown slot {row['slot']!r}")
            # FAO-56 gives a range for some end-of-season coefficients; the value picked
            # inside that range is its own declared row.
            kc_end_name = (
                "kc_end_selected" if params.has("kc_end_selected", physiology) else "kc_end"
            )
            stage_days = tuple(int(params.number(f"stage_{s}", physiology)) for s in STAGES)
            crops[crop_id] = Crop(
                crop_id=crop_id,
                slot=row["slot"],
                stage_days=stage_days,  # type: ignore[arg-type]
                kc_mid=params.number("kc_mid", physiology),
                kc_end=params.number(kc_end_name, physiology),
                depletion_fraction=params.number("depletion_fraction", physiology),
                ky=params.number("seasonal_ky", physiology),
                price_usd_t=params.number("price_october_2026", row["price_key"]),
                cost_usd_ha=params.number("cost", row["cost_key"]),
                magyp_crop=row["magyp_crop"],
            )
    return crops


@dataclass(frozen=True)
class SowingDate:
    month: int
    day: int
    status: str
    source_url: str


class Calendar:
    """Sowing dates by latitude band and crop."""

    def __init__(self, rows: dict[tuple[str, str], SowingDate]) -> None:
        self._rows = rows

    @classmethod
    def from_csv(cls, path: str | Path) -> Calendar:
        rows: dict[tuple[str, str], SowingDate] = {}
        with open(path, newline="", encoding="utf-8") as stream:
            for r in csv.DictReader(stream):
                key = (r["band"], r["crop"])
                if key in rows:
                    raise ValueError(f"Duplicate calendar row {key}")
                rows[key] = SowingDate(int(r["month"]), int(r["day"]), r["status"], r["source_url"])
        return cls(rows)

    def bands(self) -> set[str]:
        return {band for band, _ in self._rows}

    def has(self, band: str, crop_id: str) -> bool:
        return (band, crop_id) in self._rows

    def sowing(self, band: str, crop_id: str) -> SowingDate:
        try:
            return self._rows[band, crop_id]
        except KeyError:
            raise KeyError(f"No sowing date for {crop_id!r} in band {band!r}") from None

    def sowing_day(self, band: str, crop_id: str, year: int) -> int:
        """Days from June 1 of the campaign's start year to the sowing date."""
        sowing = self.sowing(band, crop_id)
        return day_index(year, sowing.month, sowing.day)


def latitude_band(latitude_deg: float) -> str:
    """Bands of the lab's national calendar. Only 30-35 degrees has sourced dates."""
    latitude = abs(latitude_deg)
    if latitude < 30:
        return "lt30"
    return "30_35" if latitude <= 35 else "gt35"


def campaign_days(year: int) -> int:
    return (dt.date(year + 1, 6, 1) - dt.date(year, 6, 1)).days


def day_index(year: int, month: int, day: int) -> int:
    """Days from June 1 of ``year`` to the given date inside campaign ``year``."""
    date = dt.date(year if month >= 6 else year + 1, month, day)
    return (date - dt.date(year, 6, 1)).days


@dataclass(frozen=True)
class Schedule:
    """Daily crop state of one campaign for one itinerary."""

    kc: np.ndarray  # crop coefficient; 0 on bare days
    position: np.ndarray  # BARE, WINTER_POSITION or SUMMER_POSITION
    depletion_fraction: np.ndarray  # FAO-56 p; 0 on bare days
    harvest_day: tuple[int | None, int | None]  # first day after each crop, by position

    @property
    def n_days(self) -> int:
        return int(self.kc.shape[0])


def build_schedule(
    year: int,
    winter: tuple[Crop, int] | None,
    summer: tuple[Crop, int] | None,
    kc_initial: float,
) -> Schedule:
    """Lay each crop's coefficient curve on the campaign from its sowing day.

    Crops may not overlap, start before June 1 or end after the following May 31: cycles are
    never shortened to make an itinerary fit.
    """
    n_days = campaign_days(year)
    kc = np.zeros(n_days)
    position = np.full(n_days, BARE, dtype=np.int8)
    depletion = np.zeros(n_days)
    harvest: list[int | None] = [None, None]
    previous_end = 0
    planted: Sequence[tuple[int, tuple[Crop, int] | None]] = (
        (WINTER_POSITION, winter),
        (SUMMER_POSITION, summer),
    )
    for slot_position, entry in planted:
        if entry is None:
            continue
        crop, sowing_day = entry
        end = sowing_day + crop.season_days
        if sowing_day < previous_end or end > n_days:
            raise ValueError(
                f"{crop.crop_id} sown on day {sowing_day} of campaign {year} overlaps the "
                f"previous crop or crosses into the next campaign (ends on day {end} of {n_days})"
            )
        kc[sowing_day:end] = crop.kc_curve(kc_initial)
        position[sowing_day:end] = slot_position
        depletion[sowing_day:end] = crop.depletion_fraction
        harvest[slot_position] = end
        previous_end = end
    for array in (kc, position, depletion):
        array.setflags(write=False)
    return Schedule(
        kc=kc, position=position, depletion_fraction=depletion, harvest_day=tuple(harvest)
    )  # type: ignore[arg-type]
