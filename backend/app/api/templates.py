from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session, delete, select

from app.database import get_session
from app.models.generated_document import GeneratedDocument
from app.models.template import Template, TemplatePage, now_utc
from app.models.text_element import TemplateTextElement
from app.models.variable import TemplateVariable
from app.schemas.template import TemplateDetailOut, TemplateListOut, TemplatePageLayoutIn, TemplateSaveLayoutIn, TemplateUpdateIn
from app.services.pdf_service import read_pdf_pages
from app.services.storage_service import StorageService
from app.utils.text_utils import extract_variables_from_elements

router = APIRouter(prefix="/api/templates", tags=["templates"])


def _template_detail(session: Session, template_id: str) -> TemplateDetailOut:
    template = session.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    pages = session.exec(select(TemplatePage).where(TemplatePage.template_id == template_id).order_by(TemplatePage.page_number)).all()
    elements = session.exec(select(TemplateTextElement).where(TemplateTextElement.template_id == template_id)).all()
    variables = session.exec(select(TemplateVariable).where(TemplateVariable.template_id == template_id).order_by(TemplateVariable.name)).all()
    return TemplateDetailOut.model_validate(
        {
            **template.model_dump(),
            "pages": pages,
            "text_elements": elements,
            "variables": variables,
        }
    )


def _delete_file(path_value: str | None) -> None:
    if not path_value:
        return
    path = Path(path_value)
    if path.exists() and path.is_file():
        path.unlink()


