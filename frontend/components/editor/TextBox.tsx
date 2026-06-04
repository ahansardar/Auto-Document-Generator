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
  onPatch: (id: string, patch: Partial<TextElement>, recordHistory?: boolean) => void;
  onBeforeChange: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

export function TextBox({ element, scale, selected, preview, sampleData, onSelect, onPatch, onBeforeChange, onDelete, onDuplicate }: Props) {
  const left = element.x * scale;
  const top = element.y * scale;
  const width = element.width * scale;
  const height = element.height * scale;

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (element.locked || preview) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onBeforeChange();
    const startX = event.clientX;
    const startY = event.clientY;
    const original = { x: element.x, y: element.y };

    const move = (moveEvent: globalThis.PointerEvent) => {
      onPatch(element.id, {
        x: Math.max(0, original.x + (moveEvent.clientX - startX) / scale),
        y: Math.max(0, original.y + (moveEvent.clientY - startY) / scale)
      }, false);
    };

    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    if (element.locked || preview) return;
    event.preventDefault();
    event.stopPropagation();
    onBeforeChange();
    const startX = event.clientX;
    const startY = event.clientY;
    const original = { width: element.width, height: element.height };

    const move = (moveEvent: globalThis.PointerEvent) => {
      onPatch(element.id, {
        width: Math.max(8, original.width + (moveEvent.clientX - startX) / scale),
        height: Math.max(8, original.height + (moveEvent.clientY - startY) / scale)
      }, false);
    };

    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }

  const displayText = preview ? replaceVariables(element.content, sampleData) : element.content;
  const displayLink = preview ? replaceVariables(element.hyperlink_url ?? "", sampleData) : element.hyperlink_url ?? "";
  const isImage = element.element_type === "image";
  const isButton = element.element_type === "button";
  const backgroundColor = element.background_color && element.background_opacity > 0 ? hexToRgba(element.background_color, element.background_opacity) : "transparent";
  const content = isImage ? (
    element.image_src ? (
      <img className="h-full w-full select-none object-fill" src={element.image_src} alt={element.image_alt ?? ""} draggable={false} style={{ opacity: element.text_opacity }} />
    ) : (
      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">No image</div>
    )
  ) : (
    <span>{displayText}</span>
  );
  const renderedContent = preview && displayLink ? (
    <a className="block h-full w-full text-inherit no-underline" href={normalizeHref(displayLink)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
      {content}
    </a>
  ) : content;

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={startDrag}
      onClick={onSelect}
      className={`pointer-events-auto absolute cursor-move select-none touch-none whitespace-pre-wrap ${isButton ? "flex items-center justify-center" : ""} ${selected && !preview ? "outline outline-2 outline-blue-500" : "outline-none"}`}
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
        backgroundColor,
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
      {renderedContent}
      {selected && !preview ? (
        <>
          <div className="absolute -top-9 left-0 flex gap-1 rounded bg-ink p-1 text-white shadow" onPointerDown={(event) => event.stopPropagation()}>
            <button aria-label={element.locked ? "Unlock text box" : "Lock text box"} title={element.locked ? "Unlock" : "Lock"} className="p-1" onClick={(event) => { event.stopPropagation(); onPatch(element.id, { locked: !element.locked }); }}>
              {element.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            </button>
            <button aria-label="Duplicate text box" title="Duplicate" className="p-1" onClick={(event) => { event.stopPropagation(); onDuplicate(); }}>
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button aria-label="Delete text box" title="Delete" className="p-1" onClick={(event) => { event.stopPropagation(); onDelete(); }}>
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

function hexToRgba(hex: string, opacity: number) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return hex;
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function normalizeHref(value: string) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
  return `https://${value}`;
}
