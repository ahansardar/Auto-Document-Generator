/**
 * Deploy as a Google Apps Script Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * If backend shows HTTP 401, redeploy the Web App with "Anyone" access and
 * copy the /exec URL into Render's APPS_SCRIPT_WEBHOOK_URL.
 */
function doGet() {
  return jsonResponse({
    ok: true,
    service: 'certificate-mailer',
    message: 'Apps Script mailer is reachable. POST certificate payloads to this /exec URL.'
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');

    if (!payload.to || !payload.subject || !payload.attachment || !payload.attachment.base64) {
      return jsonResponse({ ok: false, error: 'Missing required mail payload' }, 400);
    }

    const blob = Utilities.newBlob(
      Utilities.base64Decode(payload.attachment.base64),
      payload.attachment.mimeType || 'application/pdf',
      payload.attachment.filename || 'certificate.pdf'
    );

    const options = {
      htmlBody: payload.htmlBody || payload.plainBody || '',
      attachments: [blob],
      name: payload.senderName || undefined,
      replyTo: payload.replyTo || undefined
    };

    GmailApp.sendEmail(
      payload.to,
      payload.subject,
      payload.plainBody || 'Your certificate is attached.',
      options
    );

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  }
}

function jsonResponse(payload, status) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
