from fastapi import APIRouter

router = APIRouter(prefix="/api/editor", tags=["editor"])


@router.get("/health")
def editor_health() -> dict[str, str]:
    return {"status": "ready"}
