"""Daily single-bucket soil water balance, FAO-56, vectorised over a batch of states.

Ported from research/rl/lab (rl_experiment/model.py::simulate). One bucket of plant-available
water of capacity TAW; each day, in this order:

1. rain enters the bucket and whatever exceeds TAW drains;
2. rain refills the surface evaporation store;
3. on a bare day the soil evaporates at ``bare_kc_max * ETo * Kr`` (FAO-56 stage-2 reduction,
   one surface store, no mulch); on a crop day the crop takes ``Kc * ETo * Ks`` (single crop
   coefficient with the water-stress coefficient of eq. 84);
4. evapotranspiration leaves the bucket and depletes the surface store.

Not represented, as in the lab: irrigation, runoff, capillary rise from the water table and
waterlogging. "Drainage" is water above capacity, not flooding.

The schedule (which days carry which crop) is shared by the whole batch; soil capacity, the
two state variables and the weather may differ per batch element.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .crops import BARE, Schedule

N_POSITIONS = 2  # winter crop, summer crop


@dataclass(frozen=True)
class SoilEvaporation:
    tew_mm: float  # total evaporable water of the surface store
    rew_mm: float  # readily evaporable water
    bare_kc_max: float  # bare-soil evaporation ceiling as a fraction of ETo

    def __post_init__(self) -> None:
        if not 0 <= self.rew_mm < self.tew_mm or self.bare_kc_max < 0:
            raise ValueError("Soil evaporation needs 0 <= REW < TEW and a non-negative Kc ceiling")


@dataclass(frozen=True)
class DailyTrace:
    """Per-day series of a run, first axis is the day. Names follow the team's water contract."""

    available_water_start_mm: np.ndarray
    precip_mm: np.ndarray
    eto_mm: np.ndarray
    et_potential_mm: np.ndarray
    et_actual_mm: np.ndarray
    excess_above_capacity_mm: np.ndarray
    available_water_end_mm: np.ndarray
    position: np.ndarray  # BARE, winter or summer position, one value per day

    def mass_residual_mm(self) -> np.ndarray:
        return (
            self.available_water_start_mm
            + self.precip_mm
            - self.et_actual_mm
            - self.excess_above_capacity_mm
            - self.available_water_end_mm
        )

    @staticmethod
    def concatenate(parts: list[DailyTrace]) -> DailyTrace:
        return DailyTrace(
            *(
                np.concatenate([getattr(part, name) for part in parts])
                for name in DailyTrace.__dataclass_fields__
            )
        )


@dataclass(frozen=True)
class DaysResult:
    water_mm: np.ndarray
    surface_depletion_mm: np.ndarray
    et_actual_mm: np.ndarray  # crop days only, last axis is the position in the campaign
    et_potential_mm: np.ndarray  # same shape; Kc * ETo before water stress
    bare_evaporation_mm: np.ndarray
    drainage_mm: np.ndarray
    bare_rain_mm: np.ndarray
    bare_days: int
    trace: DailyTrace | None


def total_available_water_mm(available_water_capacity: float, effective_depth_m: float) -> float:
    """FAO-56 eq. 82 with the capacity already expressed as field capacity minus wilting point."""
    return 1000 * available_water_capacity * effective_depth_m


