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


class MailTemplateIn(BaseModel):
    email_column: str
    name_column: str | None = None
    subject: str
    preheader: str | None = None
    title: str
    greeting: str
    body: str
    button_text: str | None = None
    footer: str | None = None
    sender_name: str | None = None
    reply_to: str | None = None
    primary_color: str = "#1c1812"
    background_color: str = "#f6f0df"
    card_color: str = "#fffaf0"
    text_color: str = "#1c1812"
    font_family: str = "Arial, sans-serif"
    attachment_filename: str = "certificate-{{participant_name}}.pdf"


class BatchMailResponse(BaseModel):
    attempted: int
    sent: int
    errors: list[BatchError]
