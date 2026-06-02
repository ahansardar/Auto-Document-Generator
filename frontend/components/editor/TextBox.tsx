"use client";

import type { PointerEvent } from "react";
import { Copy, Lock, Trash2, Unlock } from "lucide-react";
import type { TextElement } from "@/lib/types";
import { replaceVariables } from "@/lib/variables";

type Props = {
  element: TextElement;
  scale: number;
  selected: boolean;
  preview: boolean;
  sampleData: Record<string, string>;
  onSelect: () => void;
  onChange: (element: TextElement) => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

export function TextBox({ element, scale, selected, preview, sampleData, onSelect, onChange, onDelete, onDuplicate }: Props) {
  const left = element.x * scale;
  const top = element.y * scale;
  const width = element.width * scale;
  const height = element.height * scale;

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (element.locked || preview) return;
    event.preventDefault();
    onSelect();
    const startX = event.clientX;
    const startY = event.clientY;
    const original = { x: element.x, y: element.y };
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    target.onpointermove = (moveEvent) => {
      onChange({
        ...element,
        x: Math.max(0, original.x + (moveEvent.clientX - startX) / scale),
        y: Math.max(0, original.y + (moveEvent.clientY - startY) / scale)
      });
    };
    target.onpointerup = () => {
      target.onpointermove = null;
      target.onpointerup = null;
    };
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    if (element.locked || preview) return;
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const original = { width: element.width, height: element.height };
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    target.onpointermove = (moveEvent) => {
      onChange({
        ...element,
        width: Math.max(8, original.width + (moveEvent.clientX - startX) / scale),
        height: Math.max(8, original.height + (moveEvent.clientY - startY) / scale)
      });
    };
    target.onpointerup = () => {
      target.onpointermove = null;
      target.onpointerup = null;
    };
  }

  const displayText = preview ? replaceVariables(element.content, sampleData) : element.content;

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={startDrag}
      onClick={onSelect}
      className={`absolute whitespace-pre-wrap ${selected && !preview ? "outline outline-2 outline-blue-500" : "outline-none"}`}
      style={{
        left,
        top,
        width,
        height,
        zIndex: element.z_index,
        paddingTop: element.padding_top * scale,
        paddingRight: element.padding_right * scale,
        paddingBottom: element.padding_bottom * scale,
        paddingLeft: element.padding_left * scale,
        backgroundColor: element.background_color ?? "transparent",
        opacity: element.text_opacity,
        color: element.text_color,
        fontFamily: element.font_family,
        fontSize: element.font_size * scale,
        fontWeight: element.is_bold ? 700 : element.font_weight,
        fontStyle: element.is_italic ? "italic" : element.font_style,
        textDecoration: [element.is_underline ? "underline" : "", element.is_strikethrough ? "line-through" : ""].join(" "),
        textAlign: element.text_align,
        lineHeight: element.line_height,
        letterSpacing: element.letter_spacing * scale,
        borderWidth: element.border_width * scale,
        borderStyle: element.border_style,
        borderColor: element.border_color,
        borderRadius: element.border_radius * scale,
        overflow: element.clip_overflow ? "hidden" : "visible",
        transform: `rotate(${element.rotation}deg)`,
        transformOrigin: "center"
      }}
    >
      {displayText}
      {selected && !preview ? (
        <>
          <div className="absolute -top-9 left-0 flex gap-1 rounded bg-ink p-1 text-white shadow">
            <button title={element.locked ? "Unlock" : "Lock"} className="p-1" onClick={(event) => { event.stopPropagation(); onChange({ ...element, locked: !element.locked }); }}>
              {element.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            </button>
            <button title="Duplicate" className="p-1" onClick={(event) => { event.stopPropagation(); onDuplicate(); }}>
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button title="Delete" className="p-1" onClick={(event) => { event.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            title="Resize"
            aria-label="Resize"
            onPointerDown={startResize}
            className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border border-blue-700 bg-white"
          />
        </>
      ) : null}
    </div>
  );
}
