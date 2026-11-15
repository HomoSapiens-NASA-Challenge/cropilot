"""Regression tests for categorical INTA history interpretation."""

import numpy as np
import pytest
from crop_history import (
    STACK_NODATA,
    class_distribution,
    effective_validity,
    parse_qml,
    pdf_legend,
    reproject_classes,
)
from rasterio.transform import from_origin


def test_zero_is_a_valid_class_and_nodata_is_not_a_crop() -> None:
    legend = pdf_legend(8286326, "annual")
    data = np.array([[0, 1, 16], [0, 15, 16]], dtype=np.uint8)
    valid = data != 16
    result = class_distribution(data, valid, legend)
    assert [(row["code"], row["pixel_count"]) for row in result] == [(0, 2), (1, 1), (15, 1)]
    assert result[0]["label_original"] == "Maiz"
    assert result[0]["fraction_of_valid_pixels"] == 0.5


def test_identical_codes_have_different_campaign_and_season_meanings() -> None:
    assert pdf_legend(8286310, "winter")[18]["label_original"] == "Caña de azúcar"
    assert pdf_legend(8286318, "winter")[18]["label_original"] == "Barbecho"
    assert pdf_legend(8284081, "winter")[16]["label_original"] == "Cereales de invierno"
    assert pdf_legend(8284081, "summer")[16]["label_original"] == "Maní"
    assert pdf_legend(8286326, "annual")[2]["interpretation_en"] == (
        "Winter crop, winter forage or cover crop followed by soybean; wheat is not confirmed."
    )


def test_qml_transparent_fill_and_mask_are_not_conflated() -> None:
    legend = parse_qml(
        '<qgis><item value="16" label="Cereales de invierno" color="#ffffff" alpha="255"/>'
        '<item value="25" label="Máscara" color="#000000" alpha="255"/>'
        '<item value="255" label="255" color="#ffffff" alpha="0"/></qgis>'
    )
    data = np.array([[16, 25, 255, 99]], dtype=np.uint8)
    valid = effective_validity(data, np.ones_like(data, dtype=bool), legend)
    assert valid.tolist() == [[True, True, False, True]]
    result = class_distribution(data, valid, legend)
    assert result[1]["status"] == "source_mask"
    assert result[2]["label_original"] is None
    assert result[2]["status"] == "unknown_code"


def test_qml_rejects_conflicting_labels_instead_of_silently_overwriting() -> None:
    with pytest.raises(ValueError, match="Conflicting legend"):
        parse_qml('<qgis><item value="1" label="A"/><item value="1" label="B"/></qgis>')


def test_nearest_alignment_preserves_classes_and_missing_pixels() -> None:
    source = np.array([[0, 16], [18, 11]], dtype=np.uint8)
    valid = np.array([[True, False], [True, True]])
    target = {
        "transform": from_origin(0, 2, 0.5, 0.5),
        "crs": "EPSG:4326",
        "height": 4,
        "width": 4,
    }
    aligned = reproject_classes(
        source,
        valid,
        from_origin(0, 2, 1, 1),
        "EPSG:4326",
        target,
        np.ones((4, 4), dtype=bool),
    )
    assert aligned.tolist() == [
        [0, 0, STACK_NODATA, STACK_NODATA],
        [0, 0, STACK_NODATA, STACK_NODATA],
        [18, 18, 11, 11],
        [18, 18, 11, 11],
    ]


def test_all_missing_distribution_has_no_fabricated_dominant_crop() -> None:
    assert (
        class_distribution(
            np.array([[16]], dtype=np.uint8), np.array([[False]]), pdf_legend(8286326, "annual")
        )
        == []
    )
