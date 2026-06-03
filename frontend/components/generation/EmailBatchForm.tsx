"use client";

import { useMemo, useState } from "react";
import { CheckSquare, Mail, Square } from "lucide-react";
import { emailBatch } from "@/lib/api";
import type { BatchMailResult, MailTemplate, TemplateVariable } from "@/lib/types";

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
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function createCsvFile(headers: string[], rows: Record<string, string>[], filename: string) {
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(","))].join("\n");
  return new File([csv], filename, { type: "text/csv" });
}

function fillPreview(text: string | null | undefined, sample: Record<string, string>) {
  return (text ?? "").replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => sample[key] ?? `{{${key}}}`);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

export function EmailBatchForm({ templateId, variables }: { templateId: string; variables: TemplateVariable[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<BatchMailResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const manualColumns = variables.filter((variable) => !variable.generator_enabled).map((variable) => variable.name);
  const emailLikeColumn = manualColumns.find((column) => column.toLowerCase().includes("email"));
  const nameLikeColumn = manualColumns.find((column) => column.toLowerCase().includes("participant") || column.toLowerCase().includes("name"));
  const [mailTemplate, setMailTemplate] = useState<MailTemplate>({
    email_column: emailLikeColumn ?? "email",
    name_column: nameLikeColumn ?? "participant_name",
    subject: "Your certificate is ready, {{participant_name}}",
    preheader: "Your certificate PDF is attached.",
    title: "Congratulations, {{participant_name}}!",
    greeting: "Hi {{participant_name}},",
    body: "Thank you for participating. Your certificate is attached with this email.",
    button_text: "Certificate attached",
    footer: "This email was generated automatically.",
    sender_name: "Certificate Team",
    reply_to: "",
    primary_color: "#1c1812",
    background_color: "#f6f0df",
    card_color: "#fffaf0",
    text_color: "#1c1812",
    font_family: "Arial, sans-serif",
    attachment_filename: "certificate-{{participant_name}}.pdf"
  });
  const selectedCount = selectedRows.size;
  const sampleRow = preview?.rows.find((_, index) => selectedRows.has(index)) ?? preview?.rows[0] ?? {};

  const visibleColumns = useMemo(() => {
    const preferred = [mailTemplate.name_column, mailTemplate.email_column].filter(Boolean) as string[];
    return [...preferred, ...manualColumns.filter((column) => !preferred.includes(column))].slice(0, 4);
  }, [mailTemplate.email_column, mailTemplate.name_column, manualColumns]);

  function patchMailTemplate(patch: Partial<MailTemplate>) {
    setMailTemplate((current) => ({ ...current, ...patch }));
  }

  async function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setSelectedRows(new Set());
    setResult(null);
    setError(null);

    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError("Mailing requires a CSV file so recipients can be selected and emailed.");
      return;
    }

    try {
      const parsed = parseCsv(await nextFile.text());
      setPreview(parsed);
      setSelectedRows(new Set(parsed.rows.map((_, index) => index)));
      const detectedEmail = parsed.headers.find((header) => header.toLowerCase().includes("email"));
      const detectedName = parsed.headers.find((header) => header.toLowerCase().includes("participant") || header.toLowerCase().includes("name"));
      patchMailTemplate({
        email_column: detectedEmail ?? mailTemplate.email_column,
        name_column: detectedName ?? mailTemplate.name_column
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read CSV file");
    }
  }

  function toggleRow(index: number) {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function submit() {
    if (!file || !preview) return;
    if (!selectedRows.size) {
      setError("Select at least one recipient to email.");
      return;
    }
    if (!mailTemplate.email_column) {
      setError("Choose the CSV column that contains participant email IDs.");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const rowsToMail = preview.rows.filter((_, index) => selectedRows.has(index));
      const selectedCsv = createCsvFile(preview.headers, rowsToMail, file.name.replace(/\.csv$/i, "-mail-selected.csv"));
      setResult(await emailBatch(templateId, selectedCsv, mailTemplate));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send certificates");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded border border-line bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-full bg-canvas p-2"><Mail className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-semibold">Email Certificates</h2>
          <p className="text-sm text-zinc-600">Generate certificates in memory, email them through Apps Script, and store no certificate files on the backend.</p>
        </div>
      </div>

      <div className="grid gap-5">
        <Field label="Recipient CSV">
          <input className="rounded border border-line px-3 py-2" type="file" accept=".csv,text/csv" onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)} />
        </Field>

        {preview ? (
          <div className="grid gap-3 rounded border border-line p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email ID column">
                <select className="rounded border border-line px-3 py-2" value={mailTemplate.email_column} onChange={(event) => patchMailTemplate({ email_column: event.target.value })}>
                  {preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                </select>
              </Field>
              <Field label="Participant name column">
                <select className="rounded border border-line px-3 py-2" value={mailTemplate.name_column ?? ""} onChange={(event) => patchMailTemplate({ name_column: event.target.value })}>
                  {preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">Select who should receive certificates</div>
                <div className="text-xs text-zinc-600">{selectedCount} of {preview.rows.length} recipients selected</div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded border border-line px-3 py-1.5 text-sm" onClick={() => setSelectedRows(new Set(preview.rows.map((_, index) => index)))}>Select all</button>
                <button type="button" className="rounded border border-line px-3 py-1.5 text-sm" onClick={() => setSelectedRows(new Set())}>Clear</button>
              </div>
            </div>
            <div className="max-h-64 overflow-auto rounded border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr>
                    <th className="w-12 px-3 py-2">Mail</th>
                    {visibleColumns.map((column) => <th key={column} className="px-3 py-2 text-zinc-500">{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => {
                    const checked = selectedRows.has(index);
                    return (
                      <tr key={index} className="border-t border-line">
                        <td className="px-3 py-2">
                          <button type="button" className="text-ink" onClick={() => toggleRow(index)} aria-label={checked ? "Skip email" : "Send email"}>
                            {checked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                          </button>
                        </td>
                        {visibleColumns.map((column) => <td key={column} className="px-3 py-2 text-zinc-700">{row[column]}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 rounded border border-line bg-canvas p-4">
          <div>
            <h3 className="font-semibold">No-code email designer</h3>
            <p className="text-xs text-zinc-600">Use variables like {"{{participant_name}}"} anywhere. The live preview uses the first selected CSV row.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sender display name"><input className="rounded border border-line px-3 py-2" value={mailTemplate.sender_name ?? ""} onChange={(event) => patchMailTemplate({ sender_name: event.target.value })} /></Field>
            <Field label="Reply-to email"><input className="rounded border border-line px-3 py-2" value={mailTemplate.reply_to ?? ""} onChange={(event) => patchMailTemplate({ reply_to: event.target.value })} /></Field>
            <Field label="Subject"><input className="rounded border border-line px-3 py-2" value={mailTemplate.subject} onChange={(event) => patchMailTemplate({ subject: event.target.value })} /></Field>
            <Field label="Attachment filename"><input className="rounded border border-line px-3 py-2" value={mailTemplate.attachment_filename} onChange={(event) => patchMailTemplate({ attachment_filename: event.target.value })} /></Field>
            <Field label="Email title"><input className="rounded border border-line px-3 py-2" value={mailTemplate.title} onChange={(event) => patchMailTemplate({ title: event.target.value })} /></Field>
            <Field label="Greeting"><input className="rounded border border-line px-3 py-2" value={mailTemplate.greeting} onChange={(event) => patchMailTemplate({ greeting: event.target.value })} /></Field>
          </div>
          <Field label="Preheader"><input className="rounded border border-line px-3 py-2" value={mailTemplate.preheader ?? ""} onChange={(event) => patchMailTemplate({ preheader: event.target.value })} /></Field>
          <Field label="Body message"><textarea className="min-h-32 rounded border border-line px-3 py-2" value={mailTemplate.body} onChange={(event) => patchMailTemplate({ body: event.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button/label text"><input className="rounded border border-line px-3 py-2" value={mailTemplate.button_text ?? ""} onChange={(event) => patchMailTemplate({ button_text: event.target.value })} /></Field>
            <Field label="Font family"><input className="rounded border border-line px-3 py-2" value={mailTemplate.font_family} onChange={(event) => patchMailTemplate({ font_family: event.target.value })} /></Field>
          </div>
          <Field label="Footer"><textarea className="min-h-20 rounded border border-line px-3 py-2" value={mailTemplate.footer ?? ""} onChange={(event) => patchMailTemplate({ footer: event.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Primary"><input className="h-10 rounded border border-line" type="color" value={mailTemplate.primary_color} onChange={(event) => patchMailTemplate({ primary_color: event.target.value })} /></Field>
            <Field label="Background"><input className="h-10 rounded border border-line" type="color" value={mailTemplate.background_color} onChange={(event) => patchMailTemplate({ background_color: event.target.value })} /></Field>
            <Field label="Card"><input className="h-10 rounded border border-line" type="color" value={mailTemplate.card_color} onChange={(event) => patchMailTemplate({ card_color: event.target.value })} /></Field>
            <Field label="Text"><input className="h-10 rounded border border-line" type="color" value={mailTemplate.text_color} onChange={(event) => patchMailTemplate({ text_color: event.target.value })} /></Field>
          </div>
        </div>

        <div className="rounded border border-line p-4" style={{ background: mailTemplate.background_color }}>
          <div className="mx-auto max-w-xl rounded-3xl border p-6" style={{ background: mailTemplate.card_color, color: mailTemplate.text_color, fontFamily: mailTemplate.font_family }}>
            <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: mailTemplate.primary_color }}>{fillPreview(mailTemplate.sender_name, sampleRow) || "Certificate"}</div>
            <h3 className="mt-3 text-2xl font-semibold">{fillPreview(mailTemplate.title, sampleRow)}</h3>
            <p className="mt-4 font-semibold">{fillPreview(mailTemplate.greeting, sampleRow)}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{fillPreview(mailTemplate.body, sampleRow)}</p>
            {mailTemplate.button_text ? <div className="mt-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: mailTemplate.primary_color }}>{fillPreview(mailTemplate.button_text, sampleRow)}</div> : null}
            {mailTemplate.footer ? <p className="mt-6 whitespace-pre-wrap text-xs opacity-70">{fillPreview(mailTemplate.footer, sampleRow)}</p> : null}
          </div>
        </div>

        <button className="rounded bg-ink px-4 py-2 font-medium text-white disabled:opacity-50" disabled={!preview || !selectedRows.size || busy} onClick={() => void submit()}>
          {busy ? "Sending..." : `Generate and Email ${selectedCount || "selected"} Certificates`}
        </button>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {result ? (
          <div className="rounded border border-line bg-canvas p-3 text-sm">
            <div className="font-medium">{result.sent} of {result.attempted} certificates emailed.</div>
            {result.errors.length ? <pre className="mt-2 max-h-48 overflow-auto rounded bg-zinc-100 p-3">{JSON.stringify(result.errors, null, 2)}</pre> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
