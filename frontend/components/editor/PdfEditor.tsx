"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Document, pdfjs } from "react-pdf";
import { getEditorFonts, getTemplate, originalPdfUrl, saveLayout, updatePageLayout } from "@/lib/api";
import type { EditorFont, TemplateDetail, TemplatePage, TemplateVariable, TextElement } from "@/lib/types";
import { extractVariablesFromElements, firstVariableName, normalizeVariableName } from "@/lib/variables";
import { FormattingPanel } from "./FormattingPanel";
import { PageSidebar } from "./PageSidebar";
import { PdfPageView } from "./PdfPageView";
import { TopToolbar } from "./TopToolbar";
import { VariableManager } from "./VariableManager";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function newVariable(name: string): TemplateVariable {
  return {
    name,
    label: name.replaceAll("_", " "),
    type: "text",
    required: true,
    default_value: "",
    sample_value: "",
    description: "",
    generator_enabled: false,
    generator_pattern: ""
  };
}

function normalizeVariable(variable: TemplateVariable): TemplateVariable {
  return {
    ...variable,
    label: variable.label || variable.name.replaceAll("_", " "),
    generator_enabled: variable.generator_enabled ?? false,
    generator_pattern: variable.generator_pattern ?? ""
  };
}

function newTextElement(pageNumber: number, zIndex: number, fieldName: string): TextElement {
  return {
    id: crypto.randomUUID(),
    page_number: pageNumber,
    element_type: "text",
    content: `{{${fieldName}}}`,
    image_src: null,
    image_alt: null,
    hyperlink_url: "",
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

function normalizeElement(element: TextElement): TextElement {
  return {
    ...element,
    element_type: element.element_type ?? "text",
    image_src: element.image_src ?? null,
    image_alt: element.image_alt ?? null,
    hyperlink_url: element.hyperlink_url ?? ""
  };
}

function newButtonElement(pageNumber: number, zIndex: number): TextElement {
  return {
    ...newTextElement(pageNumber, zIndex, "button_label"),
    element_type: "button",
    content: "Open link",
    x: 160,
    y: 160,
    width: 180,
    height: 48,
    font_size: 18,
    is_bold: true,
    text_color: "#ffffff",
    background_color: "#1c1812",
    background_opacity: 1,
    border_width: 0,
    border_radius: 999,
    padding_top: 12,
    padding_right: 16,
    padding_bottom: 8,
    padding_left: 16,
    hyperlink_url: "https://example.com"
  };
}

function imageFileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function newImageElement(pageNumber: number, zIndex: number, imageSrc: string, imageAlt: string): TextElement {
  return {
    ...newTextElement(pageNumber, zIndex, "image_caption"),
    element_type: "image",
    content: "",
    image_src: imageSrc,
    image_alt: imageAlt,
    x: 120,
    y: 120,
    width: 180,
    height: 120,
    background_color: null,
    background_opacity: 0,
    border_width: 0,
    clip_overflow: true
  };
}

function mergeDetectedVariables(variables: TemplateVariable[], elements: TextElement[]) {
  const existing = new Map(variables.map((variable) => [variable.name, normalizeVariable(variable)]));
  for (const name of extractVariablesFromElements(elements)) {
    if (!existing.has(name)) {
      existing.set(name, newVariable(name));
    }
  }
  return Array.from(existing.values()).sort((left, right) => left.name.localeCompare(right.name));
}

type EditorState = {
  elements: TextElement[];
  variables: TemplateVariable[];
};

function cloneEditorState(elements: TextElement[], variables: TemplateVariable[]): EditorState {
  return {
    elements: elements.map((element) => ({ ...element })),
    variables: variables.map((variable) => ({ ...variable }))
  };
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
  const [fontOptions, setFontOptions] = useState<EditorFont[]>([{ family: "Helvetica", file_path: null }]);
  const [past, setPast] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);

  useEffect(() => {
    getTemplate(templateId)
      .then((data) => {
        setTemplate(data);
        setElements(data.text_elements.map(normalizeElement));
        setVariables(mergeDetectedVariables(data.variables, data.text_elements));
        setPast([]);
        setFuture([]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load template"));
  }, [templateId]);

  useEffect(() => {
    getEditorFonts()
      .then((fonts) => {
        if (fonts.length) setFontOptions(fonts);
      })
      .catch(() => {
        setFontOptions([{ family: "Helvetica", file_path: null }, { family: "Arial", file_path: null }, { family: "Times New Roman", file_path: null }]);
      });
  }, []);

  useEffect(() => {
    setVariables((current) => mergeDetectedVariables(current, elements));
  }, [elements]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [elements, variables, past, future]);

  useEffect(() => {
    function handleDeleteKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT" || target?.isContentEditable;
      if (isTyping || !selectedId || (event.key !== "Delete" && event.key !== "Backspace")) return;
      event.preventDefault();
      deleteElement(selectedId);
    }

    window.addEventListener("keydown", handleDeleteKey);
    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [elements, variables, selectedId]);

  const selected = elements.find((element) => element.id === selectedId) ?? null;
  const page = template?.pages.find((item) => item.page_number === currentPage) ?? template?.pages[0];
  const sampleData = useMemo(
    () => Object.fromEntries(variables.map((variable) => [variable.name, variable.sample_value || variable.default_value || variable.name])),
    [variables]
  );

  useEffect(() => {
    if (!page) return;
    const fitForViewport = () => {
      if (window.innerWidth >= 768) return;
      const availableWidth = Math.max(280, window.innerWidth - 32);
      setZoom(Math.max(0.35, Math.min(0.9, availableWidth / page.width)));
    };
    fitForViewport();
    window.addEventListener("resize", fitForViewport);
    return () => window.removeEventListener("resize", fitForViewport);
  }, [page?.page_number, page?.width]);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!template || !page) return <div className="p-8">Loading editor...</div>;

  function pushHistory() {
    setPast((current) => [...current.slice(-49), cloneEditorState(elements, variables)]);
    setFuture([]);
  }

  function restoreState(state: EditorState) {
    setElements(state.elements);
    setVariables(state.variables);
    setSelectedId((current) => (state.elements.some((element) => element.id === current) ? current : null));
  }

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) return;
    setFuture((current) => [cloneEditorState(elements, variables), ...current.slice(0, 49)]);
    setPast((current) => current.slice(0, -1));
    restoreState(previous);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setPast((current) => [...current.slice(-49), cloneEditorState(elements, variables)]);
    setFuture((current) => current.slice(1));
    restoreState(next);
  }

  function updateElement(element: TextElement, recordHistory = true) {
    if (recordHistory) pushHistory();
    setElements((current) => current.map((item) => (item.id === element.id ? element : item)));
  }

  function patchElement(id: string, patch: Partial<TextElement>, recordHistory = true) {
    if (recordHistory) pushHistory();
    setElements((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addText() {
    if (!template) return;
    pushHistory();
    const fieldName = nextFieldName();
    const element = newTextElement(currentPage, elements.length + 1, fieldName);
    setElements((current) => [...current, element]);
    setVariables((current) => mergeDetectedVariables([...current, newVariable(fieldName)], [...elements, element]));
    setSelectedId(element.id);
  }

  function addButton() {
    if (!template) return;
    pushHistory();
    const element = newButtonElement(currentPage, elements.length + 1);
    setElements((current) => [...current, element]);
    setSelectedId(element.id);
  }

  async function addImage(file: File | null) {
    if (!template || !file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a PNG, JPG, or other image file.");
      return;
    }
    pushHistory();
    try {
      const imageSrc = await imageFileToDataUrl(file);
      const element = newImageElement(currentPage, elements.length + 1, imageSrc, file.name);
      setElements((current) => [...current, element]);
      setSelectedId(element.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add image");
    }
  }

  function nextFieldName() {
    const names = new Set(variables.map((variable) => variable.name));
    let index = variables.length + 1;
    let name = `field_${index}`;
    while (names.has(name)) {
      index += 1;
      name = `field_${index}`;
    }
    return name;
  }

  function duplicate(id: string) {
    const source = elements.find((element) => element.id === id);
    if (!source) return;
    pushHistory();
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
      setElements(saved.text_elements.map(normalizeElement));
      setVariables(mergeDetectedVariables(saved.variables, saved.text_elements));
      setPast([]);
      setFuture([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function applyPageLayout(nextPages: TemplatePage[]) {
    if (!template) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await updatePageLayout(template.id, nextPages.map((page) => page.source_page_number));
      setTemplate(saved);
      setElements(saved.text_elements.map(normalizeElement));
      setVariables(mergeDetectedVariables(saved.variables, saved.text_elements));
      const preferredPage = saved.pages.find((item) => item.page_number === currentPage) ?? saved.pages[0];
      setCurrentPage(preferredPage?.page_number ?? 1);
      setSelectedId(null);
      setPast([]);
      setFuture([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Page update failed");
    } finally {
      setSaving(false);
    }
  }

  function deletePage(pageToDelete: TemplatePage) {
    if (!template || template.pages.length <= 1) return;
    const confirmed = window.confirm(`Delete page ${pageToDelete.page_number} from this template? Text boxes on that page will be removed.`);
    if (!confirmed) return;
    void applyPageLayout(template.pages.filter((page) => page.source_page_number !== pageToDelete.source_page_number));
  }

  function movePage(pageToMove: TemplatePage, direction: "up" | "down") {
    if (!template) return;
    const pageIndex = template.pages.findIndex((page) => page.source_page_number === pageToMove.source_page_number);
    const targetIndex = direction === "up" ? pageIndex - 1 : pageIndex + 1;
    if (pageIndex < 0 || targetIndex < 0 || targetIndex >= template.pages.length) return;
    const nextPages = [...template.pages];
    [nextPages[pageIndex], nextPages[targetIndex]] = [nextPages[targetIndex], nextPages[pageIndex]];
    void applyPageLayout(nextPages);
  }

  function renameVariable(oldName: string, newName: string) {
    if (oldName === newName) return;
    pushHistory();
    setElements((current) => current.map((element) => ({ ...element, content: element.content.replaceAll(`{{${oldName}}}`, `{{${newName}}}`) })));
  }

  function renameSelectedVariable(rawName: string) {
    if (!selected) return;
    if (!rawName.trim()) {
      const oldName = firstVariableName(selected.content);
      if (!oldName) return;
      pushHistory();
      const content = selected.content.replaceAll(`{{${oldName}}}`, oldName.replaceAll("_", " "));
      updateElement({ ...selected, content }, false);
      setVariables((current) => {
        const nextElements = elements.map((element) => (element.id === selected.id ? { ...element, content } : element));
        const usedNames = new Set(extractVariablesFromElements(nextElements));
        return current.filter((variable) => usedNames.has(variable.name));
      });
      return;
    }
    const newName = normalizeVariableName(rawName);
    const oldName = firstVariableName(selected.content);
    if (oldName === newName) return;
    pushHistory();
    const content = oldName ? selected.content.replaceAll(`{{${oldName}}}`, `{{${newName}}}`) : `{{${newName}}}`;
    updateElement({ ...selected, content }, false);
    setVariables((current) => {
      const withoutDuplicate = current.filter((variable) => variable.name !== newName || variable.name === oldName);
      return mergeDetectedVariables(
        withoutDuplicate.map((variable) => (variable.name === oldName ? { ...variable, name: newName, label: variable.label || newName.replaceAll("_", " ") } : variable)),
        elements.map((element) => (element.id === selected.id ? { ...element, content } : element))
      );
    });
  }

  function updateVariables(nextVariables: TemplateVariable[]) {
    pushHistory();
    setVariables(nextVariables);
  }

  function deleteElement(id: string) {
    const deleted = elements.find((element) => element.id === id);
    if (!deleted) return;
    pushHistory();
    const nextElements = elements.filter((element) => element.id !== id);
    const deletedNames = extractVariablesFromElements([deleted]);
    const stillUsedNames = new Set(extractVariablesFromElements(nextElements));
    setElements(nextElements);
    setVariables((current) => current.filter((variable) => !deletedNames.includes(variable.name) || stillUsedNames.has(variable.name)));
    setSelectedId(null);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:h-screen lg:overflow-hidden">
      <TopToolbar
        name={template.name}
        zoom={zoom}
        saving={saving}
        preview={preview}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onNameChange={(name) => setTemplate({ ...template, name })}
        onZoomChange={setZoom}
        onAddText={addText}
        onAddButton={addButton}
        onAddImage={(file) => void addImage(file)}
        onSave={() => void handleSave()}
        onUndo={undo}
        onRedo={redo}
        onBackHome={() => router.push("/templates")}
        onPreviewToggle={() => setPreview((value) => !value)}
        onGenerate={() => router.push(`/templates/${template.id}/generate`)}
      />
      <div className="min-h-0 flex-1 overflow-auto lg:overflow-hidden">
        <Document className="min-h-full lg:h-full" file={originalPdfUrl(template.id)} loading={<div className="p-6">Loading PDF...</div>}>
          <div className="flex min-h-full flex-col lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:flex-row">
            <PageSidebar pages={template.pages} currentPage={currentPage} onPageChange={setCurrentPage} onDeletePage={deletePage} onMovePage={movePage} />
            <main className="min-w-0 flex-1 overflow-auto bg-canvas p-3 sm:p-6 lg:p-8" onClick={() => setSelectedId(null)}>
              <div className="mx-auto w-fit max-w-full overflow-visible" onClick={(event) => event.stopPropagation()}>
                <PdfPageView
                  page={page}
                  zoom={zoom}
                  elements={elements}
                  selectedId={selectedId}
                  preview={preview}
                  sampleData={sampleData}
                  onSelect={setSelectedId}
                  onPatch={patchElement}
                  onBeforeChange={pushHistory}
                  onDelete={deleteElement}
                  onDuplicate={duplicate}
                />
              </div>
            </main>
            <aside className="w-full shrink-0 overflow-y-auto bg-white lg:h-[calc(100vh-4rem)] lg:w-96">
              <FormattingPanel
                element={selected}
                linkedVariableName={selected ? firstVariableName(selected.content) : ""}
                fontOptions={fontOptions}
                onChange={updateElement}
                onVariableNameChange={renameSelectedVariable}
                onDelete={() => selected && deleteElement(selected.id)}
                onBringForward={() => selected && updateElement({ ...selected, z_index: selected.z_index + 1 })}
                onSendBackward={() => selected && updateElement({ ...selected, z_index: Math.max(0, selected.z_index - 1) })}
              />
              <VariableManager variables={variables} elementContents={elements} onChange={updateVariables} onRename={renameVariable} />
            </aside>
          </div>
        </Document>
      </div>
    </div>
  );
}
