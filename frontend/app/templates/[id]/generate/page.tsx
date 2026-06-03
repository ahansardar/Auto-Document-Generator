"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getTemplate } from "@/lib/api";
import type { TemplateDetail } from "@/lib/types";
import { BatchUploadForm } from "@/components/generation/BatchUploadForm";
import { DynamicVariableForm } from "@/components/generation/DynamicVariableForm";
import { EmailBatchForm } from "@/components/generation/EmailBatchForm";

export default function GeneratePage() {
  const params = useParams<{ id: string }>();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTemplate(params.id)
      .then(setTemplate)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load template"));
  }, [params.id]);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!template) return <main className="p-8">Loading generation form...</main>;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <Link href={`/templates/${template.id}/editor`} className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-600">
            <ArrowLeft className="h-4 w-4" /> Back to editor
          </Link>
          <h1 className="text-3xl font-semibold">{template.name}</h1>
        </div>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <DynamicVariableForm templateId={template.id} variables={template.variables} />
        <BatchUploadForm templateId={template.id} variables={template.variables} />
      </div>
      <EmailBatchForm templateId={template.id} variables={template.variables} />
    </main>
  );
}
