"use client";

import { useMemo, useState } from "react";
import { CheckSquare, Square } from "lucide-react";
import { downloadUrl, generateBatch } from "@/lib/api";
import type { BatchResult, TemplateVariable } from "@/lib/types";

type CsvPreview = {
  headers: string[];
  rows: Record<string, string>[];
};

function parseCsv(text: string): CsvPreview {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);

  const headers = rows[0] ?? [];
  return {
    headers,
    rows: rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])))
  };
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function createCsvFile(headers: string[], rows: Record<string, string>[], filename: string) {
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(","))].join("\n");
  return new File([csv], filename, { type: "text/csv" });
}

export function BatchUploadForm({ templateId, variables }: { templateId: string; variables: TemplateVariable[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const manualColumns = variables.filter((variable) => !variable.generator_enabled).map((variable) => variable.name);
  const generatedColumns = variables.filter((variable) => variable.generator_enabled).map((variable) => variable.name);
  const displayColumn = useMemo(() => {
    const preferred = manualColumns.find((column) => column.toLowerCase().includes("participant") || column.toLowerCase().includes("name"));
    return preferred ?? manualColumns[0] ?? preview?.headers[0] ?? "Row";
  }, [manualColumns, preview]);
  const selectedCount = selectedRows.size;

  async function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setSelectedRows(new Set());
    setResult(null);
    setError(null);

    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError("Row selection is available for CSV files only. Upload a CSV to choose recipients.");
      return;
    }

    try {
      const parsed = parseCsv(await nextFile.text());
      if (!parsed.headers.length) {
        setError("CSV is empty or missing a header row.");
        return;
      }
      setPreview(parsed);
      setSelectedRows(new Set(parsed.rows.map((_, index) => index)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read CSV file");
    }
  }

  function toggleRow(index: number) {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function selectAll() {
    if (!preview) return;
    setSelectedRows(new Set(preview.rows.map((_, index) => index)));
  }

  function clearSelection() {
    setSelectedRows(new Set());
  }

  async function submit() {
    if (!file || !preview) return;
    if (!selectedRows.size) {
      setError("Select at least one recipient before generating certificates.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const rowsToGenerate = preview.rows.filter((_, index) => selectedRows.has(index));
      const selectedCsv = createCsvFile(preview.headers, rowsToGenerate, file.name.replace(/\.csv$/i, "-selected.csv"));
      setResult(await generateBatch(templateId, selectedCsv));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded border border-line bg-white p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Batch PDFs</h2>
          <p className="text-sm text-zinc-600">Upload a CSV, choose recipients, then generate only those certificates.</p>
        </div>
        {preview ? <span className="text-sm text-zinc-500">{selectedCount} of {preview.rows.length} selected</span> : null}
      </div>
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

        <input className="rounded border border-line px-3 py-2" type="file" accept=".csv,text/csv" onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)} />

        {preview ? (
          <div className="rounded border border-line">
            <div className="flex flex-col gap-3 border-b border-line bg-canvas p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium text-ink">Choose certificate recipients</div>
                <div className="text-xs text-zinc-600">Unchecked rows will be skipped during batch generation.</div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded border border-line px-3 py-1.5 text-sm" onClick={selectAll}>Select all</button>
                <button type="button" className="rounded border border-line px-3 py-1.5 text-sm" onClick={clearSelection}>Clear</button>
              </div>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr>
                    <th className="w-12 px-3 py-2">Make</th>
                    <th className="px-3 py-2">Recipient</th>
                    {manualColumns.filter((column) => column !== displayColumn).slice(0, 3).map((column) => (
                      <th key={column} className="px-3 py-2 text-zinc-500">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => {
                    const checked = selectedRows.has(index);
                    return (
                      <tr key={index} className="border-t border-line">
                        <td className="px-3 py-2 align-top">
                          <button type="button" className="text-ink" onClick={() => toggleRow(index)} aria-label={checked ? "Skip recipient" : "Select recipient"}>
                            {checked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                          </button>
                        </td>
                        <td className="px-3 py-2 align-top font-medium text-ink">{row[displayColumn] || `Row ${index + 1}`}</td>
                        {manualColumns.filter((column) => column !== displayColumn).slice(0, 3).map((column) => (
                          <td key={column} className="px-3 py-2 align-top text-zinc-600">{row[column]}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <button className="rounded bg-ink px-4 py-2 font-medium text-white disabled:opacity-50" disabled={!preview || !selectedRows.size || busy} onClick={() => void submit()}>
          {busy ? "Generating..." : `Generate ${selectedCount || "selected"} Certificates`}
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
