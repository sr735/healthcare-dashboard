from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"
    api_v1_prefix: str = "/api/v1"
    log_level: str = "INFO"  # DEBUG | INFO | WARNING | ERROR

    # Database — async driver for SQLAlchemy async engine
    async_database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/healthdash"
    )
    # Sync URL used only by Alembic migrations
    sync_database_url: str = (
        "postgresql+psycopg2://postgres:postgres@localhost:5432/healthdash"
    )

    # CORS — stored as a plain string to avoid pydantic-settings' JSON pre-parsing.
    # Use the cors_origins_list property wherever a list is needed.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
