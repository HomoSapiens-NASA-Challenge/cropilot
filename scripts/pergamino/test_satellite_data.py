"""Tests for the scientific masking contract of the diagnostic HLS sample."""

import numpy as np
import pytest
import requests
import satellite_data
from satellite_data import calculate_ndvi, campaign_for_month, make_grid, safe_error, signed_href


def test_cloud_shadow_adjacency_snow_and_fill_are_missing() -> None:
    red = np.full(7, 1000, dtype=np.int16)
    nir = np.full(7, 3000, dtype=np.int16)
    quality = np.array([0, 2, 4, 8, 16, 255, 192], dtype=np.uint8)
    ndvi, valid = calculate_ndvi(red, nir, quality)
    np.testing.assert_array_equal(valid, [True, False, False, False, False, False, True])
    np.testing.assert_allclose(ndvi[[0, 6]], 0.5)
    assert np.isnan(ndvi[1:6]).all()


def test_fill_and_nonpositive_reflectance_never_make_spurious_ndvi() -> None:
    red = np.array([-9999, 0, -100, 100, 200, 100], dtype=np.int16)
    nir = np.array([1000, 0, 200, -100, 100, 300], dtype=np.int16)
    ndvi, valid = calculate_ndvi(red, nir, np.zeros(6, dtype=np.uint8))
    np.testing.assert_array_equal(valid, [False, False, False, False, True, True])
    assert np.isnan(ndvi[:4]).all()
    np.testing.assert_allclose(ndvi[4:], [-1 / 3, 0.5])


def test_water_flag_retained_but_aoi_mask_applied() -> None:
    red = np.array([100, 100], dtype=np.int16)
    nir = np.array([200, 200], dtype=np.int16)
    ndvi, valid = calculate_ndvi(
        red, nir, np.array([32, 0], dtype=np.uint8), np.array([True, False])
    )
    np.testing.assert_array_equal(valid, [True, False])
    assert np.isnan(ndvi[1])


def test_grid_uses_southern_utm_and_months_do_not_leak_campaigns() -> None:
    grid = make_grid()
    assert grid.crs == "EPSG:32720"
    assert 6_000_000 < grid.transform.f < 7_000_000
    assert grid.aoi_mask.sum() > 400_000
    assert campaign_for_month("2024-05") == "2023/24"
    assert campaign_for_month("2024-06") == "2024/25"


def test_public_container_token_reused_across_bands(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = []

    class Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"msft:expiry": "2999-01-01T00:00:00Z", "token": "synthetic-token"}

    def fetch(url: str, timeout: int) -> Response:
        calls.append((url, timeout))
        return Response()

    client = requests.Session()
    monkeypatch.setattr(client, "get", fetch)
    monkeypatch.setattr(satellite_data, "SAS_CACHE", {})
    asset = "https://hls2euwest.blob.core.windows.net/hls2/S30/test/"
    assert signed_href(client, asset + "B04.tif").endswith("?synthetic-token")
    assert signed_href(client, asset + "B8A.tif").endswith("?synthetic-token")
    assert len(calls) == 1


def test_error_messages_do_not_persist_temporary_tokens() -> None:
    message = safe_error(ValueError("Cannot read https://host/band.tif?sig=synthetic-secret"))
    assert message == "Cannot read https://host/band.tif"
