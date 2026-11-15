"""Sourced parameter table. Every constant of the model enters through configs/parameters.csv.

Each row carries its unit, its source and a status: SOURCED (traceable to the cited table) or
ASSUMPTION (a declared scenario value). Nothing is defaulted in code: asking for a parameter
that is missing or not numeric is an error.
"""

from __future__ import annotations

import csv
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

STATUSES = ("SOURCED", "ASSUMPTION")


@dataclass(frozen=True)
class Parameter:
    name: str
    scope: str  # a crop physiology, "soil", "bare", "fallow" or "all"
    value: str
    unit: str
    status: str
    source_url: str
    page_table: str


class Parameters:
    def __init__(self, rows: Iterable[Parameter]) -> None:
        self._rows: dict[tuple[str, str], Parameter] = {}
        for row in rows:
            key = (row.name, row.scope)
            if key in self._rows:
                raise ValueError(f"Duplicate parameter {key}")
            if row.status not in STATUSES:
                raise ValueError(f"Parameter {key} has unknown status {row.status!r}")
            self._rows[key] = row

    @classmethod
    def from_csv(cls, path: str | Path) -> Parameters:
        with open(path, newline="", encoding="utf-8") as stream:
            return cls(
                Parameter(
                    name=r["parameter"],
                    scope=r["crop"],
                    value=r["value"],
                    unit=r["unit"],
                    status=r["status"],
                    source_url=r["source_url"],
                    page_table=r["page_table"],
                )
                for r in csv.DictReader(stream)
            )

    def has(self, name: str, scope: str) -> bool:
        return (name, scope) in self._rows

    def row(self, name: str, scope: str) -> Parameter:
        try:
            return self._rows[name, scope]
        except KeyError:
            raise KeyError(f"Parameter {name!r} is not defined for {scope!r}") from None

    def number(self, name: str, scope: str) -> float:
        row = self.row(name, scope)
        try:
            return float(row.value)
        except ValueError:
            raise ValueError(
                f"Parameter {name!r} for {scope!r} is not a single number: {row.value!r}"
            ) from None

    def assumptions(self) -> list[Parameter]:
        return [row for row in self._rows.values() if row.status == "ASSUMPTION"]
