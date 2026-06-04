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
        upload_bytes(self.object_path(destination), content, "application/pdf")
        return destination

    def generated_path(self, filename: str) -> Path:
        return ensure_within_directory(self.generated_dir / filename, self.generated_dir)

    def object_path(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(settings.storage_root.resolve()).as_posix()
        except ValueError:
            return path.name

    def ensure_local_file(self, path: Path) -> bool:
        if path.exists():
            return True
        return restore_file(self.object_path(path), path)

    def delete_file(self, path: Path) -> None:
        delete_object(self.object_path(path))
        if path.exists() and path.is_file():
            path.unlink()

    def upload_existing_file(self, path: Path, content_type: str = "application/octet-stream") -> None:
        if path.exists() and path.is_file():
            upload_bytes(self.object_path(path), path.read_bytes(), content_type)

    def create_zip_from_generated_pdfs(self, files: list[Path], zip_name: str) -> Path:
        zip_path = self.generated_path(zip_name)
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for file_path in files:
                archive.write(file_path, arcname=file_path.name)
        upload_bytes(self.object_path(zip_path), zip_path.read_bytes(), "application/zip")
        return zip_path
