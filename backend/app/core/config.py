from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application
    ENVIRONMENT: str = "development"
    APP_NAME: str = "PersonaShield AI"
    APP_VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = ""

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Database (loaded from environment or .env)
    POSTGRES_USER: str = ""
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = ""
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = ""

    # File Upload & Storage Security
    UPLOAD_DIR: Path = Path("./uploads")
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB

    ALLOWED_MIME_TYPES: Union[List[str], str] = [
        "image/png",
        "image/jpeg",
        "application/pdf",
        "image/webp",
    ]

    ALLOWED_EXTENSIONS: Union[List[str], str] = [
        ".png",
        ".jpg",
        ".jpeg",
        ".pdf",
        ".webp",
    ]

    # Artifact Retention Policy (Hours) — Privacy by Design
    UPLOAD_RETENTION_HOURS: int = 24
    OCR_RETENTION_HOURS: int = 24
    SAFESHARE_RETENTION_HOURS: int = 24

    # Request Body Size Limit (Middleware)
    MAX_REQUEST_BODY_BYTES: int = 15 * 1024 * 1024  # 15 MB

    @property
    def async_database_url(self) -> str:
        """Dynamically computes the async database connection URL from environment variables."""
        if self.DATABASE_URL and self.DATABASE_URL.strip():
            return self.DATABASE_URL
        if self.POSTGRES_USER and self.POSTGRES_DB:
            auth = f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}" if self.POSTGRES_PASSWORD else self.POSTGRES_USER
            return f"postgresql+asyncpg://{auth}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        return "postgresql+asyncpg://localhost/personashield_db"

    @field_validator("ALLOWED_MIME_TYPES", mode="before")
    @classmethod
    def parse_allowed_mime_types(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("ALLOWED_EXTENSIONS", mode="before")
    @classmethod
    def parse_allowed_extensions(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("UPLOAD_DIR", mode="after")
    @classmethod
    def resolve_upload_dir(cls, v: Path) -> Path:
        return v.resolve()


settings = Settings()
