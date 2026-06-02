from pydantic import BaseModel


class GenerateRequest(BaseModel):
    data: dict[str, str | int | float | None]


class GenerateResponse(BaseModel):
    generated_document_id: str
    download_url: str


class BatchError(BaseModel):
    row: int
    errors: list[str]


class BatchGenerateResponse(BaseModel):
    zip_download_url: str
    generated_document_ids: list[str]
    errors: list[BatchError]
