"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadTemplate } from "@/lib/api";
import { FileDropZone } from "@/components/ui/FileDropZone";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function PdfUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Preparing upload...");

  async function handleFile(file: File | null) {
    if (!file) return;
    setFile(file);
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
    <div className="grid gap-3">
      <FileDropZone
        accept="application/pdf,.pdf"
        title={busy ? "Uploading PDF..." : "Upload Canva PDF"}
        description="Drop a PDF here. The original stays untouched; text boxes are saved as reusable overlay metadata."
        file={file}
        disabled={busy}
        onFile={(nextFile) => void handleFile(nextFile)}
      />
      {busy ? (
        <div>
          <ProgressBar value={progress} label={progressLabel} detail="Keep this tab open while the template is prepared." />
        </div>
      ) : null}
      {error ? <span className="mt-4 text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
