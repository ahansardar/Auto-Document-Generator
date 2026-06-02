"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { listTemplates } from "@/lib/api";
import type { Template } from "@/lib/types";
import { PdfUpload } from "@/components/upload/PdfUpload";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load templates"));
  }, []);

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
            <Link key={template.id} href={`/templates/${template.id}/editor`} className="rounded border border-line bg-white p-4 transition hover:border-ink">
              <FileText className="mb-4 h-7 w-7" />
              <div className="font-semibold">{template.name}</div>
              <div className="mt-1 text-sm text-zinc-500">{template.page_count} pages · {template.status}</div>
              <div className="mt-3 truncate text-xs text-zinc-500">{template.original_filename}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
