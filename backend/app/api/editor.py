from fastapi import APIRouter

from app.services.font_service import list_system_fonts

router = APIRouter(prefix="/api/editor", tags=["editor"])


@router.get("/health")
def editor_health() -> dict[str, str]:
    return {"status": "ready"}


@router.get("/fonts")
def editor_fonts() -> list[dict[str, str | None]]:
    return list_system_fonts()
