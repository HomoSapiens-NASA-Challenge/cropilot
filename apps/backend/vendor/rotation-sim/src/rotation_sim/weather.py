"""Strictly validated NASA POWER daily weather, cut into June-to-May campaigns.

A campaign is identified by its start year: campaign 2022 runs from 2022-06-01 to 2023-05-31.
No calendar day belongs to two campaigns. Fill values never reach the simulator: a file with
gaps, fill values or values outside physical bounds is rejected with the offending dates.
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .eto import reference_et_mm

POWER_VARIABLES = (
    "PRECTOTCORR",
    "T2M",
    "T2M_MAX",
    "T2M_MIN",
    "ALLSKY_SFC_SW_DWN",
    "RH2M",
    "WS2M",
)
POWER_FILL_VALUE = -999.0


@dataclass(frozen=True)
class DailyWeather:
    """Contiguous daily series at one NASA POWER grid cell."""

    dates: np.ndarray  # datetime64[D]
    precip_mm: np.ndarray
    t_mean_c: np.ndarray
    t_max_c: np.ndarray
    t_min_c: np.ndarray
    solar_mj_m2: np.ndarray
    rh_mean_pct: np.ndarray
    wind_2m_m_s: np.ndarray
    latitude_deg: float
    longitude_deg: float
    elevation_m: float

    def __post_init__(self) -> None:
        _validate(self)

    def eto_mm(self) -> np.ndarray:
        day_of_year = (self.dates - self.dates.astype("datetime64[Y]")).astype(int) + 1
        return reference_et_mm(
            t_mean_c=self.t_mean_c,
            t_max_c=self.t_max_c,
            t_min_c=self.t_min_c,
            solar_mj_m2=self.solar_mj_m2,
            rh_mean_pct=self.rh_mean_pct,
            wind_2m_m_s=self.wind_2m_m_s,
            day_of_year=day_of_year,
            latitude_deg=self.latitude_deg,
            elevation_m=self.elevation_m,
        )


@dataclass(frozen=True)
class CampaignWeather:
    """Daily rain and reference ET for one campaign, June 1 to May 31."""

    year: int
    rain_mm: np.ndarray
    eto_mm: np.ndarray

    @property
    def n_days(self) -> int:
        return int(self.rain_mm.shape[-1])

    @property
    def label(self) -> str:
        return campaign_label(self.year)


def campaign_label(year: int) -> str:
    return f"{year}/{str(year + 1)[-2:]}"


def campaign_dates(year: int) -> np.ndarray:
    return np.arange(np.datetime64(f"{year}-06-01"), np.datetime64(f"{year + 1}-06-01"))


def _validate(weather: DailyWeather) -> None:
    series = {
        "precip_mm": weather.precip_mm,
        "t_mean_c": weather.t_mean_c,
        "t_max_c": weather.t_max_c,
        "t_min_c": weather.t_min_c,
        "solar_mj_m2": weather.solar_mj_m2,
        "rh_mean_pct": weather.rh_mean_pct,
        "wind_2m_m_s": weather.wind_2m_m_s,
    }
    dates = weather.dates
    if dates.ndim != 1 or dates.size == 0:
        raise ValueError("Weather has no dates")
    if not np.array_equal(dates, np.arange(dates[0], dates[-1] + np.timedelta64(1, "D"))):
        raise ValueError("Weather dates are duplicated, unsorted or missing")
    for name, values in series.items():
        if values.shape != dates.shape:
            raise ValueError(f"{name} has {values.shape[0]} values for {dates.size} dates")
        bad = ~np.isfinite(values) | (values == POWER_FILL_VALUE)
        if bad.any():
            raise ValueError(
                f"{name} has {int(bad.sum())} missing values, first on {dates[bad][0]}"
            )

    def reject(mask: np.ndarray, what: str) -> None:
        if mask.any():
            raise ValueError(f"{what} on {int(mask.sum())} days, first on {dates[mask][0]}")

    reject(weather.precip_mm < 0, "Negative precipitation")
    reject(weather.solar_mj_m2 < 0, "Negative solar radiation")
    reject(
        (weather.rh_mean_pct < 0) | (weather.rh_mean_pct > 100), "Relative humidity outside 0-100"
    )
    reject(weather.wind_2m_m_s < 0, "Negative wind speed")
    reject(weather.t_min_c > weather.t_max_c, "Minimum temperature above maximum")
    if not np.isfinite([weather.latitude_deg, weather.longitude_deg, weather.elevation_m]).all():
        raise ValueError("Weather location or elevation is not finite")


def load_power_json(path: str | Path) -> DailyWeather:
    """Read a NASA POWER daily point response (community AG, JSON format)."""
    with open(path, encoding="utf-8") as stream:
        payload = json.load(stream)
    return power_payload_to_weather(payload)


def power_payload_to_weather(payload: Mapping) -> DailyWeather:
    parameters = payload["properties"]["parameter"]
    missing = set(POWER_VARIABLES) - set(parameters)
    if missing:
        raise ValueError(f"POWER response lacks variables: {sorted(missing)}")
    keys = sorted(parameters[POWER_VARIABLES[0]])
    for name in POWER_VARIABLES:
        if set(parameters[name]) != set(keys):
            raise ValueError(f"POWER variable {name} covers different dates")
    dates = np.array([f"{k[:4]}-{k[4:6]}-{k[6:]}" for k in keys], dtype="datetime64[D]")

    def column(name: str) -> np.ndarray:
        return np.array([parameters[name][k] for k in keys], dtype=float)

    longitude, latitude, elevation = payload["geometry"]["coordinates"]
    return DailyWeather(
        dates=dates,
        precip_mm=column("PRECTOTCORR"),
        t_mean_c=column("T2M"),
        t_max_c=column("T2M_MAX"),
        t_min_c=column("T2M_MIN"),
        solar_mj_m2=column("ALLSKY_SFC_SW_DWN"),
        rh_mean_pct=column("RH2M"),
        wind_2m_m_s=column("WS2M"),
        latitude_deg=float(latitude),
        longitude_deg=float(longitude),
        elevation_m=float(elevation),
    )


def complete_campaign_years(weather: DailyWeather) -> list[int]:
    """Start years whose whole June 1 to May 31 window is inside the series."""
    first = weather.dates[0].astype("datetime64[Y]").astype(int) + 1970
    last = weather.dates[-1].astype("datetime64[Y]").astype(int) + 1970
    return [
        year
        for year in range(first, last + 1)
        if weather.dates[0] <= np.datetime64(f"{year}-06-01")
        and weather.dates[-1] >= np.datetime64(f"{year + 1}-05-31")
    ]


def campaigns(
    weather: DailyWeather, years: Iterable[int] | None = None
) -> dict[int, CampaignWeather]:
    """Rain and ETo per campaign. Asking for a year that is not complete is an error."""
    eto = weather.eto_mm()
    available = complete_campaign_years(weather)
    out: dict[int, CampaignWeather] = {}
    for year in available if years is None else years:
        if year not in available:
            raise ValueError(f"Incomplete campaign {campaign_label(year)}")
        start = int((np.datetime64(f"{year}-06-01") - weather.dates[0]).astype(int))
        stop = int((np.datetime64(f"{year + 1}-06-01") - weather.dates[0]).astype(int))
        rain = weather.precip_mm[start:stop].copy()
        campaign_eto = eto[start:stop].copy()
        rain.setflags(write=False)
        campaign_eto.setflags(write=False)
        out[year] = CampaignWeather(year=year, rain_mm=rain, eto_mm=campaign_eto)
    return out
