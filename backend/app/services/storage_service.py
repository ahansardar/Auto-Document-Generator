import zipfile
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import get_settings
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
        return destination

    def generated_path(self, filename: str) -> Path:
        return ensure_within_directory(self.generated_dir / filename, self.generated_dir)

    def create_zip_from_generated_pdfs(self, files: list[Path], zip_name: str) -> Path:
        zip_path = self.generated_path(zip_name)
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for file_path in files:
                archive.write(file_path, arcname=file_path.name)
        return zip_path
