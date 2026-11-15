"""Regression tests for categorical OPERA water and missingness semantics."""

import numpy as np
import pytest
from opera_data import summarize_water


def test_cloud_snow_ocean_and_fill_are_never_land_or_water() -> None:
    water = np.array([0, 1, 2, 252, 253, 254, 255], dtype=np.uint8)
    confidence = np.array([0, 1, 3, 20, 11, 254, 255], dtype=np.uint8)
    result = summarize_water(water, confidence, np.ones(7, dtype=bool))
    assert result["valid_pixel_count"] == 3
    assert result["not_water_pixel_count"] == 1
    assert result["water_class_pixel_count"] == 2
    assert result["water_class_fraction_of_valid"] == pytest.approx(2 / 3)
    assert result["valid_fraction"] == pytest.approx(3 / 7)
    assert result["partial_water_class_footprint_ha"] == pytest.approx(0.09)


def test_fully_masked_observation_stays_missing() -> None:
    water = np.array([253, 255], dtype=np.uint8)
    result = summarize_water(water, None, np.ones(2, dtype=bool))
    assert result["valid_pixel_count"] == 0
    assert result["water_class_fraction_of_valid"] is None
    assert result["water_class_footprint_ha"] is None
    assert result["confidence_available"] is False


def test_clear_confidence_required_and_inconsistency_reported() -> None:
    water = np.array([1, 1, 2, 0], dtype=np.uint8)
    confidence = np.array([11, 0, 4, 0], dtype=np.uint8)
    result = summarize_water(water, confidence, np.ones(4, dtype=bool))
    assert result["valid_pixel_count"] == 2
    assert result["inconsistent_clear_confidence_pixel_count"] == 1
    assert result["water_class_fraction_of_valid"] == 0.5
    assert result["partial_aggressive_pixel_count"] == 1


def test_pixel_centers_outside_field_do_not_change_denominator() -> None:
    water = np.array([1, 0, 0], dtype=np.uint8)
    result = summarize_water(water, None, np.array([True, False, False]))
    assert result["total_pixel_count"] == 1
    assert result["valid_fraction"] == 1
    assert result["water_class_fraction_of_valid"] == 1


def test_unknown_class_is_an_error_instead_of_silent_nonwater() -> None:
    with pytest.raises(ValueError, match="Unknown WTR"):
        summarize_water(np.array([3], dtype=np.uint8), None, np.array([True]))
