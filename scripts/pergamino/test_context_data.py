"""Test transformations whose mistakes would misrepresent agronomic evidence."""

import csv
import io
import unittest
from datetime import date

import pytest
from context_data import (
    POWER_COLUMNS,
    POWER_UNITS,
    SIMULATOR_PARAMETERS,
    YIELD_FIELDS,
    Record,
    dates_between,
    number,
    oni_rows,
    power_rows,
    season_bounds,
    simulator_payload,
    soil_rows,
    yield_rows,
)


class ContextTransformationTests(unittest.TestCase):
    def test_power_preserves_ag_radiation_units_and_flags(self) -> None:
        payload: Record = {
            "header": {"time_standard": "UTC", "fill_value": -999},
            "properties": {"parameter": {name: {"19840101": 12.3} for name in POWER_COLUMNS}},
            "parameters": {name: {"units": unit} for name, unit in POWER_UNITS.items()},
        }
        rows, _, _ = power_rows([payload], date(1984, 1, 1))
        assert rows[-1]["solar_radiation_mj_m2_day"] == 12.3
        assert rows[-1]["time_standard"] == "UTC"
        assert rows[0]["solar_radiation_mj_m2_day"] is None
        assert rows[0]["solar_radiation_mj_m2_day_flag"] == "not_requested_before_1984"

    def test_simulator_requires_complete_equal_date_sets_and_exact_parameters(
        self,
    ) -> None:
        values = dict.fromkeys(dates_between(date(1984, 1, 1), date(2025, 12, 31)), 1.0)
        payload: Record = {
            "header": {
                "start": "19840101",
                "end": "20251231",
                "time_standard": "UTC",
                "fill_value": -999,
            },
            "geometry": {"type": "Point", "coordinates": [-60.57, -33.9, 69.07]},
            "properties": {"parameter": {name: dict(values) for name in POWER_COLUMNS}},
            "parameters": {name: {"units": unit} for name, unit in POWER_UNITS.items()},
        }
        result = simulator_payload([payload])
        assert set(result["properties"]["parameter"]) == set(SIMULATOR_PARAMETERS)
        payload["properties"]["parameter"]["T2M"]["19840101"] = -999
        with pytest.raises(ValueError, match=r"^Incomplete/duplicate simulator weather:"):
            simulator_payload([payload])

    def test_provider_fill_and_zero_are_distinct(self) -> None:
        assert number(-999.0, -999.0) == (None, "provider_fill")
        assert number(0, -999.0) == (0.0, "valid")
        assert number("") == (None, "missing")

    def test_soil_conversion_uses_returned_metadata_and_preserves_quantiles(
        self,
    ) -> None:
        payload = {
            "properties": {
                "layers": [
                    {
                        "name": "soc",
                        "unit_measure": {
                            "d_factor": 10,
                            "mapped_units": "dg/kg",
                            "target_units": "g/kg",
                        },
                        "depths": [
                            {
                                "label": "0-5cm",
                                "range": {
                                    "top_depth": 0,
                                    "bottom_depth": 5,
                                    "unit_depth": "cm",
                                },
                                "values": {"mean": 123, "Q0.05": None, "Q0.95": 205},
                            }
                        ],
                    }
                ]
            }
        }
        rows = soil_rows(payload, "center", -60.57, -33.9)
        assert rows[0]["value"] == 12.3
        assert rows[0]["unit"] == "g/kg"
        assert rows[1]["value"] is None
        assert rows[1]["provenance"] == "missing"
        assert rows[2]["value"] == 20.5

    def test_soil_rejects_unknown_conversion(self) -> None:
        payload = {"properties": {"layers": [{"unit_measure": {"d_factor": 0}}]}}
        with pytest.raises(ValueError, match=r"^Invalid SoilGrids conversion metadata:"):
            soil_rows(payload, "center", -60.57, -33.9)

    def test_oni_season_availability_does_not_leak_september_into_august(self) -> None:
        rows = oni_rows(b"SEAS YR TOTAL ANOM\nJAS 2026 29.12 2.16\n")
        assert rows[0]["season_end"] == "2026-09-30"
        assert rows[0]["cannot_be_known_before"] == "2026-10-01"
        assert rows[0]["actual_release_date"] is None
        assert season_bounds(2024, "DJF") == (date(2023, 12, 1), date(2024, 2, 29))
        assert season_bounds(2024, "NDJ") == (date(2024, 11, 1), date(2025, 1, 31))

    def test_magyp_preserves_zero_harvest_missing_and_department_id(self) -> None:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(YIELD_FIELDS)
        writer.writerow(
            [
                "maíz",
                "2024",
                "2024/2025",
                "Buenos Aires",
                "6",
                "Pergamino",
                "6623",
                "50",
                "0",
                "0",
                "0",
            ]
        )
        writer.writerow(
            [
                "soja total",
                "2024",
                "2024/2025",
                "Buenos Aires",
                "06",
                "Pergamino",
                "06623",
                "50",
                "",
                "",
                "",
            ]
        )
        rows, summary = yield_rows(output.getvalue().encode("utf-8"))
        assert rows[0]["departamento_id"] == "06623"
        assert rows[0]["provincia_id"] == "06"
        assert rows[0]["planted_but_zero_harvest"]
        assert not rows[0]["zero_harvest_positive_production"]
        assert not rows[0]["yield_usable_as_harvested_area_average"]
        assert rows[1]["superficie_cosechada_ha"] is None
        assert rows[1]["zero_harvest"] is None
        assert rows[1]["planted_but_zero_harvest"] is None
        assert summary["zero_harvest_rows"] == 1

    def test_oni_duplicate_is_rejected(self) -> None:
        with pytest.raises(ValueError, match=r"^Duplicate ONI season/year$"):
            oni_rows(b"SEAS YR TOTAL ANOM\nJAS 2026 29.12 2.16\nJAS 2026 29.12 2.16\n")


if __name__ == "__main__":
    unittest.main()
