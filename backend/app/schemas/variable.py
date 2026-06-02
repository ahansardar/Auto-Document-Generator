from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.services.variable_service import VARIABLE_RE


class VariableIn(BaseModel):
    name: str = Field(pattern=VARIABLE_RE.pattern)
    label: Optional[str] = None
    type: str = "text"
    required: bool = True
    default_value: Optional[str] = None
    sample_value: Optional[str] = None
    description: Optional[str] = None


class VariableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    label: str
    type: str
    required: bool
    default_value: Optional[str] = None
    sample_value: Optional[str] = None
    description: Optional[str] = None
