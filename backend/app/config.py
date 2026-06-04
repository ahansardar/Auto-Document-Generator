from functools import lru_cache
import os
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Certificate Template Editor"
    backend_dir: Path = Path(__file__).resolve().parents[1]
    database_url: str = "sqlite:///data/app.db"
    max_upload_bytes: int = 25 * 1024 * 1024
    frontend_origin: str = "http://localhost:3000"
    apps_script_webhook_url: str | None = None
    persistent_storage_dir: Path | None = None
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_bucket: str = "templates"

    @property
    def frontend_origins(self) -> list[str]:
        configured_origins = [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]
        default_origins = [
            "https://auto-document-generator.vercel.app",
            "https://auto-document-generator-zsep.vercel.app",
        ]
        return list(dict.fromkeys([*configured_origins, *default_origins]))

    @property
    def originals_dir(self) -> Path:
        return self.storage_root / "templates" / "originals"

    @property
    def generated_dir(self) -> Path:
        return self.storage_root / "generated"

    @property
    def data_dir(self) -> Path:
        return self.app_data_root / "data"

    @property
    def app_data_root(self) -> Path:
        if self.persistent_storage_dir and self._is_writable_or_mount_candidate(self.persistent_storage_dir):
            return self.persistent_storage_dir
        return self.backend_dir

    @property
    def storage_root(self) -> Path:
        return self.app_data_root / "storage"

    def _is_writable_or_mount_candidate(self, path: Path) -> bool:
        if not path.exists():
            return False
        return os.access(path, os.W_OK)


@lru_cache
def get_settings() -> Settings:
    return Settings()
