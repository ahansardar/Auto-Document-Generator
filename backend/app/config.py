from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Certificate Template Editor"
    backend_dir: Path = Path(__file__).resolve().parents[1]
    database_url: str = "sqlite:///data/app.db"
    max_upload_bytes: int = 25 * 1024 * 1024
    frontend_origin: str = "http://localhost:3000"

    @property
    def frontend_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]

    @property
    def originals_dir(self) -> Path:
        return self.backend_dir / "storage" / "templates" / "originals"

    @property
    def generated_dir(self) -> Path:
        return self.backend_dir / "storage" / "generated"

    @property
    def data_dir(self) -> Path:
        return self.backend_dir / "data"


@lru_cache
def get_settings() -> Settings:
    return Settings()
