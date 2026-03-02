"""
Centralized application settings using pydantic-settings.
Replaces scattered os.getenv calls throughout the codebase.
"""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # ─── App ──────────────────────────────────────────────────────────────
    APP_NAME: str = "Jeevan Setu"
    APP_VERSION: str = "2.0.0"
    APP_DESCRIPTION: str = "National-Scale Emergency Command Platform"
    DEBUG: bool = False

    # ─── Database ─────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/jeevan_setu"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # ─── JWT / Auth ───────────────────────────────────────────────────────
    SECRET_KEY: str = "dev-secret-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── CORS ─────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ─── Rate Limiting ────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 120
    RATE_LIMIT_BURST: int = 30

    # ─── Logging ──────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # "json" or "text"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
