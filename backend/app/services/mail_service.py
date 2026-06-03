import base64
import json
from html import escape
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException

from app.config import get_settings
from app.schemas.generation import MailTemplateIn
from app.utils.text_utils import replace_variables

settings = get_settings()


def render_value(template: str | None, data: dict[str, str]) -> str:
    return replace_variables(template or "", data)


def render_mail_html(template: MailTemplateIn, data: dict[str, str]) -> str:
    preheader = render_value(template.preheader, data)
    button_text = render_value(template.button_text, data)
    body = escape(render_value(template.body, data)).replace("\n", "<br />")
    footer = escape(render_value(template.footer, data)).replace("\n", "<br />")
    greeting = escape(render_value(template.greeting, data))
    title = escape(render_value(template.title, data))

    button_html = ""
    if button_text:
        button_html = f"""
          <div style="margin-top:24px">
            <span style="display:inline-block;border-radius:999px;background:{template.primary_color};color:#ffffff;padding:12px 18px;font-weight:700">
              {escape(button_text)}
            </span>
          </div>
        """

    footer_html = ""
    if footer:
        footer_html = f"<div style=\"margin-top:28px;color:#6b6256;font-size:12px;line-height:1.6\">{footer}</div>"

    preheader_html = ""
    if preheader:
        preheader_html = f"<div style=\"display:none;max-height:0;overflow:hidden;opacity:0\">{escape(preheader)}</div>"

    return f"""<!doctype html>
<html>
  <body style="margin:0;background:{template.background_color};font-family:{template.font_family};color:{template.text_color}">
    {preheader_html}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{template.background_color};padding:32px 14px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:{template.card_color};border:1px solid rgba(28,24,18,.12);border-radius:24px;padding:32px">
            <tr>
              <td>
                <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:{template.primary_color};font-weight:700">{escape(template.sender_name or "Certificate")}</div>
                <h1 style="margin:14px 0 18px;font-size:30px;line-height:1.15;color:{template.text_color}">{title}</h1>
                <p style="margin:0 0 14px;font-size:17px;font-weight:700">{greeting}</p>
                <div style="font-size:15px;line-height:1.8;color:{template.text_color}">{body}</div>
                {button_html}
                {footer_html}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def send_certificate_email(template: MailTemplateIn, data: dict[str, str], pdf_bytes: bytes) -> None:
    if not settings.apps_script_webhook_url:
        raise HTTPException(status_code=503, detail="Apps Script webhook is not configured")

    recipient = data.get(template.email_column, "").strip()
    if not recipient:
        raise ValueError(f"Missing email in column {template.email_column}")

    filename = render_value(template.attachment_filename, data).strip() or "certificate.pdf"
    if not filename.lower().endswith(".pdf"):
        filename = f"{filename}.pdf"

    payload = {
        "to": recipient,
        "subject": render_value(template.subject, data),
        "htmlBody": render_mail_html(template, data),
        "plainBody": render_value(template.body, data),
        "senderName": render_value(template.sender_name, data),
        "replyTo": render_value(template.reply_to, data),
        "attachment": {
            "filename": filename,
            "mimeType": "application/pdf",
            "base64": base64.b64encode(pdf_bytes).decode("ascii"),
        },
    }
    request = Request(
        settings.apps_script_webhook_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            if response.status >= 400:
                raise ValueError(f"Apps Script returned HTTP {response.status}")
    except HTTPError as exc:
        raise ValueError(f"Apps Script returned HTTP {exc.code}") from exc
    except URLError as exc:
        raise ValueError("Could not reach Apps Script webhook") from exc
