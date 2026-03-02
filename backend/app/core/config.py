from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database — Railway provides postgresql://, we need postgresql+asyncpg://
    database_url: str = "postgresql+asyncpg://shuk:shuk@localhost:5432/shuk"

    # TASE API
    tase_api_key: str = ""
    tase_api_base_url: str = "https://api.tase.co.il/api"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Rate limiting
    tase_rate_limit_requests: int = 10
    tase_rate_limit_window_seconds: float = 2.0

    def model_post_init(self, __context) -> None:
        # Normalise Railway / Supabase connection strings
        if self.database_url.startswith("postgres://"):
            object.__setattr__(
                self, "database_url",
                self.database_url.replace("postgres://", "postgresql+asyncpg://", 1),
            )
        elif self.database_url.startswith("postgresql://"):
            object.__setattr__(
                self, "database_url",
                self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1),
            )


settings = Settings()
