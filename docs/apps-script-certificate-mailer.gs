/**
 * Google Apps Script web app for certificate mailing.
 * Deploy as: Web app -> Execute as me -> Anyone with the link.
 * Set the deployed Web App URL as APPS_SCRIPT_WEBHOOK_URL on Render.
 */
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

    GmailApp.sendEmail(payload.to, payload.subject, payload.plainBody || 'Your certificate is attached.', options);
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
