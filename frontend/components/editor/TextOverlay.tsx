"use client";

import type { TextElement } from "@/lib/types";
import { TextBox } from "./TextBox";

type Props = {
  pageNumber: number;
  elements: TextElement[];
  scale: number;
  selectedId: string | null;
  preview: boolean;
  sampleData: Record<string, string>;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: Partial<TextElement>, recordHistory?: boolean) => void;
  onBeforeChange: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
};

export function TextOverlay(props: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {props.elements
        .filter((element) => element.page_number === props.pageNumber)
        .map((element) => (
          <TextBox
            key={element.id}
            element={element}
            scale={props.scale}
            selected={props.selectedId === element.id}
            preview={props.preview}
            sampleData={props.sampleData}
            onSelect={() => props.onSelect(element.id)}
            onPatch={props.onPatch}
            onBeforeChange={props.onBeforeChange}
            onDelete={() => props.onDelete(element.id)}
            onDuplicate={() => props.onDuplicate(element.id)}
          />
        ))}
    </div>
  );
}
