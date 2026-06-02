import { PdfEditor } from "@/components/editor/PdfEditor";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PdfEditor templateId={id} />;
}
