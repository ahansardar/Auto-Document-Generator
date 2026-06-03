"use client";

import { Page } from "react-pdf";
import type { TemplatePage, TextElement } from "@/lib/types";
import { TextOverlay } from "./TextOverlay";

type Props = {
  page: TemplatePage;
  zoom: number;
  elements: TextElement[];
  selectedId: string | null;
  preview: boolean;
  sampleData: Record<string, string>;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: Partial<TextElement>, recordHistory?: boolean) => void;
  onBeforeChange: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
};

export function PdfPageView({ page, zoom, elements, selectedId, preview, sampleData, onSelect, onPatch, onBeforeChange, onDelete, onDuplicate }: Props) {
  const width = page.width * zoom;
  const height = page.height * zoom;
  return (
    <div className="relative" style={{ width, height }}>
      <Page pageNumber={page.source_page_number} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
      <TextOverlay
        pageNumber={page.page_number}
        elements={elements}
        scale={zoom}
        selectedId={selectedId}
        preview={preview}
        sampleData={sampleData}
        onSelect={onSelect}
        onPatch={onPatch}
        onBeforeChange={onBeforeChange}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
      />
    </div>
  );
}
