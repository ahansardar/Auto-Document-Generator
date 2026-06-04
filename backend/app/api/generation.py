import json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from app.database import get_session
from app.models.generated_document import GeneratedDocument
from app.models.variable import TemplateVariable
from app.schemas.generation import BatchGenerateResponse, BatchMailResponse, GenerateRequest, GenerateResponse, MailTemplateIn
from app.services.mail_service import send_certificate_email
from app.services.pdf_service import generate_batch_from_template, generate_pdf_from_template, render_pdf_bytes_from_template
from app.services.storage_service import StorageService
from app.services.validation_service import validate_batch_rows, validate_batch_upload_schema
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
    validate_batch_upload_schema(variables, rows)
    valid_rows, errors = validate_batch_rows(variables, rows)
    generated = generate_batch_from_template(session, template_id, valid_rows)
    zip_path = StorageService().create_zip_from_generated_refs(
        [document.generated_pdf_path for document in generated],
        f"{template_id}-batch-{uuid4()}.zip",
    )

    return BatchGenerateResponse(
        zip_download_url=f"/api/generated/download-file/{zip_path.name}",
        generated_document_ids=[document.id for document in generated],
        errors=errors,
    )


@router.post("/api/templates/{template_id}/email-batch", response_model=BatchMailResponse)
async def email_batch(
    template_id: str,
    file: UploadFile = File(...),
    mail_template_json: str = Form(...),
    session: Session = Depends(get_session),
) -> BatchMailResponse:
    content = await file.read()
    filename = (file.filename or "").lower()
    try:
        rows = parse_csv_to_rows(content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        mail_template = MailTemplateIn.model_validate(json.loads(mail_template_json))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid mail template settings") from exc

    if rows and mail_template.email_column not in rows[0]:
        raise HTTPException(status_code=422, detail=f"Email column not found: {mail_template.email_column}")
    if filename and not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Email batch requires a CSV file")

    variables = list(session.exec(select(TemplateVariable).where(TemplateVariable.template_id == template_id)).all())
    validate_batch_upload_schema(variables, rows, allowed_extra_columns={mail_template.email_column})
    valid_rows, errors = validate_batch_rows(variables, rows)

    sent = 0
    for index, row in enumerate(valid_rows, start=1):
        try:
            pdf_bytes, generation_data = render_pdf_bytes_from_template(session, template_id, row)
            send_certificate_email(mail_template, generation_data, pdf_bytes)
            sent += 1
        except Exception as exc:
            errors.append({"row": index, "errors": [str(exc)]})

    return BatchMailResponse(attempted=len(valid_rows), sent=sent, errors=errors)


@router.get("/api/generated", response_model=list[GeneratedDocument])
def list_generated(session: Session = Depends(get_session)) -> list[GeneratedDocument]:
    return list(session.exec(select(GeneratedDocument).order_by(GeneratedDocument.created_at.desc())).all())


@router.get("/api/generated/{document_id}/download")
def download_generated(document_id: str, session: Session = Depends(get_session)) -> FileResponse:
    document = session.get(GeneratedDocument, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Generated PDF not found")
    path = StorageService().ensure_local_file(document.generated_pdf_path)
    if not path:
        raise HTTPException(status_code=404, detail="Generated PDF not found")
    return FileResponse(path, media_type="application/pdf", filename=f"{document_id}.pdf")


@router.get("/api/generated/download-file/{filename}")
def download_generated_file(filename: str) -> FileResponse:
    path = StorageService().generated_path(filename)
    if not StorageService().ensure_local_file(path):
        raise HTTPException(status_code=404, detail="Generated file not found")
    return FileResponse(path, media_type="application/zip", filename=filename)
