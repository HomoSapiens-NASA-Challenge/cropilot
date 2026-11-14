from functools import lru_cache

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
