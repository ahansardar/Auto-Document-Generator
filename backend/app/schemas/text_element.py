from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TextElementBase(BaseModel):
    page_number: int = Field(ge=1)
    element_type: str = "text"
    content: str
    image_src: Optional[str] = None
    image_alt: Optional[str] = None
    hyperlink_url: Optional[str] = None
    x: float = Field(ge=0)
    y: float = Field(ge=0)
    width: float = Field(gt=1)
    height: float = Field(gt=1)
    font_family: str = "helvetica"
    font_size: float = Field(default=24, ge=4, le=300)
    font_weight: str = "400"
    font_style: str = "normal"
    is_bold: bool = False
    is_italic: bool = False
    is_underline: bool = False
    is_strikethrough: bool = False
    text_color: str = "#111827"
    background_color: Optional[str] = None
    text_opacity: float = Field(default=1, ge=0, le=1)
    background_opacity: float = Field(default=0, ge=0, le=1)
    text_align: str = "left"
    vertical_align: str = "top"
    line_height: float = Field(default=1.2, ge=0.5, le=4)
    letter_spacing: float = Field(default=0, ge=-20, le=80)
    word_spacing: float = Field(default=0, ge=-20, le=120)
    text_transform: str = "none"
    padding_top: float = Field(default=0, ge=0)
    padding_right: float = Field(default=0, ge=0)
    padding_bottom: float = Field(default=0, ge=0)
    padding_left: float = Field(default=0, ge=0)
    border_width: float = Field(default=0, ge=0, le=40)
    border_color: str = "#000000"
    border_style: str = "solid"
    border_radius: float = Field(default=0, ge=0)
    rotation: float = 0
    z_index: int = 0
    locked: bool = False
    auto_shrink: bool = False
    clip_overflow: bool = True


class TextElementIn(TextElementBase):
    id: Optional[str] = None


class TextElementOut(TextElementBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
