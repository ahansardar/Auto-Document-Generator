import base64
import json
import re
from pathlib import Path
from uuid import uuid4

import fitz
from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.generated_document import GeneratedDocument
from app.models.template import Template, TemplatePage
from app.models.text_element import TemplateTextElement
from app.models.variable import TemplateVariable
from app.services.coordinate_service import browser_to_pdf_coords
from app.services.font_service import font_file_for_family
from app.services.storage_service import StorageService
from app.services.validation_service import validate_generation_data
from app.utils.text_utils import replace_variables


def read_pdf_pages(path: Path) -> list[TemplatePage]:
    try:
        document = fitz.open(path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not read PDF page information") from exc

    pages: list[TemplatePage] = []
    for index, page in enumerate(document, start=1):
        pages.append(TemplatePage(page_number=index, source_page_number=index, width=page.rect.width, height=page.rect.height))
    document.close()
    return pages


def _hex_to_rgb(color: str | None) -> tuple[float, float, float]:
    if not color:
        return (0, 0, 0)
    value = color.strip().lstrip("#")
    if len(value) != 6:
        return (0, 0, 0)
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))


def _fitz_font(element: TemplateTextElement) -> tuple[str, str | None]:
    font_file = font_file_for_family(element.font_family)
    if font_file:
        safe_name = "".join(character for character in element.font_family if character.isalnum()) or "custom"
        return (safe_name[:32], font_file)
    if element.is_bold and element.is_italic:
        return ("hebo", None)
    if element.is_bold:
        return ("hebo", None)
    if element.is_italic:
        return ("heit", None)
    return ("helv", None)


def _apply_transform(text: str, transform: str) -> str:
    if transform == "uppercase":
        return text.upper()
    if transform == "lowercase":
        return text.lower()
    if transform == "capitalize":
        return text.title()
    return text


def _align_value(align: str) -> int:
    return {"left": 0, "center": 1, "right": 2, "justify": 3}.get(align, 0)


def _element_rect(page: fitz.Page, element: TemplateTextElement) -> fitz.Rect:
    pdf_box = browser_to_pdf_coords(element.x, element.y, element.width, element.height, page.rect.height)
    return fitz.Rect(pdf_box.x, pdf_box.y, pdf_box.x + pdf_box.width, pdf_box.y + pdf_box.height)


def _draw_background_and_border(page: fitz.Page, rect: fitz.Rect, element: TemplateTextElement) -> None:
    if element.background_color and element.background_opacity > 0:
        page.draw_rect(
            rect,
            color=None,
            fill=_hex_to_rgb(element.background_color),
            fill_opacity=element.background_opacity,
            overlay=True,
        )
    if element.border_width > 0:
        page.draw_rect(
            rect,
            color=_hex_to_rgb(element.border_color),
            width=element.border_width,
            overlay=True,
        )


def _add_link(page: fitz.Page, rect: fitz.Rect, element: TemplateTextElement, data: dict[str, str]) -> None:
    uri = replace_variables(element.hyperlink_url or "", data).strip()
    if not uri:
        return
    if not re.match(r"^[a-z][a-z0-9+.-]*://", uri, re.IGNORECASE):
        uri = f"https://{uri}"
    page.insert_link({"kind": fitz.LINK_URI, "from": rect, "uri": uri})


def _image_bytes(image_src: str | None) -> bytes | None:
    if not image_src:
        return None
    if image_src.startswith("data:") and "," in image_src:
        image_src = image_src.split(",", 1)[1]
    try:
        return base64.b64decode(image_src, validate=False)
    except Exception:
        return None


def draw_image_element(page: fitz.Page, element: TemplateTextElement, data: dict[str, str]) -> None:
    rect = _element_rect(page, element)
    _draw_background_and_border(page, rect, element)
    content = _image_bytes(element.image_src)
    if content:
        page.insert_image(rect, stream=content, keep_proportion=False, overlay=True)
    _add_link(page, rect, element, data)


