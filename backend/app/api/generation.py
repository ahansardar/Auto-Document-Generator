import json
import io
import zipfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.database import get_session
from app.models.variable import TemplateVariable
from app.schemas.generation import BatchMailResponse, GenerateRequest, MailTemplateIn
from app.services.mail_service import send_certificate_email
from app.services.pdf_service import render_pdf_bytes_from_template
from app.services.validation_service import validate_batch_rows, validate_batch_upload_schema
from app.utils.csv_utils import parse_csv_to_rows, parse_json_to_rows

router = APIRouter(tags=["generation"])


@router.post("/api/templates/{template_id}/generate")
def generate_one(template_id: str, payload: GenerateRequest, session: Session = Depends(get_session)) -> StreamingResponse:
    pdf_bytes, _ = render_pdf_bytes_from_template(session, template_id, payload.data)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{template_id}.pdf"',
            "Cache-Control": "no-store",
        },
    )


@router.post("/api/templates/{template_id}/generate-batch")
async def generate_batch(template_id: str, file: UploadFile = File(...), session: Session = Depends(get_session)) -> StreamingResponse:
    content = await file.read()
    filename = (file.filename or "").lower()
    try:
        rows = parse_json_to_rows(content) if filename.endswith(".json") else parse_csv_to_rows(content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    variables = list(session.exec(select(TemplateVariable).where(TemplateVariable.template_id == template_id)).all())
    validate_batch_upload_schema(variables, rows)
    valid_rows, errors = validate_batch_rows(variables, rows)
    archive_buffer = io.BytesIO()
    generated_count = 0
    with zipfile.ZipFile(archive_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for index, row in enumerate(valid_rows, start=1):
            try:
                pdf_bytes, _ = render_pdf_bytes_from_template(session, template_id, row)
                archive.writestr(f"certificate-{index:04d}.pdf", pdf_bytes)
                generated_count += 1
            except Exception as exc:
                errors.append({"row": index, "errors": [str(exc)]})
        if errors:
            archive.writestr("generation-errors.json", json.dumps(errors, indent=2))
    archive_buffer.seek(0)

    return StreamingResponse(
        archive_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{template_id}-batch.zip"',
            "Cache-Control": "no-store",
            "X-Generated-Count": str(generated_count),
            "X-Generation-Error-Count": str(len(errors)),
        },
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
    validate_batch_upload_schema(
        variables,
        rows,
        allowed_extra_columns={mail_template.email_column},
        allow_unknown_columns=True,
    )
    valid_rows, errors = validate_batch_rows(variables, rows)

    sent = 0
    for index, row in enumerate(valid_rows, start=1):
        try:
            pdf_bytes, generation_data = render_pdf_bytes_from_template(session, template_id, row, preserve_extra_fields=True)
            send_certificate_email(mail_template, generation_data, pdf_bytes)
            sent += 1
        except Exception as exc:
            errors.append({"row": index, "errors": [str(exc)]})

    return BatchMailResponse(attempted=len(valid_rows), sent=sent, errors=errors)


@router.get("/api/generated")
def list_generated() -> list:
    """Generated PDFs are intentionally ephemeral and are never catalogued here."""
    return []


@router.get("/api/generated/{document_id}/download")
def download_generated(document_id: str) -> None:
    raise HTTPException(status_code=410, detail="Generated PDFs are not stored. Generate this document again.")


@router.get("/api/generated/download-file/{filename}")
def download_generated_file(filename: str) -> None:
    raise HTTPException(status_code=410, detail="Generated archives are not stored. Generate this batch again.")
