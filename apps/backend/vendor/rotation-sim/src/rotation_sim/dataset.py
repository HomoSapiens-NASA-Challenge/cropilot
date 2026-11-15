"""Everything the environment needs, loaded from the local data directory.

``scripts/prepare_data.py`` downloads the raw inputs and writes ``fields.json``. Raw data and
derived files stay out of git.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .campaign import CONFIG_DIR, Model
from .fields import Field, load_fields
from .oni import Oni
from .weather import CampaignWeather, campaigns, load_power_json

DATA_DIR = Path(__file__).resolve().parents[2] / "data"

# Same partition as research/rl/lab: nothing fitted or selected on the test campaigns.
TRAIN_YEARS = tuple(range(1984, 2013))
TEST_YEARS = tuple(range(2013, 2025))


def power_path(data_dir: Path, field_id: str) -> Path:
    return data_dir / "raw" / "power" / f"{field_id}.json"


@dataclass(frozen=True)
class Dataset:
    model: Model
    fields: list[Field]
    weather: dict[str, dict[int, CampaignWeather]]  # field_id -> campaign year -> weather
    oni: Oni


def load_dataset(data_dir: str | Path = DATA_DIR, config_dir: str | Path = CONFIG_DIR) -> Dataset:
    data_dir = Path(data_dir)
    fields_path = data_dir / "fields.json"
    if not fields_path.exists():
        raise FileNotFoundError(
            f"{fields_path} not found. Run `uv run python scripts/prepare_data.py` first."
        )
    fields = load_fields(fields_path)
    return Dataset(
        model=Model.from_configs(config_dir),
        fields=fields,
        weather={
            f.field_id: campaigns(load_power_json(power_path(data_dir, f.field_id))) for f in fields
        },
        oni=Oni.from_file(data_dir / "raw" / "oni.ascii.txt"),
    )
