from functools import lru_cache
from pathlib import Path

from app.modules.seasons.schemas import SeasonDashboard

# Partly mock bundle: past-season climate for Pergamino is real (NASA POWER, NOAA ONI);
# margins, carbon inputs and this year's soil wetness are synthetic and sourced as "mock".
# The season pipeline will write the real bundle with the same schema.
MOCK_BUNDLE_PATH = Path(__file__).with_name("dashboard_mock.json")


def load_dashboard(path: Path) -> SeasonDashboard:
    """Read and validate a bundle. A bundle that breaks the schema fails here, not in a chart."""
    return SeasonDashboard.model_validate_json(path.read_bytes())


@lru_cache
def get_dashboard() -> SeasonDashboard:
    return load_dashboard(MOCK_BUNDLE_PATH)
