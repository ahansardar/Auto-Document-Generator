from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.text_element import TextElementIn, TextElementOut
from app.schemas.variable import VariableIn, VariableOut


class TemplatePageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    page_number: int
    width: float
    height: float


class TemplateListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    original_filename: str
    page_count: int
    status: str
    created_at: datetime
    updated_at: datetime


class TemplateDetailOut(TemplateListOut):
    pages: list[TemplatePageOut]
    text_elements: list[TextElementOut]
    variables: list[VariableOut]


class TemplateUpdateIn(BaseModel):
    name: str | None = None
    status: str | None = None


class TemplateSaveLayoutIn(BaseModel):
    name: str
    text_elements: list[TextElementIn]
    variables: list[VariableIn] = []