def simulate_days(
    *,
    rain_mm: np.ndarray,
    eto_mm: np.ndarray,
    schedule: Schedule,
    start: int,
    stop: int,
    taw_mm: np.ndarray | float,
    water_mm: np.ndarray | float,
    surface_depletion_mm: np.ndarray | float,
    soil: SoilEvaporation,
    trace: bool = False,
) -> DaysResult:
    """Advance the water balance over days ``[start, stop)`` of a campaign.

    ``rain_mm`` and ``eto_mm`` have the campaign days on their last axis; their leading axes,
    and the three state arguments, broadcast to the batch shape.
    """
    rain_mm = np.asarray(rain_mm, dtype=float)
    eto_mm = np.asarray(eto_mm, dtype=float)
    taw = np.asarray(taw_mm, dtype=float)
    n_days = schedule.n_days
    if rain_mm.shape[-1] != n_days or eto_mm.shape[-1] != n_days:
        raise ValueError(
            f"Weather has {rain_mm.shape[-1]} and {eto_mm.shape[-1]} days, the schedule {n_days}"
        )
    if not 0 <= start <= stop <= n_days:
        raise ValueError(f"Invalid day range [{start}, {stop}) for a campaign of {n_days} days")
    window_rain, window_eto = rain_mm[..., start:stop], eto_mm[..., start:stop]
    for name, values in (("rain", window_rain), ("ETo", window_eto)):
        if not np.isfinite(values).all() or (values < 0).any():
            raise ValueError(f"Invalid weather: {name} has missing, fill or negative values")
    if not np.isfinite(taw).all() or (taw <= 0).any():
        raise ValueError("Total available water must be positive and finite")

    shape = np.broadcast_shapes(
        taw.shape,
        np.shape(water_mm),
        np.shape(surface_depletion_mm),
        rain_mm.shape[:-1],
        eto_mm.shape[:-1],
    )
    water = np.broadcast_to(np.asarray(water_mm, dtype=float), shape).copy()
    surface = np.broadcast_to(np.asarray(surface_depletion_mm, dtype=float), shape).copy()
    if not np.isfinite(water).all() or (water < 0).any() or (water > taw).any():
        raise ValueError("Initial soil water must be within [0, TAW]")
    if not np.isfinite(surface).all() or (surface < 0).any() or (surface > soil.tew_mm).any():
        raise ValueError("Initial surface depletion must be within [0, TEW]")

    if shape == () and not trace:
        return _simulate_days_single(
            window_rain,
            window_eto,
            schedule,
            start,
            stop,
            float(taw),
            float(water),
            float(surface),
            soil,
        )

    tew, rew, bare_kc_max = soil.tew_mm, soil.rew_mm, soil.bare_kc_max
    et_actual = np.zeros((*shape, N_POSITIONS))
    et_potential = np.zeros((*shape, N_POSITIONS))
    bare_evaporation = np.zeros(shape)
    drainage = np.zeros(shape)
    bare_rain = np.zeros(shape)
    bare_days = 0
    rows: list[tuple[np.ndarray, ...]] = []

    for day in range(start, stop):
        rain = rain_mm[..., day]
        eto = eto_mm[..., day]
        water_start = water
        storage = water + rain
        excess = np.maximum(storage - taw, 0.0)
        water = np.minimum(storage, taw)
        surface = np.maximum(surface - rain, 0.0)
        position = schedule.position[day]
        if position == BARE:
            reduction = np.minimum(np.maximum((tew - surface) / (tew - rew), 0.0), 1.0)
            demand = bare_kc_max * eto * reduction
            actual = np.minimum(water, demand)
            bare_evaporation += actual
            bare_rain += rain
            bare_days += 1
        else:
            demand = schedule.kc[day] * eto
            readily_available = (1 - schedule.depletion_fraction[day]) * taw
            stress = np.minimum(np.maximum(water / readily_available, 0.0), 1.0)
            actual = np.minimum(water, demand * stress)
            et_potential[..., position] += demand
            et_actual[..., position] += actual
        surface = np.minimum(tew, surface + actual)
        water = water - actual
        drainage += excess
        if trace:
            rows.append(
                tuple(
                    np.broadcast_to(x, shape).copy()
                    for x in (water_start, rain, eto, demand, actual, excess, water)
                )
            )

    daily = None
    if trace:
        columns = (
            [np.stack(column) for column in zip(*rows, strict=True)]
            if rows
            else [np.zeros((0, *shape)) for _ in range(7)]
        )
        daily = DailyTrace(*columns, position=schedule.position[start:stop].copy())
    return DaysResult(
        water_mm=water,
        surface_depletion_mm=surface,
        et_actual_mm=et_actual,
        et_potential_mm=et_potential,
        bare_evaporation_mm=bare_evaporation,
        drainage_mm=drainage,
        bare_rain_mm=bare_rain,
        bare_days=bare_days,
        trace=daily,
    )


def _simulate_days_single(
    rain_mm: np.ndarray,
    eto_mm: np.ndarray,
    schedule: Schedule,
    start: int,
    stop: int,
    taw: float,
    water: float,
    surface: float,
    soil: SoilEvaporation,
) -> DaysResult:
    """The loop of ``simulate_days`` for one state, on plain floats.

    Same operations in the same order as the array loop, so the results are identical; a test
    holds the two together. It exists because one episode of the environment is one state, and
    array overhead on single numbers made that case about ten times slower.
    """
    tew, rew, bare_kc_max = soil.tew_mm, soil.rew_mm, soil.bare_kc_max
    et_actual = [0.0] * N_POSITIONS
    et_potential = [0.0] * N_POSITIONS
    bare_evaporation = drainage = bare_rain = 0.0
    bare_days = 0
    days = zip(
        rain_mm.tolist(),
        eto_mm.tolist(),
        schedule.kc[start:stop].tolist(),
        schedule.position[start:stop].tolist(),
        schedule.depletion_fraction[start:stop].tolist(),
        strict=True,
    )
    for rain, eto, kc, position, depletion_fraction in days:
        storage = water + rain
        excess = max(storage - taw, 0.0)
        water = min(storage, taw)
        surface = max(surface - rain, 0.0)
        if position == BARE:
            reduction = min(max((tew - surface) / (tew - rew), 0.0), 1.0)
            demand = bare_kc_max * eto * reduction
            actual = min(water, demand)
            bare_evaporation += actual
            bare_rain += rain
            bare_days += 1
        else:
            demand = kc * eto
            readily_available = (1 - depletion_fraction) * taw
            stress = min(max(water / readily_available, 0.0), 1.0)
            actual = min(water, demand * stress)
            et_potential[position] += demand
            et_actual[position] += actual
        surface = min(tew, surface + actual)
        water = water - actual
        drainage += excess
    return DaysResult(
        water_mm=np.float64(water),
        surface_depletion_mm=np.float64(surface),
        et_actual_mm=np.array(et_actual),
        et_potential_mm=np.array(et_potential),
        bare_evaporation_mm=np.float64(bare_evaporation),
        drainage_mm=np.float64(drainage),
        bare_rain_mm=np.float64(bare_rain),
        bare_days=bare_days,
        trace=None,
    )


def relative_yield(ky: float, et_actual_mm: np.ndarray, et_potential_mm: np.ndarray) -> np.ndarray:
    """FAO-33 seasonal yield response, as a fraction of the attainable yield in [0, 1].

    ``1 - Ky * (1 - ETa / ETm)`` with whole-season totals. A crop with no demand is unstressed.
    """
    et_actual_mm = np.asarray(et_actual_mm, dtype=float)
    et_potential_mm = np.asarray(et_potential_mm, dtype=float)
    ratio = np.divide(
        et_actual_mm,
        et_potential_mm,
        out=np.ones(np.broadcast_shapes(et_actual_mm.shape, et_potential_mm.shape)),
        where=et_potential_mm > 0,
    )
    return np.clip(1 - ky * (1 - ratio), 0, 1)