@router.post("/upload", response_model=TemplateDetailOut)
async def upload_template(file: UploadFile, session: Session = Depends(get_session)) -> TemplateDetailOut:
    storage = StorageService()
    path = await storage.save_upload(file)
    pages = read_pdf_pages(path)
    if not pages:
        raise HTTPException(status_code=400, detail="PDF does not contain any pages")

    template = Template(
        name=Path(file.filename or "Untitled template").stem,
        original_pdf_path=str(path),
        original_filename=file.filename or path.name,
        page_count=len(pages),
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    for page in pages:
        page.template_id = template.id
        session.add(page)
    session.commit()
    return _template_detail(session, template.id)


@router.get("", response_model=list[TemplateListOut])
def list_templates(session: Session = Depends(get_session)) -> list[Template]:
    return list(session.exec(select(Template).order_by(Template.updated_at.desc())).all())


@router.get("/{template_id}", response_model=TemplateDetailOut)
def get_template(template_id: str, session: Session = Depends(get_session)) -> TemplateDetailOut:
    return _template_detail(session, template_id)


@router.get("/{template_id}/original.pdf")
def get_original_pdf(template_id: str, session: Session = Depends(get_session)) -> FileResponse:
    template = session.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    path = Path(template.original_pdf_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Original PDF not found")
    return FileResponse(path, media_type="application/pdf", filename=template.original_filename)


@router.put("/{template_id}", response_model=TemplateDetailOut)
def update_template(template_id: str, payload: TemplateUpdateIn, session: Session = Depends(get_session)) -> TemplateDetailOut:
    template = session.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if payload.name is not None:
        template.name = payload.name
    if payload.status is not None:
        template.status = payload.status
    template.updated_at = now_utc()
    session.add(template)
    session.commit()
    return _template_detail(session, template_id)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, session: Session = Depends(get_session)) -> None:
    template = session.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    generated_documents = session.exec(select(GeneratedDocument).where(GeneratedDocument.template_id == template_id)).all()
    for document in generated_documents:
        _delete_file(document.generated_pdf_path)
        session.delete(document)

    session.exec(delete(TemplateVariable).where(TemplateVariable.template_id == template_id))
    session.exec(delete(TemplateTextElement).where(TemplateTextElement.template_id == template_id))
    session.exec(delete(TemplatePage).where(TemplatePage.template_id == template_id))
    _delete_file(template.original_pdf_path)
    session.delete(template)
    session.commit()


@router.put("/{template_id}/pages", response_model=TemplateDetailOut)
def update_pages(template_id: str, payload: TemplatePageLayoutIn, session: Session = Depends(get_session)) -> TemplateDetailOut:
    template = session.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    requested_sources = payload.source_page_numbers
    if not requested_sources:
        raise HTTPException(status_code=422, detail="Template must keep at least one page")
    if len(requested_sources) != len(set(requested_sources)):
        raise HTTPException(status_code=422, detail="Page order cannot contain duplicates")

    pages = session.exec(select(TemplatePage).where(TemplatePage.template_id == template_id)).all()
    pages_by_source = {page.source_page_number or page.page_number: page for page in pages}
    missing_sources = [source for source in requested_sources if source not in pages_by_source]
    if missing_sources:
        raise HTTPException(status_code=422, detail=f"Unknown template pages: {', '.join(map(str, missing_sources))}")

    old_page_by_source = {
        page.source_page_number or page.page_number: page.page_number
        for page in pages
    }
    new_page_by_old_page = {
        old_page_by_source[source]: index
        for index, source in enumerate(requested_sources, start=1)
    }

    for page in pages:
        source_page_number = page.source_page_number or page.page_number
        if source_page_number not in requested_sources:
            session.delete(page)
            continue
        page.page_number = requested_sources.index(source_page_number) + 1
        page.source_page_number = source_page_number
        session.add(page)

    elements = session.exec(select(TemplateTextElement).where(TemplateTextElement.template_id == template_id)).all()
    remaining_elements: list[TemplateTextElement] = []
    for element in elements:
        new_page_number = new_page_by_old_page.get(element.page_number)
        if new_page_number is None:
            session.delete(element)
            continue
        element.page_number = new_page_number
        element.updated_at = now_utc()
        session.add(element)
        remaining_elements.append(element)

    remaining_variable_names = set(extract_variables_from_elements(remaining_elements))
    for variable in session.exec(select(TemplateVariable).where(TemplateVariable.template_id == template_id)).all():
        if variable.name not in remaining_variable_names:
            session.delete(variable)

    template.page_count = len(requested_sources)
    template.updated_at = now_utc()
    session.add(template)
    session.commit()
    return _template_detail(session, template_id)


@router.post("/{template_id}/save-layout", response_model=TemplateDetailOut)
def save_layout(template_id: str, payload: TemplateSaveLayoutIn, session: Session = Depends(get_session)) -> TemplateDetailOut:
    template = session.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    page_numbers = {page.page_number for page in session.exec(select(TemplatePage).where(TemplatePage.template_id == template_id)).all()}
    for element in payload.text_elements:
        if element.page_number not in page_numbers:
            raise HTTPException(status_code=422, detail=f"Page {element.page_number} does not exist")

    session.exec(delete(TemplateTextElement).where(TemplateTextElement.template_id == template_id))
    for element in payload.text_elements:
        values = element.model_dump(exclude={"id"})
        if element.id:
            values["id"] = element.id
        session.add(TemplateTextElement(template_id=template_id, **values))

    detected_names = set(extract_variables_from_elements(payload.text_elements))
    manual_by_name = {variable.name: variable for variable in payload.variables}
    existing_by_name = {
        variable.name: variable
        for variable in session.exec(select(TemplateVariable).where(TemplateVariable.template_id == template_id)).all()
    }
    desired_names = detected_names | set(manual_by_name)

    for name, existing in existing_by_name.items():
        if name not in desired_names:
            session.delete(existing)

    for name in sorted(desired_names):
        incoming = manual_by_name.get(name)
        existing = existing_by_name.get(name)
        if existing:
            if incoming:
                existing.label = incoming.label or existing.label or name.replace("_", " ").title()
                existing.type = incoming.type
                existing.required = incoming.required
                existing.default_value = incoming.default_value
                existing.sample_value = incoming.sample_value
                existing.description = incoming.description
                existing.generator_enabled = incoming.generator_enabled
                existing.generator_pattern = incoming.generator_pattern
            existing.updated_at = now_utc()
            session.add(existing)
        else:
            session.add(
                TemplateVariable(
                    template_id=template_id,
                    name=name,
                    label=(incoming.label if incoming and incoming.label else name.replace("_", " ").title()),
                    type=incoming.type if incoming else "text",
                    required=incoming.required if incoming else True,
                    default_value=incoming.default_value if incoming else None,
                    sample_value=incoming.sample_value if incoming else None,
                    description=incoming.description if incoming else None,
                    generator_enabled=incoming.generator_enabled if incoming else False,
                    generator_pattern=incoming.generator_pattern if incoming else None,
                )
            )

    template.name = payload.name
    template.updated_at = now_utc()
    session.add(template)
    session.commit()
    return _template_detail(session, template_id)
