import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import editor, generation, templates, uploads
from app.config import get_settings
from app.database import create_db_and_tables
from app.database import engine
from app.models.generated_document import GeneratedDocument
from app.services.storage_service import StorageService

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[*settings.frontend_origins, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Generated-Count", "X-Generation-Error-Count"],
)


@app.on_event("startup")
def on_startup() -> None:
    settings.originals_dir.mkdir(parents=True, exist_ok=True)
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    create_db_and_tables()
    purge_legacy_generated_files()


def purge_legacy_generated_files() -> None:
    """Remove files and rows created before generation became stateless."""
    storage = StorageService()
    with Session(engine) as session:
        documents = list(session.exec(select(GeneratedDocument)).all())
        for document in documents:
            storage.delete_file(document.generated_pdf_path)
            session.delete(document)
        if documents:
            session.commit()
            print(f"Purged {len(documents)} legacy generated PDF record(s).")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(templates.router)
app.include_router(generation.router)
app.include_router(uploads.router)
app.include_router(editor.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
