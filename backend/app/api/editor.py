from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session

from app.database import get_session
from app.models.custom_font import CustomFont
from app.services.font_service import list_editor_fonts, save_custom_font
from app.services.storage_service import StorageService

router = APIRouter(prefix="/api/editor", tags=["editor"])


@router.get("/health")
def editor_health() -> dict[str, str]:
    return {"status": "ready"}


@router.get("/fonts")
def editor_fonts(session: Session = Depends(get_session)) -> list[dict[str, str | None]]:
    return list_editor_fonts(session)


@router.post("/fonts")
async def upload_editor_font(
    file: UploadFile = File(...),
    family: str | None = Form(default=None),
    session: Session = Depends(get_session),
) -> dict[str, str | None]:
    font = await save_custom_font(session, file, family)
    return {
        "id": font.id,
        "family": font.family,
        "file_path": font.font_path,
        "file_url": f"/api/editor/fonts/{font.id}/file",
        "source": "custom",
    }


@router.get("/fonts/{font_id}/file")
def get_editor_font_file(font_id: str, session: Session = Depends(get_session)) -> FileResponse:
    font = session.get(CustomFont, font_id)
    if not font:
        raise HTTPException(status_code=404, detail="Font not found")
    path = StorageService().ensure_local_file(font.font_path)
    if not path:
        raise HTTPException(status_code=404, detail="Font file not found")
    media_type = "font/otf" if path.suffix.lower() == ".otf" else "font/ttf"
    return FileResponse(path, media_type=media_type, filename=font.original_filename)
