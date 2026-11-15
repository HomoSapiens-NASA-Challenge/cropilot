"""Scientific safeguards using explicitly synthetic daily data."""

from copy import deepcopy

import numpy as np
import pandas as pd
import pytest
from moisture import FEATURES, features, interval_radius, partition, supervised, validate_request


def synthetic_weather() -> pd.DataFrame:
    dates = pd.date_range("2006-01-01", "2007-03-01")
    return pd.DataFrame(
        {
            "GWETROOT": np.linspace(0.2, 0.8, len(dates)),
            "PRECTOTCORR": 2.0,
            "ET0": 3.0,
            "T2M": 20.0,
        },
        index=dates,
    )


def test_features_are_invariant_to_future_and_use_trailing_windows() -> None:
    weather = synthetic_weather()
    original = features(weather, -33.89, -60.57)
    changed = weather.copy()
    changed.loc["2006-07-01":, "GWETROOT"] = 0.99
    changed.loc["2006-07-01":, "PRECTOTCORR"] = 100
    pd.testing.assert_frame_equal(
        original.loc[:"2006-06-30"], features(changed, -33.89, -60.57).loc[:"2006-06-30"]
    )
    assert original.loc["2006-06-30", "rain7_mm"] == 14
    assert original.loc["2006-06-30", "eto14_mm"] == 42
    assert (
        original.loc["2006-06-30", "wetness_lag7_fraction"] == weather.loc["2006-06-23", "GWETROOT"]
    )


@pytest.mark.parametrize("horizon", [7, 14])
def test_targets_and_partitions_do_not_cross_boundaries(horizon: int) -> None:
    weather = synthetic_weather()
    frame = supervised(weather, {"id": "synthetic", "lat": -33.89, "lon": -60.57}, horizon)
    assert ((frame.target_date - frame.origin).dt.days == horizon).all()
    train, valid = partition(frame, "train"), partition(frame, "validation")
    assert train.target_date.max() == pd.Timestamp("2006-12-31")
    assert valid.origin.min() == pd.Timestamp("2007-01-01")
    assert train.origin.max() == pd.Timestamp("2006-12-31") - pd.Timedelta(days=horizon)
    assert train.iloc[-1].target == weather.loc["2006-12-31", "GWETROOT"]


def test_missing_dates_and_fill_values_are_rejected() -> None:
    weather = synthetic_weather()
    with pytest.raises(ValueError, match="complete"):
        features(weather.drop(weather.index[50]), 0, 0)
    weather.iloc[50, 0] = -999
    with pytest.raises(ValueError, match="bounds"):
        features(weather, 0, 0)


def test_interval_uses_conservative_calibration_order_statistic() -> None:
    assert interval_radius(np.arange(20) / 100) == 0.18


def test_request_rejects_targets_coordinates_nan_and_false_units() -> None:
    site = {"id": "pergamino", "lat": -33.89, "lon": -60.57}
    frame = features(synthetic_weather(), site["lat"], site["lon"])
    request: dict = {
        "schema_version": "moisture-v1",
        "source_vintage": "revised_history_not_as_issued",
        "zone_id": "pergamino",
        "data_end": "2006-06-30",
        "features": frame.loc["2006-06-30"].to_dict(),
    }
    assert list(validate_request({"sites": [site]}, request)) == FEATURES
    for key, value in (
        ("future_rain", 1),
        ("wetness_fraction", 70),
        ("latitude_deg", 12),
        ("rain7_mm", float("nan")),
        ("wetness_fraction", True),
        ("season_sin", 0.999),
    ):
        altered = deepcopy(request)
        altered["features"][key] = value
        with pytest.raises(ValueError, match=r"Expected|fraction|Coordinates|finite"):
            validate_request({"sites": [site]}, altered)
