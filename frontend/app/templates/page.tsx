"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { deleteTemplate, listTemplates } from "@/lib/api";
import type { Template } from "@/lib/types";
import { PdfUpload } from "@/components/upload/PdfUpload";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load templates"));
  }, []);

  async function handleDelete(template: Template) {
    const confirmed = window.confirm(`Delete "${template.name}"? This will remove the template and generated files.`);
    if (!confirmed) return;

    setDeletingId(template.id);
    setError(null);
    try {
      await deleteTemplate(template.id);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete template");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-8">
      <header>
        <h1 className="text-3xl font-semibold">PDF Template Editor</h1>
        <p className="mt-2 text-zinc-600">Upload a Canva PDF, preserve the artwork, and add reusable text overlays.</p>
      </header>
      <PdfUpload />
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Templates</h2>
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} className="rounded border border-line bg-white p-4 transition hover:border-ink">
              <Link href={`/templates/${template.id}/editor`} className="block">
                <FileText className="mb-4 h-7 w-7" />
                <div className="font-semibold">{template.name}</div>
                <div className="mt-1 text-sm text-zinc-500">
                  {template.page_count} pages · {template.status}
                </div>
                <div className="mt-3 truncate text-xs text-zinc-500">{template.original_filename}</div>
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(template)}
                disabled={deletingId === template.id}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded border border-line px-3 py-2 text-sm text-zinc-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deletingId === template.id ? "Deleting..." : "Delete template"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

