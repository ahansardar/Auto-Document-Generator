"use client";

import { useState } from "react";
import { downloadUrl, generateOne } from "@/lib/api";
import type { TemplateVariable } from "@/lib/types";

export function DynamicVariableForm({ templateId, variables }: { templateId: string; variables: TemplateVariable[] }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(variables.map((variable) => [variable.name, variable.default_value ?? ""])));
  const [download, setDownload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await generateOne(templateId, values);
      setDownload(downloadUrl(result.download_url));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded border border-line bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Single PDF</h2>
      <div className="grid gap-3">
        {variables.map((variable) => (
          <label key={variable.name} className="grid gap-1 text-sm">
            <span className="font-medium">{variable.label || variable.name}{variable.required ? " *" : ""}</span>
            {variable.type === "multiline" ? (
              <textarea className="rounded border border-line px-3 py-2" value={values[variable.name] ?? ""} onChange={(event) => setValues({ ...values, [variable.name]: event.target.value })} />
            ) : (
              <input
                className="rounded border border-line px-3 py-2"
                type={variable.type === "date" ? "date" : variable.type === "number" || variable.type === "currency" ? "number" : variable.type === "email" ? "email" : "text"}
                value={values[variable.name] ?? ""}
                onChange={(event) => setValues({ ...values, [variable.name]: event.target.value })}
              />
            )}
            {variable.description ? <span className="text-xs text-zinc-500">{variable.description}</span> : null}
          </label>
        ))}
        <button className="rounded bg-ink px-4 py-2 font-medium text-white" onClick={() => void submit()} disabled={busy}>
          {busy ? "Generating..." : "Generate PDF"}
        </button>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {download ? <a className="text-sm font-medium underline" href={download}>Download generated PDF</a> : null}
      </div>
    </section>
  );
}
