from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Template(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str
    original_pdf_path: str
    original_filename: str
    page_count: int
    status: str = "draft"
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


class TemplatePage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    template_id: str = Field(index=True, foreign_key="template.id")
    page_number: int
    width: float
    height: float
