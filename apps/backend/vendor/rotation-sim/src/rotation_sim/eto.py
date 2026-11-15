"""FAO-56 Penman-Monteith reference evapotranspiration from NASA POWER daily variables.

Ported from research/rl/lab (rl_experiment/eto.py). Equation numbers refer to FAO Irrigation
and Drainage Paper 56 (Allen et al., 1998), https://www.fao.org/4/x0490e/x0490e00.htm.

Declared approximations, same as the lab:
- daily soil heat flux is zero (eq. 42);
- actual vapour pressure comes from the daily mean relative humidity (eq. 19), because POWER
  does not provide daily minimum and maximum humidity;
- POWER all-sky surface shortwave is used as incoming solar radiation;
- POWER 2 m wind speed needs no height adjustment.
"""

from __future__ import annotations

import numpy as np

SOLAR_CONSTANT_MJ_M2_MIN = 0.0820
STEFAN_BOLTZMANN_MJ_K4_M2_DAY = 4.903e-9
ALBEDO_REFERENCE_CROP = 0.23


def saturation_vapour_pressure_kpa(temperature_c: np.ndarray) -> np.ndarray:
    """Eq. 11."""
    return 0.6108 * np.exp(17.27 * temperature_c / (temperature_c + 237.3))


def extraterrestrial_radiation_mj_m2(day_of_year: np.ndarray, latitude_deg: float) -> np.ndarray:
    """Daily extraterrestrial radiation Ra, eq. 21 with eqs. 23-25."""
    latitude = np.deg2rad(latitude_deg)
    inverse_distance = 1 + 0.033 * np.cos(2 * np.pi * day_of_year / 365)
    declination = 0.409 * np.sin(2 * np.pi * day_of_year / 365 - 1.39)
    sunset_angle = np.arccos(np.clip(-np.tan(latitude) * np.tan(declination), -1, 1))
    return (
        24 * 60 / np.pi * SOLAR_CONSTANT_MJ_M2_MIN * inverse_distance
        * (
            sunset_angle * np.sin(latitude) * np.sin(declination)
            + np.cos(latitude) * np.cos(declination) * np.sin(sunset_angle)
        )
    )  # fmt: skip


def reference_et_mm(
    *,
    t_mean_c: np.ndarray,
    t_max_c: np.ndarray,
    t_min_c: np.ndarray,
    solar_mj_m2: np.ndarray,
    rh_mean_pct: np.ndarray,
    wind_2m_m_s: np.ndarray,
    day_of_year: np.ndarray,
    latitude_deg: float,
    elevation_m: float,
) -> np.ndarray:
    """Daily reference evapotranspiration ETo in mm/day (eq. 6), never negative."""
    extraterrestrial = extraterrestrial_radiation_mj_m2(day_of_year, latitude_deg)
    clear_sky = (0.75 + 2e-5 * elevation_m) * extraterrestrial  # eq. 37
    saturation = (
        saturation_vapour_pressure_kpa(t_max_c) + saturation_vapour_pressure_kpa(t_min_c)
    ) / 2  # eq. 12
    actual = saturation * rh_mean_pct / 100  # eq. 19
    slope = 4098 * saturation_vapour_pressure_kpa(t_mean_c) / (t_mean_c + 237.3) ** 2  # eq. 13
    pressure_kpa = 101.3 * ((293 - 0.0065 * elevation_m) / 293) ** 5.26  # eq. 7
    psychrometric = 0.000665 * pressure_kpa  # eq. 8
    cloudiness = 1.35 * np.clip(solar_mj_m2 / clear_sky, 0.3, 1) - 0.35
    net_longwave = (
        STEFAN_BOLTZMANN_MJ_K4_M2_DAY
        * ((t_max_c + 273.16) ** 4 + (t_min_c + 273.16) ** 4) / 2
        * (0.34 - 0.14 * np.sqrt(actual))
        * cloudiness
    )  # eq. 39  # fmt: skip
    net_radiation = (1 - ALBEDO_REFERENCE_CROP) * solar_mj_m2 - net_longwave  # eqs. 38, 40
    eto = (
        0.408 * slope * net_radiation
        + psychrometric * 900 / (t_mean_c + 273) * wind_2m_m_s * (saturation - actual)
    ) / (slope + psychrometric * (1 + 0.34 * wind_2m_m_s))
    return np.maximum(eto, 0)
