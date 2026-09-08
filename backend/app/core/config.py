from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Disaster Management"
    environment: str = "development"
    secret_key: str = "CHANGE_ME"
    access_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173"
    database_url: str = "postgresql+psycopg://disaster:disaster@localhost:5432/disaster"

    bootstrap_admin_email: str = "admin@example.com"
    bootstrap_admin_password: str = "ChangeMe123!"
    bootstrap_admin_name: str = "System Administrator"

    weather_provider: str = "open_meteo"
    osrm_base_url: str = "https://router.project-osrm.org"
    enable_external_routing: bool = False

    sms_provider: str = "disabled"
    msg91_auth_key: str = ""
    msg91_template_id: str = ""
    msg91_sender_id: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    ai_enabled: bool = False
    ai_base_url: str = "https://api.openai.com/v1"
    ai_api_key: str = ""
    ai_model: str = ""

    sentinelhub_client_id: str = ""
    sentinelhub_client_secret: str = ""

    upload_dir: str = "/app/storage/uploads"
    max_upload_mb: int = 15

    _project_root = Path(__file__).resolve().parents[3]
    model_config = SettingsConfigDict(
        env_file=(str(_project_root / ".env"), ".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
