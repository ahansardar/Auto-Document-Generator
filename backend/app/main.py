from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import editor, generation, templates, uploads
from app.config import get_settings
from app.database import create_db_and_tables

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    settings.originals_dir.mkdir(parents=True, exist_ok=True)
    settings.generated_dir.mkdir(parents=True, exist_ok=True)
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    create_db_and_tables()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(templates.router)
app.include_router(generation.router)
app.include_router(uploads.router)
app.include_router(editor.router)
