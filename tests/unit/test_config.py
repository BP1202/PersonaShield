from backend.app.core.config import Settings


def test_settings_default_values():
    settings = Settings()
    assert settings.APP_NAME == "PersonaShield AI"
    assert settings.API_V1_PREFIX == "/api/v1"
    assert ".png" in settings.ALLOWED_EXTENSIONS
    assert "image/png" in settings.ALLOWED_MIME_TYPES
    assert settings.MAX_UPLOAD_SIZE_BYTES > 0


def test_settings_comma_separated_parsing():
    custom_settings = Settings(
        ALLOWED_EXTENSIONS=".png,.pdf",
        ALLOWED_MIME_TYPES="image/png,application/pdf",
    )
    assert custom_settings.ALLOWED_EXTENSIONS == [".png", ".pdf"]
    assert custom_settings.ALLOWED_MIME_TYPES == ["image/png", "application/pdf"]


def test_settings_dynamic_database_url():
    settings_with_env = Settings(
        _env_file=None,
        DATABASE_URL="",
        POSTGRES_USER="test_user",
        POSTGRES_PASSWORD="",
        POSTGRES_DB="test_db",
        POSTGRES_HOST="db_host",
        POSTGRES_PORT=5432,
    )
    assert settings_with_env.async_database_url == "postgresql+asyncpg://test_user@db_host:5432/test_db"
