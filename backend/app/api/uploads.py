from fastapi import APIRouter

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.get("/health")
def uploads_health() -> dict[str, str]:
    return {"status": "ready"}
