"""Ensure cloud and missing pixels do not become field observations or false absence of water."""

import numpy as np
import pytest
from field_vegetation import summarize_pixels


def test_cloud_water_and_outside_pixels_do_not_contaminate_field_summary() -> None:
    ndvi = np.array([[0.2, 0.8], [0.9, np.nan]], dtype=np.float32)
    valid = np.array([[1, 1], [255, 0]], dtype=np.uint8)
    fmask = np.array([[32, 0], [32, 34]], dtype=np.uint8)
    inside = np.array([[True, True], [False, True]], dtype=np.bool_)
    summary = summarize_pixels(ndvi, valid, fmask, inside)
    assert summary["field_pixel_count"] == 3
    assert summary["valid_ndvi_pixel_count"] == 2
    assert summary["ndvi_mean"] == pytest.approx(0.5)
    assert summary["fmask_water_pixel_count"] == 1
    assert summary["fmask_water_fraction_of_quality_clear_pixels"] == 0.5


def test_all_missing_is_null_not_zero_water_or_zero_vegetation() -> None:
    ndvi = np.full((2, 2), np.nan, dtype=np.float32)
    valid = np.full((2, 2), 255, dtype=np.uint8)
    fmask = np.full((2, 2), 255, dtype=np.uint8)
    inside = np.ones((2, 2), dtype=np.bool_)
    summary = summarize_pixels(ndvi, valid, fmask, inside)
    assert summary["valid_ndvi_pixel_count"] == 0
    assert summary["ndvi_mean"] is None
    assert summary["fmask_water_fraction_of_quality_clear_pixels"] is None
