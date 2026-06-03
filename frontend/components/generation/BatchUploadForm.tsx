"use client";

import { useState } from "react";
import { downloadUrl, generateBatch } from "@/lib/api";
import type { BatchResult, TemplateVariable } from "@/lib/types";

export function BatchUploadForm({ templateId, variables }: { templateId: string; variables: TemplateVariable[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const manualColumns = variables.filter((variable) => !variable.generator_enabled).map((variable) => variable.name);
  const generatedColumns = variables.filter((variable) => variable.generator_enabled).map((variable) => variable.name);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await generateBatch(templateId, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded border border-line bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Batch PDFs</h2>
      <div className="grid gap-3">
        <div className="rounded border border-line bg-canvas p-3 text-sm">
          <div className="font-medium text-ink">CSV columns must match the manual variables exactly.</div>
          <div className="mt-2 text-xs text-zinc-600">
            Include: <span className="font-medium text-ink">{manualColumns.join(", ") || "No manual columns"}</span>
          </div>
          {generatedColumns.length ? (
            <div className="mt-1 text-xs text-zinc-600">
              Do not include: <span className="font-medium text-ink">{generatedColumns.join(", ")}</span> — the site fills these.
            </div>
          ) : null}
        </div>
        <input className="rounded border border-line px-3 py-2" type="file" accept=".csv,application/json,.json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button className="rounded bg-ink px-4 py-2 font-medium text-white disabled:opacity-50" disabled={!file || busy} onClick={() => void submit()}>
          {busy ? "Generating..." : "Generate Batch ZIP"}
        </button>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {result ? (
          <div className="grid gap-2 text-sm">
            <a className="font-medium underline" href={downloadUrl(result.zip_download_url)}>Download ZIP</a>
            <span>{result.generated_document_ids.length} PDFs generated</span>
            {result.errors.length ? <pre className="max-h-48 overflow-auto rounded bg-zinc-100 p-3">{JSON.stringify(result.errors, null, 2)}</pre> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
