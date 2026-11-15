"""Planted but not harvested area by the ENSO phase known at the end of August (MAGyP)."""

import csv
import unicodedata
from pathlib import Path

from common import campaign_label

from app.modules.cases.schemas import UnharvestedRow

PHASES = ("strong_el_nino", "el_nino", "neutral", "la_nina")
# MAGyP crop name for each crop shown. "soja total" is the one series that covers every campaign.
MAGYP_CROPS = {"Maize": "maíz", "Soybean": "soja total"}

AreaByYear = dict[int, tuple[float, float]]  # campaign start year -> (planted ha, harvested ha)


def normalize(name: str) -> str:
    """Lowercase ASCII, so 'Córdoba' matches 'Cordoba'."""
    return unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower().strip()


def read_area(path: Path, province: str, department: str) -> dict[str, AreaByYear]:
    """Planted and harvested hectares by MAGyP crop name for one department."""
    wanted = {crop: {} for crop in MAGYP_CROPS.values()}
    with path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["cultivo"] not in wanted:
                continue
            if normalize(row["provincia"]) != normalize(province):
                continue
            if normalize(row["departamento"]) != normalize(department):
                continue
            wanted[row["cultivo"]][int(row["anio"])] = (
                float(row["superficie_sembrada_ha"]),
                float(row["superficie_cosechada_ha"]),
            )
    return wanted


def unharvested_pct(planted_ha: float, harvested_ha: float) -> float | None:
    """Share of the planted area that was not harvested, in percent; null when nothing was planted.

    Zero harvested area is a real 100% loss. Harvested above planted is a data inconsistency that
    would show as a negative loss, so it stops the build instead of being clipped.
    """
    if planted_ha <= 0:
        return None
    if harvested_ha > planted_ha:
        raise ValueError(f"Harvested area {harvested_ha} is above planted area {planted_ha}")
    return 100 * (planted_ha - harvested_ha) / planted_ha


def pct_by_campaign(area: AreaByYear, years: list[int]) -> dict[int, float]:
    """Percent not harvested for each campaign start year with planted area."""
    out: dict[int, float] = {}
    for year in years:
        if year not in area:
            continue
        pct = unharvested_pct(*area[year])
        if pct is not None:
            out[year] = pct
    return out


def rows_for_crop(
    crop: str, pct: dict[int, float], phase_by_year: dict[int, str]
) -> list[UnharvestedRow]:
    """One row per ENSO phase, in a fixed order, including phases with no campaign."""
    rows = []
    for phase in PHASES:
        years = [year for year in sorted(pct) if phase_by_year[year] == phase]
        if not years:
            rows.append(
                UnharvestedRow(
                    crop=crop,
                    enso_phase=phase,
                    campaigns=0,
                    mean_pct=None,
                    max_pct=None,
                    max_campaign=None,
                )
            )
            continue
        worst = max(years, key=lambda year: pct[year])  # first year wins a tie
        rows.append(
            UnharvestedRow(
                crop=crop,
                enso_phase=phase,
                campaigns=len(years),
                mean_pct=round(sum(pct[year] for year in years) / len(years), 1),
                max_pct=round(pct[worst], 1),
                # With nothing lost in any campaign there is no campaign worth naming.
                max_campaign=campaign_label(worst) if pct[worst] > 0 else None,
            )
        )
    return rows


def build_rows(
    area_by_crop: dict[str, AreaByYear], phase_by_year: dict[int, str]
) -> tuple[list[UnharvestedRow], dict[str, dict[int, float]]]:
    """The contract rows and the percent by campaign of each crop (used for the campaign notes)."""
    years = sorted(phase_by_year)
    pct_by_crop = {
        crop: pct_by_campaign(area_by_crop[magyp_name], years)
        for crop, magyp_name in MAGYP_CROPS.items()
    }
    rows: list[UnharvestedRow] = []
    for crop, pct in pct_by_crop.items():
        rows.extend(rows_for_crop(crop, pct, phase_by_year))
    return rows, pct_by_crop
