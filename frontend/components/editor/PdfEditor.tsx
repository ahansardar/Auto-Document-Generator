"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Document, pdfjs } from "react-pdf";
import { getTemplate, originalPdfUrl, saveLayout } from "@/lib/api";
import type { TemplateDetail, TemplateVariable, TextElement } from "@/lib/types";
import { extractVariablesFromElements } from "@/lib/variables";
import { FormattingPanel } from "./FormattingPanel";
import { PageSidebar } from "./PageSidebar";
import { PdfPageView } from "./PdfPageView";
import { TopToolbar } from "./TopToolbar";
import { VariableManager } from "./VariableManager";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function newTextElement(pageNumber: number, zIndex: number): TextElement {
  return {
    id: crypto.randomUUID(),
    page_number: pageNumber,
    content: "{{student_name}}",
    x: 120,
    y: 120,
    width: 260,
    height: 54,
    font_family: "Helvetica",
    font_size: 28,
    font_weight: "400",
    font_style: "normal",
    is_bold: false,
    is_italic: false,
    is_underline: false,
    is_strikethrough: false,
    text_color: "#111827",
    background_color: null,
    text_opacity: 1,
    background_opacity: 0,
    text_align: "center",
    vertical_align: "top",
    line_height: 1.2,
    letter_spacing: 0,
    word_spacing: 0,
    text_transform: "none",
    padding_top: 0,
    padding_right: 0,
    padding_bottom: 0,
    padding_left: 0,
    border_width: 0,
    border_color: "#000000",
    border_style: "solid",
    border_radius: 0,
    rotation: 0,
    z_index: zIndex,
    locked: false,
    auto_shrink: false,
    clip_overflow: true
  };
}

function mergeDetectedVariables(variables: TemplateVariable[], elements: TextElement[]) {
  const existing = new Map(variables.map((variable) => [variable.name, variable]));
  for (const name of extractVariablesFromElements(elements)) {
    if (!existing.has(name)) {
      existing.set(name, { name, label: name.replaceAll("_", " "), type: "text", required: true, default_value: "", sample_value: "", description: "" });
    }
  }
  return Array.from(existing.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function PdfEditor({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [elements, setElements] = useState<TextElement[]>([]);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(0.9);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTemplate(templateId)
      .then((data) => {
        setTemplate(data);
        setElements(data.text_elements);
        setVariables(mergeDetectedVariables(data.variables, data.text_elements));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load template"));
  }, [templateId]);

  useEffect(() => {
    setVariables((current) => mergeDetectedVariables(current, elements));
  }, [elements]);

  const selected = elements.find((element) => element.id === selectedId) ?? null;
  const page = template?.pages.find((item) => item.page_number === currentPage) ?? template?.pages[0];
  const sampleData = useMemo(
    () => Object.fromEntries(variables.map((variable) => [variable.name, variable.sample_value || variable.default_value || variable.name])),
    [variables]
  );

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!template || !page) return <div className="p-8">Loading editor...</div>;

  function updateElement(element: TextElement) {
    setElements((current) => current.map((item) => (item.id === element.id ? element : item)));
  }

  function addText() {
    if (!template) return;
    const element = newTextElement(currentPage, elements.length + 1);
    setElements((current) => [...current, element]);
    setSelectedId(element.id);
  }

  function duplicate(id: string) {
    const source = elements.find((element) => element.id === id);
    if (!source) return;
    const clone = { ...source, id: crypto.randomUUID(), x: source.x + 20, y: source.y + 20, z_index: source.z_index + 1 };
    setElements((current) => [...current, clone]);
    setSelectedId(clone.id);
  }

  async function handleSave() {
    if (!template) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveLayout(template.id, { name: template.name, text_elements: elements, variables });
      setTemplate(saved);
      setElements(saved.text_elements);
      setVariables(mergeDetectedVariables(saved.variables, saved.text_elements));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function renameVariable(oldName: string, newName: string) {
    if (oldName === newName) return;
    setElements((current) => current.map((element) => ({ ...element, content: element.content.replaceAll(`{{${oldName}}}`, `{{${newName}}}`) })));
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopToolbar
        name={template.name}
        zoom={zoom}
        saving={saving}
        preview={preview}
        onNameChange={(name) => setTemplate({ ...template, name })}
        onZoomChange={setZoom}
        onAddText={addText}
        onSave={() => void handleSave()}
        onPreviewToggle={() => setPreview((value) => !value)}
        onGenerate={() => router.push(`/templates/${template.id}/generate`)}
      />
      <Document file={originalPdfUrl(template.id)} loading={<div className="p-6">Loading PDF...</div>}>
        <div className="flex min-h-0 flex-1">
          <PageSidebar pages={template.pages} currentPage={currentPage} onPageChange={setCurrentPage} />
          <main className="min-w-0 flex-1 overflow-auto bg-canvas p-8" onClick={() => setSelectedId(null)}>
            <div className="mx-auto w-fit" onClick={(event) => event.stopPropagation()}>
              <PdfPageView
                page={page}
                zoom={zoom}
                elements={elements}
                selectedId={selectedId}
                preview={preview}
                sampleData={sampleData}
                onSelect={setSelectedId}
                onChange={updateElement}
                onDelete={(id) => {
                  setElements((current) => current.filter((element) => element.id !== id));
                  setSelectedId(null);
                }}
                onDuplicate={duplicate}
              />
            </div>
          </main>
          <div className="flex h-full w-80 shrink-0 flex-col bg-white">
            <FormattingPanel
              element={selected}
              onChange={updateElement}
              onBringForward={() => selected && updateElement({ ...selected, z_index: selected.z_index + 1 })}
              onSendBackward={() => selected && updateElement({ ...selected, z_index: Math.max(0, selected.z_index - 1) })}
            />
            <VariableManager variables={variables} elementContents={elements} onChange={setVariables} onRename={renameVariable} />
          </div>
        </div>
      </Document>
    </div>
  );
}
