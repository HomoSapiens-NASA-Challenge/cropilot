import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Every value comes from the environment or the root `.env`."""

    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")

    database_url: str
    # Public origin of the auth service: the issuer and audience of every access token.
    better_auth_url: str
    auth_jwks_url: str

    @property
    def sqlalchemy_url(self) -> str:
        return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()


class WaterModelSettings(BaseSettings):
    """Independent model settings also work without database or authentication setup."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[4] / ".env", extra="ignore"
    )

    water_models_dir: Path = Path(__file__).resolve().parents[2] / "models/water-v1"
    water_data_dir: Path = Path(__file__).resolve().parents[2] / "data/water-v1"
    water_environment: Path = Path(__file__).resolve().parents[2] / ".venv-models"

    @property
    def runtime_python(self) -> Path:
        relative = "Scripts/python.exe" if os.name == "nt" else "bin/python"
        return self.water_environment / relative


class CropMapSettings(BaseSettings):
    """Location of the released crop-map files; no database or authentication needed."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[4] / ".env", extra="ignore"
    )

    crop_map_dir: Path = Path(__file__).resolve().parents[2] / "data/crops"
