from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.template import now_utc


class TemplateVariable(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    template_id: str = Field(index=True, foreign_key="template.id")
    name: str = Field(index=True)
    label: str
    type: str = "text"
    required: bool = True
    default_value: Optional[str] = None
    sample_value: Optional[str] = None
    description: Optional[str] = None
    generator_enabled: bool = False
    generator_pattern: Optional[str] = None
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)
