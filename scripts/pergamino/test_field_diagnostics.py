"""Protect field diagnostics from missing-data and class-identity mistakes."""

from pathlib import Path

import numpy as np
import rasterio
from crop_history import pdf_legend
from field_diagnostics import read_field_summary, summarize_pixels, summer_recurrence
from rasterio.transform import from_origin


def test_source_mask_and_missing_are_separate_from_valid_class_zero() -> None:
    data = np.array([[0, 15], [16, 0]], dtype=np.uint8)
    result = summarize_pixels(
        data, data != 16, np.ones((2, 2), dtype=bool), pdf_legend(8286326, "annual")
    )
    assert result["pixel_counts"] == {
        "field": 4,
        "mapped_class": 2,
        "source_mask": 1,
        "transparent_fill": 0,
        "unknown_code": 0,
        "missing": 1,
    }
    assert result["fractions_of_field_pixels"]["source_mask"] == 0.25
    assert result["fractions_of_field_pixels"]["missing"] == 0.25
    assert result["dominant_mapped_class"]["code"] == 0
    assert result["dominant_mapped_class"]["fraction_of_field_pixels"] == 0.5
    assert result["dominant_mapped_class"]["fraction_of_mapped_pixels"] == 1.0


def test_zero_valid_pixels_produces_no_dominant_crop() -> None:
    result = summarize_pixels(
        np.array([[255, 255]], dtype=np.uint8),
        np.array([[False, False]]),
        np.array([[True, True]]),
        pdf_legend(8286310, "summer"),
    )
    assert result["dominant_mapped_class"] is None
    assert result["dominance_status"] == "no_mapped_pixels"
    assert result["pixel_counts"]["missing"] == 2


def test_unknown_codes_cannot_win_dominance_and_ties_are_explicit() -> None:
    legend = pdf_legend(8286310, "summer")
    result = summarize_pixels(
        np.array([[99, 99, 10, 11]], dtype=np.uint8),
        np.ones((1, 4), dtype=bool),
        np.ones((1, 4), dtype=bool),
        legend,
    )
    assert result["pixel_counts"]["unknown_code"] == 2
    assert result["dominant_mapped_class"] is None
    assert result["dominance_status"] == "tie_between_mapped_classes"


def test_field_summary_uses_pixel_centers_not_all_touched(tmp_path: Path) -> None:
    raster_path = tmp_path / "synthetic_classes.tif"
    with rasterio.open(
        raster_path,
        "w",
        driver="GTiff",
        count=1,
        dtype="uint8",
        width=2,
        height=1,
        transform=from_origin(0, 1, 1, 1),
        crs="EPSG:4326",
        nodata=255,
    ) as destination:
        destination.write(np.array([[10, 11]], dtype=np.uint8), 1)
    geometry = {
        "type": "Polygon",
        "coordinates": [[[0.6, 0], [1.6, 0], [1.6, 1], [0.6, 1], [0.6, 0]]],
    }
    result = read_field_summary(raster_path, geometry, pdf_legend(8286310, "summer"))
    assert result["pixel_counts"]["field"] == 1
    assert result["dominant_mapped_class"]["label_original"] == "Soja"


def test_recurrence_excludes_incomplete_and_ambiguous_crop_observations() -> None:
    def observation(record: int, season: str, code: int, campaign: str) -> dict:
        data = np.array([[code]], dtype=np.uint8)
        summary = summarize_pixels(
            data, np.array([[True]]), np.array([[True]]), pdf_legend(record, season)
        )
        return {"record_id": record, "season": season, "campaign": campaign, **summary}

    maps = [
        observation(8286326, "annual", 2, "2018/2019"),
        observation(8286310, "summer", 11, "2019/2020"),
        observation(8286318, "summer", 19, "2020/2021"),
    ]
    incomplete = observation(8284081, "summer", 11, "2021/2022")
    incomplete["pixel_counts"]["missing"] = 1
    maps.append(incomplete)
    result = summer_recurrence(maps)
    assert result["classification_counts"] == {"soybean": 2}
    assert result["observations"][2]["included"] is False
    assert result["observations"][3]["included"] is False


def test_recurrence_requires_a_majority_for_mixed_field_classifications() -> None:
    summary = summarize_pixels(
        np.array([[10, 10, 11, 12, 22]], dtype=np.uint8),
        np.ones((1, 5), dtype=bool),
        np.ones((1, 5), dtype=bool),
        pdf_legend(8286310, "summer"),
    )
    result = summer_recurrence(
        [{"record_id": 8286310, "season": "summer", "campaign": "2019/2020", **summary}]
    )
    assert result["classification_counts"] == {}
    assert result["observations"][0]["reason"] == "no_majority_crop_class"
