from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel

from app.models.template import now_utc


class GeneratedDocument(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    template_id: str = Field(index=True, foreign_key="template.id")
    data_json: str
    generated_pdf_path: str
    created_at: datetime = Field(default_factory=now_utc)
