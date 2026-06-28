import type { BatchMailResult, BatchResult, EditorFont, MailTemplate, Template, TemplateDetail, TemplateVariable, TextElement } from "./types";

const LOCAL_API_BASE = "http://localhost:8000";
const PRODUCTION_API_BASE = "https://auto-document-generator-backend.onrender.com";
const DEPRECATED_API_BASES = new Set(["https://auto-document-generator-1-v454.onrender.com"]);

function resolveApiBase() {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
  if (configuredBase && !DEPRECATED_API_BASES.has(configuredBase)) {
    return configuredBase;
  }
  return process.env.NODE_ENV === "development" ? LOCAL_API_BASE : PRODUCTION_API_BASE;
}

export const API_BASE = resolveApiBase();

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

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

function requestWithUploadProgress<T>(path: string, body: FormData, onProgress?: (progress: UploadProgress) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_BASE}${path}`);
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100)
      });
    };

    xhr.onerror = () => reject(new Error("Network request failed"));
    xhr.onload = () => {
      let payload: any;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
      } catch {
        payload = undefined;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const detail = payload?.detail ?? xhr.statusText;
        const message = Array.isArray(detail) ? detail.join(", ") : detail;
        reject(new Error(message || "Request failed"));
        return;
      }

      resolve(payload as T);
    };

    xhr.send(body);
  });
}

export function originalPdfUrl(templateId: string) {
  return `${API_BASE}/api/templates/${templateId}/original.pdf`;
}

export function downloadUrl(path: string) {
  return /^(blob:|https?:)/.test(path) ? path : `${API_BASE}${path}`;
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

export async function uploadEditorFont(file: File, family?: string) {
  const form = new FormData();
  form.append("file", file);
  if (family?.trim()) {
    form.append("family", family.trim());
  }
  return requestWithUploadProgress<EditorFont>("/api/editor/fonts", form);
}

export async function uploadTemplate(file: File, onProgress?: (progress: UploadProgress) => void) {
  const form = new FormData();
  form.append("file", file);
  return requestWithUploadProgress<TemplateDetail>("/api/templates/upload", form, onProgress);
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

export async function generateOne(id: string, data: Record<string, string>) {
  const response = await fetch(`${API_BASE}/api/templates/${id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(payload.detail || "Generation failed");
  }
  return { download_url: URL.createObjectURL(await response.blob()) };
}

export async function generateBatch(id: string, file: File, onProgress?: (progress: UploadProgress) => void) {
  const form = new FormData();
  form.append("file", file);
  return new Promise<BatchResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/templates/${id}/generate-batch`);
    xhr.responseType = "blob";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.({ loaded: event.loaded, total: event.total, percent: Math.round((event.loaded / event.total) * 100) });
      }
    };
    xhr.onerror = () => reject(new Error("Network request failed"));
    xhr.onload = async () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        const payload = await xhr.response.text().then(JSON.parse).catch(() => ({}));
        reject(new Error(payload.detail || xhr.statusText || "Batch generation failed"));
        return;
      }
      const generatedCount = Number(xhr.getResponseHeader("X-Generated-Count") || 0);
      const errorCount = Number(xhr.getResponseHeader("X-Generation-Error-Count") || 0);
      resolve({
        zip_download_url: URL.createObjectURL(xhr.response),
        generated_document_ids: Array.from({ length: generatedCount }, (_, index) => String(index + 1)),
        errors: Array.from({ length: errorCount }, (_, index) => ({ row: index + 1, errors: ["See generation-errors.json in the ZIP."] }))
      });
    };
    xhr.send(form);
  });
}

export async function emailBatch(id: string, file: File, mailTemplate: MailTemplate, onProgress?: (progress: UploadProgress) => void) {
  const form = new FormData();
  form.append("file", file);
  form.append("mail_template_json", JSON.stringify(mailTemplate));
  return requestWithUploadProgress<BatchMailResult>(`/api/templates/${id}/email-batch`, form, onProgress);
}
