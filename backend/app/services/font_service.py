from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlmodel import Session, select

from app.config import get_settings
from app.models.custom_font import CustomFont
from app.models.template import now_utc
from app.services.storage_service import StorageService
from app.services.supabase_storage import upload_bytes


FALLBACK_FONTS = [
    {"family": "Helvetica", "file_path": None},
    {"family": "Arial", "file_path": None},
    {"family": "Times New Roman", "file_path": None},
    {"family": "Georgia", "file_path": None},
    {"family": "Verdana", "file_path": None},
    {"family": "Tahoma", "file_path": None},
    {"family": "Courier New", "file_path": None},
]

FONT_EXTENSIONS = {".ttf", ".otf", ".ttc"}
FONT_MIME_TYPES = {
    "font/ttf",
    "font/otf",
    "font/collection",
    "application/font-sfnt",
    "application/x-font-ttf",
    "application/x-font-otf",
    "application/octet-stream",
}

settings = get_settings()


@lru_cache(maxsize=1)
def list_system_fonts() -> list[dict[str, str | None]]:
    fonts = _windows_registry_fonts() or _font_directory_fonts()
    merged: dict[str, dict[str, str | None]] = {font["family"].lower(): font for font in FALLBACK_FONTS}
    for font in fonts:
        family = font["family"].strip()
        if not family:
            continue
        merged[family.lower()] = {"family": family, "file_path": font.get("file_path")}
    return sorted(merged.values(), key=lambda font: str(font["family"]).lower())


def list_editor_fonts(session: Session) -> list[dict[str, str | None]]:
    merged = {font["family"].lower(): {**font, "source": "system", "id": None, "file_url": None} for font in list_system_fonts()}
    custom_fonts = session.exec(select(CustomFont).order_by(CustomFont.family)).all()
    for font in custom_fonts:
        merged[font.family.strip().lower()] = {
            "id": font.id,
            "family": font.family,
            "file_path": font.font_path,
            "file_url": f"/api/editor/fonts/{font.id}/file",
            "source": "custom",
        }
    return sorted(merged.values(), key=lambda font: str(font["family"]).lower())


def font_file_for_family(family: str | None) -> str | None:
    if not family:
        return None
    target = family.strip().lower()
    for font in list_system_fonts():
        if str(font["family"]).strip().lower() == target:
            return font.get("file_path")
    custom = custom_font_for_family(target)
    if custom:
        path = StorageService().ensure_local_file(custom.font_path)
        return str(path) if path else None
    return None


def custom_font_for_family(family: str) -> CustomFont | None:
    from app.database import engine

    with Session(engine) as session:
        return session.exec(select(CustomFont).where(CustomFont.family == family)).first() or session.exec(
            select(CustomFont).where(CustomFont.family.ilike(family))
        ).first()


async def save_custom_font(session: Session, file: UploadFile, family: str | None = None) -> CustomFont:
    filename = file.filename or "custom-font"
    extension = Path(filename).suffix.lower()
    if extension not in FONT_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Upload a .ttf, .otf, or .ttc font file")
    if file.content_type and file.content_type not in FONT_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported font file type")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Font file is empty")
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Font file must be 15 MB or smaller")

    cleaned_family = clean_font_family(family or Path(filename).stem)
    object_name = f"{uuid4()}{extension}"
    local_path = settings.storage_root / "fonts" / "custom" / object_name
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(content)

    object_path = StorageService().object_path(local_path)
    upload_bytes(object_path, content, "application/octet-stream")
    storage_ref = StorageService().object_ref(object_path)

    existing = session.exec(select(CustomFont).where(CustomFont.family == cleaned_family)).first()
    if existing:
        existing.original_filename = filename
        existing.font_path = storage_ref
        existing.updated_at = now_utc()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    custom_font = CustomFont(
        family=cleaned_family,
        original_filename=filename,
        font_path=storage_ref,
    )
    session.add(custom_font)
    session.commit()
    session.refresh(custom_font)
    return custom_font


def clean_font_family(value: str) -> str:
    family = " ".join(value.replace("_", " ").replace("-", " ").split()).strip()
    return family[:80] or "Custom Font"


def _windows_registry_fonts() -> list[dict[str, str | None]]:
    try:
        import winreg
    except ImportError:
        return []

    fonts_dir = Path("C:/Windows/Fonts")
    registry_path = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"
    discovered: list[dict[str, str | None]] = []
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, registry_path) as key:
            index = 0
            while True:
                try:
                    display_name, filename, _ = winreg.EnumValue(key, index)
                except OSError:
                    break
                index += 1
                if not str(filename).lower().endswith((".ttf", ".otf", ".ttc")):
                    continue
                family = _clean_windows_font_name(display_name)
                path = Path(filename)
                if not path.is_absolute():
                    path = fonts_dir / path
                discovered.append({"family": family, "file_path": str(path) if path.exists() else None})
    except OSError:
        return []
    return discovered


def _font_directory_fonts() -> list[dict[str, str | None]]:
    candidates = [Path("C:/Windows/Fonts"), Path("/System/Library/Fonts"), Path("/Library/Fonts"), Path("/usr/share/fonts")]
    discovered: list[dict[str, str | None]] = []
    for root in candidates:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if path.suffix.lower() in {".ttf", ".otf", ".ttc"}:
                discovered.append({"family": path.stem.replace("-", " "), "file_path": str(path)})
    return discovered


def _clean_windows_font_name(display_name: str) -> str:
    name = display_name.split("(")[0].strip()
    suffixes = [" Regular", " Bold", " Italic", " Oblique", " Light", " Semibold", " Semilight", " Black"]
    for suffix in suffixes:
        if name.endswith(suffix):
            return name[: -len(suffix)].strip()
    return name
