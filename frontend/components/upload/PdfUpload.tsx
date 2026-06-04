"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { uploadTemplate } from "@/lib/api";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function PdfUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Preparing upload...");

  async function handleFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(4);
    setProgressLabel("Preparing upload...");
    try {
      const template = await uploadTemplate(file, ({ percent }) => {
        setProgress(Math.min(85, Math.max(4, Math.round(percent * 0.85))));
        setProgressLabel(percent >= 100 ? "Processing PDF pages..." : "Uploading PDF...");
      });
      setProgress(100);
      setProgressLabel("Upload complete. Opening editor...");
      router.push(`/templates/${template.id}/editor`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-line bg-white p-10 text-center transition hover:border-ink">
      <UploadCloud className="mb-4 h-10 w-10" aria-hidden />
      <span className="text-lg font-semibold">{busy ? "Uploading PDF..." : "Upload Canva PDF"}</span>
      <span className="mt-2 max-w-md text-sm text-zinc-600">The original PDF remains untouched. Text boxes are saved as reusable overlay metadata.</span>
      {busy ? (
        <div className="mt-5 w-full max-w-md">
          <ProgressBar value={progress} label={progressLabel} detail="Keep this tab open while the template is prepared." />
        </div>
      ) : null}
      <input
        className="sr-only"
        type="file"
        accept="application/pdf,.pdf"
        disabled={busy}
        onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
      />
      {error ? <span className="mt-4 text-sm text-red-600">{error}</span> : null}
    </label>
  );
}