def draw_text_element(page: fitz.Page, element: TemplateTextElement, data: dict[str, str]) -> None:
    rect = _element_rect(page, element)

    _draw_background_and_border(page, rect, element)

    content = _apply_transform(replace_variables(element.content, data), element.text_transform)
    text_rect = fitz.Rect(
        rect.x0 + element.padding_left,
        rect.y0 + element.padding_top,
        rect.x1 - element.padding_right,
        rect.y1 - element.padding_bottom,
    )
    fontsize = element.font_size
    fontname, fontfile = _fitz_font(element)
    if element.auto_shrink:
        while fontsize > 4:
            result = page.insert_textbox(
                text_rect,
                content,
                fontsize=fontsize,
                fontname=fontname,
                fontfile=fontfile,
                color=_hex_to_rgb(element.text_color),
                align=_align_value(element.text_align),
                fill_opacity=element.text_opacity,
                overlay=True,
            )
            if result >= 0:
                _add_link(page, rect, element, data)
                return
            fontsize -= 1

    page.insert_textbox(
        text_rect,
        content,
        fontsize=fontsize,
        fontname=fontname,
        fontfile=fontfile,
        color=_hex_to_rgb(element.text_color),
        align=_align_value(element.text_align),
        fill_opacity=element.text_opacity,
        overlay=True,
    )
    _add_link(page, rect, element, data)


def draw_element(page: fitz.Page, element: TemplateTextElement, data: dict[str, str]) -> None:
    if element.element_type == "image":
        draw_image_element(page, element, data)
        return
    draw_text_element(page, element, data)


def render_pdf_bytes_from_template(session: Session, template_id: str, data: dict, preserve_extra_fields: bool = False) -> tuple[bytes, dict[str, str]]:
    template = session.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    variables = session.exec(select(TemplateVariable).where(TemplateVariable.template_id == template_id)).all()
    generation_data = validate_generation_data(list(variables), data, preserve_extra_fields=preserve_extra_fields)
    elements = session.exec(
        select(TemplateTextElement)
        .where(TemplateTextElement.template_id == template_id)
        .order_by(TemplateTextElement.page_number, TemplateTextElement.z_index)
    ).all()

    storage = StorageService()
    original_path = storage.ensure_local_file(template.original_pdf_path)
    if not original_path:
        raise HTTPException(status_code=404, detail="Original template PDF is missing from storage")

    source_document = fitz.open(original_path)
    pages = session.exec(
        select(TemplatePage)
        .where(TemplatePage.template_id == template_id)
        .order_by(TemplatePage.page_number)
    ).all()
    if not pages:
        source_document.close()
        raise HTTPException(status_code=422, detail="Template has no active pages")

    document = fitz.open()
    for page in pages:
        source_index = (page.source_page_number or page.page_number) - 1
        if 0 <= source_index < len(source_document):
            document.insert_pdf(source_document, from_page=source_index, to_page=source_index)
    source_document.close()

    for element in elements:
        page_index = element.page_number - 1
        if 0 <= page_index < len(document):
            draw_element(document[page_index], element, generation_data)

    pdf_bytes = document.tobytes(garbage=4, deflate=True)
    document.close()

    return pdf_bytes, generation_data


def generate_pdf_from_template(session: Session, template_id: str, data: dict) -> GeneratedDocument:
    pdf_bytes, generation_data = render_pdf_bytes_from_template(session, template_id, data)

    storage = StorageService()
    output_path = storage.generated_path(f"{template_id}-{uuid4()}.pdf")
    output_path.write_bytes(pdf_bytes)
    generated_ref = storage.upload_existing_file_ref(output_path, "application/pdf")

    generated = GeneratedDocument(
        template_id=template_id,
        data_json=json.dumps(generation_data),
        generated_pdf_path=generated_ref,
    )
    session.add(generated)
    session.commit()
    session.refresh(generated)
    return generated


def generate_batch_from_template(session: Session, template_id: str, rows: list[dict]) -> list[GeneratedDocument]:
    return [generate_pdf_from_template(session, template_id, row) for row in rows]
