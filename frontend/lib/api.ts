import type { BatchMailResult, BatchResult, EditorFont, MailTemplate, Template, TemplateDetail, TemplateVariable, TextElement } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: response.statusText }));
    const message = Array.isArray(payload.detail) ? payload.detail.join(", ") : payload.detail;
    throw new Error(message || "Request failed");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function originalPdfUrl(templateId: string) {
  return `${API_BASE}/api/templates/${templateId}/original.pdf`;
}

export function downloadUrl(path: string) {
  return `${API_BASE}${path}`;
}

export function listTemplates() {
  return request<Template[]>("/api/templates");
}

export function getTemplate(id: string) {
  return request<TemplateDetail>(`/api/templates/${id}`);
}

export function deleteTemplate(id: string) {
  return request<void>(`/api/templates/${id}`, { method: "DELETE" });
}

export function getEditorFonts() {
  return request<EditorFont[]>("/api/editor/fonts");
}

export async function uploadTemplate(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<TemplateDetail>("/api/templates/upload", { method: "POST", body: form });
}

export function saveLayout(id: string, payload: { name: string; text_elements: TextElement[]; variables: TemplateVariable[] }) {
  return request<TemplateDetail>(`/api/templates/${id}/save-layout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function updatePageLayout(id: string, sourcePageNumbers: number[]) {
  return request<TemplateDetail>(`/api/templates/${id}/pages`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_page_numbers: sourcePageNumbers })
  });
}

export function generateOne(id: string, data: Record<string, string>) {
  return request<{ generated_document_id: string; download_url: string }>(`/api/templates/${id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data })
  });
}

export async function generateBatch(id: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<BatchResult>(`/api/templates/${id}/generate-batch`, { method: "POST", body: form });
}

export async function emailBatch(id: string, file: File, mailTemplate: MailTemplate) {
  const form = new FormData();
  form.append("file", file);
  form.append("mail_template_json", JSON.stringify(mailTemplate));
  return request<BatchMailResult>(`/api/templates/${id}/email-batch`, { method: "POST", body: form });
}
