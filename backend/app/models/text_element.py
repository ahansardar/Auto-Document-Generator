from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel

from app.models.template import now_utc


class TemplateTextElement(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    template_id: str = Field(index=True, foreign_key="template.id")
    page_number: int
    element_type: str = "text"
    content: str
    image_src: Optional[str] = None
    image_alt: Optional[str] = None
    hyperlink_url: Optional[str] = None
    x: float
    y: float
    width: float
    height: float
    font_family: str = "helvetica"
    font_size: float = 24
    font_weight: str = "400"
    font_style: str = "normal"
    is_bold: bool = False
    is_italic: bool = False
    is_underline: bool = False
    is_strikethrough: bool = False
    text_color: str = "#111827"
    background_color: Optional[str] = None
    text_opacity: float = 1
    background_opacity: float = 0
    text_align: str = "left"
    vertical_align: str = "top"
    line_height: float = 1.2
    letter_spacing: float = 0
    word_spacing: float = 0
    text_transform: str = "none"
    padding_top: float = 0
    padding_right: float = 0
    padding_bottom: float = 0
    padding_left: float = 0
    border_width: float = 0
    border_color: str = "#000000"
    border_style: str = "solid"
    border_radius: float = 0
    rotation: float = 0
    z_index: int = 0
    locked: bool = False
    auto_shrink: bool = False
    clip_overflow: bool = True
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)
