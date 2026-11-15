import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
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


BACKEND_DIR = Path(__file__).resolve().parents[2]
# `.parent` instead of `parents[4]`: in the container the backend is `/app` and has no
# grandparent, so `parents[4]` raised at import. There the path is `/.env`, which never exists.
ROOT_ENV_FILE = BACKEND_DIR.parent.parent / ".env"


class AssistantSettings(BaseSettings):
    """Server-only credentials; local overrides never enter the frontend bundle."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_ENV_FILE, ROOT_ENV_FILE.with_name(".env.local")), extra="ignore"
    )

    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-6.1-sol"
    openai_transcription_model: str = "gpt-transcribe"
    openai_speech_model: str = "gpt-realtime-2.1-mini"
    assistant_public_enabled: bool = False
    assistant_requests_per_hour: int = Field(default=60, ge=1, le=1000)


class WaterModelSettings(BaseSettings):
    """Independent model settings also work without database or authentication setup."""

    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, extra="ignore")

    water_models_dir: Path = BACKEND_DIR / "models/water-v1"
    water_data_dir: Path = BACKEND_DIR / "data/water-v1"
    water_environment: Path = BACKEND_DIR / ".venv-models"

    @property
    def runtime_python(self) -> Path:
        relative = "Scripts/python.exe" if os.name == "nt" else "bin/python"
        return self.water_environment / relative


class CropMapSettings(BaseSettings):
    """Location of the released crop-map files; no database or authentication needed."""

    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, extra="ignore")

    crop_map_dir: Path = BACKEND_DIR / "data/crops"


class RotationSimSettings(BaseSettings):
    """Rotation simulator inputs (scripts/rotation_sim/install.sh) and its vendored tables."""

    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, extra="ignore")

    rotation_sim_data_dir: Path = BACKEND_DIR / "data/rotation-sim"
    rotation_sim_config_dir: Path = BACKEND_DIR / "vendor/rotation-sim/configs"
