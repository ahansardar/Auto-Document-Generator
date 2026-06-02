"use client";

import { useState } from "react";
import { downloadUrl, generateBatch } from "@/lib/api";
import type { BatchResult } from "@/lib/types";

export function BatchUploadForm({ templateId }: { templateId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
