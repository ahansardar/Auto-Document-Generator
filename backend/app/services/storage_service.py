import zipfile
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import get_settings
from app.services.supabase_storage import delete_object, restore_file, upload_bytes
from app.utils.file_utils import ensure_within_directory, safe_pdf_filename

settings = get_settings()


class StorageService:
    def __init__(self) -> None:
        self.originals_dir = settings.originals_dir
        self.generated_dir = settings.generated_dir
        self.originals_dir.mkdir(parents=True, exist_ok=True)
        self.generated_dir.mkdir(parents=True, exist_ok=True)

    def object_ref(self, object_path: str) -> str:
        return f"supabase://{object_path.strip('/')}"

    def object_path_from_ref(self, value: str | Path) -> str:
        text = str(value)
        if text.startswith("supabase://"):
            return text.removeprefix("supabase://").strip("/")
        return self.object_path(Path(text))

    def local_path_for_ref(self, value: str | Path) -> Path:
        object_path = self.object_path_from_ref(value)
        return ensure_within_directory(settings.storage_root / object_path, settings.storage_root)

    async def save_upload(self, file: UploadFile) -> Path:
        if file.content_type not in {"application/pdf", "application/x-pdf"}:
            raise HTTPException(status_code=400, detail="Only PDF uploads are allowed")
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Uploaded file must have a .pdf extension")

        content = await file.read()
        if len(content) > settings.max_upload_bytes:
            raise HTTPException(status_code=413, detail="PDF is larger than the configured upload limit")
        if not content.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF")

        destination = ensure_within_directory(self.originals_dir / safe_pdf_filename(file.filename), self.originals_dir)
        destination.write_bytes(content)
        object_path = self.object_path(destination)
        upload_bytes(object_path, content, "application/pdf")
        return destination

    async def save_upload_ref(self, file: UploadFile) -> tuple[str, Path]:
        path = await self.save_upload(file)
        return self.object_ref(self.object_path(path)), path

    def generated_path(self, filename: str) -> Path:
        return ensure_within_directory(self.generated_dir / filename, self.generated_dir)

    def object_path(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(settings.storage_root.resolve()).as_posix()
        except ValueError:
            return path.name

    def ensure_local_file(self, value: str | Path) -> Path | None:
        path = self.local_path_for_ref(value)
        if path.exists():
            return path
        if restore_file(self.object_path_from_ref(value), path):
            return path
        if not str(value).startswith("supabase://"):
            legacy_path = Path(value)
            if legacy_path.exists():
                return legacy_path
        return None

    def delete_file(self, value: str | Path) -> None:
        delete_object(self.object_path_from_ref(value))
        path = self.local_path_for_ref(value)
        if path.exists() and path.is_file():
            path.unlink()
        if not str(value).startswith("supabase://"):
            legacy_path = Path(value)
            if legacy_path.exists() and legacy_path.is_file():
                legacy_path.unlink()

    def upload_existing_file_ref(self, path: Path, content_type: str = "application/octet-stream") -> str:
        self.upload_existing_file(path, content_type)
        return self.object_ref(self.object_path(path))

    def upload_existing_file(self, path: Path, content_type: str = "application/octet-stream") -> None:
        if path.exists() and path.is_file():
            upload_bytes(self.object_path(path), path.read_bytes(), content_type)

    def path_from_ref(self, value: str | Path) -> Path:
        path = self.ensure_local_file(value)
        if path:
            return path
        raise HTTPException(status_code=404, detail="Stored file not found")

    def create_zip_from_generated_pdfs(self, files: list[Path], zip_name: str) -> Path:
        zip_path = self.generated_path(zip_name)
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for file_path in files:
                archive.write(file_path, arcname=file_path.name)
        upload_bytes(self.object_path(zip_path), zip_path.read_bytes(), "application/zip")
        return zip_path

    def create_zip_from_generated_refs(self, file_refs: list[str], zip_name: str) -> Path:
        return self.create_zip_from_generated_pdfs([self.path_from_ref(file_ref) for file_ref in file_refs], zip_name)
