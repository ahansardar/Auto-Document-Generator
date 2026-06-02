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
  onChange: (element: TextElement) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
};

export function PdfPageView({ page, zoom, elements, selectedId, preview, sampleData, onSelect, onChange, onDelete, onDuplicate }: Props) {
  const width = page.width * zoom;
  const height = page.height * zoom;
  return (
    <div className="relative" style={{ width, minHeight: height }}>
      <Page pageNumber={page.page_number} width={width} renderAnnotationLayer={false} />
      <TextOverlay
        pageNumber={page.page_number}
        elements={elements}
        scale={zoom}
        selectedId={selectedId}
        preview={preview}
        sampleData={sampleData}
        onSelect={onSelect}
        onChange={onChange}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
      />
    </div>
  );
}
