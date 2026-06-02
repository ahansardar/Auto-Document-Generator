from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from app.database import get_session
from app.models.generated_document import GeneratedDocument
from app.models.variable import TemplateVariable
from app.schemas.generation import BatchGenerateResponse, GenerateRequest, GenerateResponse
from app.services.pdf_service import generate_batch_from_template, generate_pdf_from_template
from app.services.storage_service import StorageService
from app.services.validation_service import validate_batch_rows
from app.utils.csv_utils import parse_csv_to_rows, parse_json_to_rows

router = APIRouter(tags=["generation"])


@router.post("/api/templates/{template_id}/generate", response_model=GenerateResponse)
def generate_one(template_id: str, payload: GenerateRequest, session: Session = Depends(get_session)) -> GenerateResponse:
    generated = generate_pdf_from_template(session, template_id, payload.data)
    return GenerateResponse(
        generated_document_id=generated.id,
        download_url=f"/api/generated/{generated.id}/download",
    )


@router.post("/api/templates/{template_id}/generate-batch", response_model=BatchGenerateResponse)
async def generate_batch(template_id: str, file: UploadFile = File(...), session: Session = Depends(get_session)) -> BatchGenerateResponse:
    content = await file.read()
    filename = (file.filename or "").lower()
    try:
        rows = parse_json_to_rows(content) if filename.endswith(".json") else parse_csv_to_rows(content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    variables = list(session.exec(select(TemplateVariable).where(TemplateVariable.template_id == template_id)).all())
    valid_rows, errors = validate_batch_rows(variables, rows)
    generated = generate_batch_from_template(session, template_id, valid_rows)
    files = [Path(document.generated_pdf_path) for document in generated]
    zip_path = StorageService().create_zip_from_generated_pdfs(files, f"{template_id}-batch-{uuid4()}.zip")

    return BatchGenerateResponse(
        zip_download_url=f"/api/generated/download-file/{zip_path.name}",
        generated_document_ids=[document.id for document in generated],
        errors=errors,
    )


@router.get("/api/generated", response_model=list[GeneratedDocument])
def list_generated(session: Session = Depends(get_session)) -> list[GeneratedDocument]:
    return list(session.exec(select(GeneratedDocument).order_by(GeneratedDocument.created_at.desc())).all())


@router.get("/api/generated/{document_id}/download")
def download_generated(document_id: str, session: Session = Depends(get_session)) -> FileResponse:
    document = session.get(GeneratedDocument, document_id)
    if not document or not Path(document.generated_pdf_path).exists():
        raise HTTPException(status_code=404, detail="Generated PDF not found")
    return FileResponse(document.generated_pdf_path, media_type="application/pdf", filename=f"{document_id}.pdf")


@router.get("/api/generated/download-file/{filename}")
def download_generated_file(filename: str) -> FileResponse:
    path = StorageService().generated_path(filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Generated file not found")
    return FileResponse(path, media_type="application/zip", filename=filename)
