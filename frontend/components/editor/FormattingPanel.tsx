"use client";

import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Lock, Unlock } from "lucide-react";
import type { TextElement } from "@/lib/types";

type Props = {
  element: TextElement | null;
  onChange: (element: TextElement) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-zinc-600">
      {label}
      {children}
    </label>
  );
}

const inputClass = "rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-ink";

export function FormattingPanel({ element, onChange, onBringForward, onSendBackward }: Props) {
  if (!element) {
    return (
      <aside className="min-h-0 flex-1 border-l border-line bg-white p-4">
        <div className="text-sm text-zinc-500">Select a text box to edit formatting.</div>
      </aside>
    );
  }

  const patch = (values: Partial<TextElement>) => onChange({ ...element, ...values });

  return (
    <aside className="min-h-0 flex-1 overflow-y-auto border-l border-line bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Format</h2>
        <button title={element.locked ? "Unlock" : "Lock"} className="rounded border border-line p-2" onClick={() => patch({ locked: !element.locked })}>
          {element.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </button>
      </div>
      <div className="grid gap-4">
        <Field label="Text">
          <textarea className={`${inputClass} min-h-24`} value={element.content} onChange={(event) => patch({ content: event.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Font family"><input className={inputClass} value={element.font_family} onChange={(event) => patch({ font_family: event.target.value })} /></Field>
          <Field label="Font size"><input className={inputClass} type="number" value={element.font_size} onChange={(event) => patch({ font_size: Number(event.target.value) })} /></Field>
        </div>
        <div className="flex gap-2">
          <button title="Bold" className={`rounded border p-2 ${element.is_bold ? "border-ink bg-zinc-100" : "border-line"}`} onClick={() => patch({ is_bold: !element.is_bold })}><Bold className="h-4 w-4" /></button>
          <button title="Italic" className={`rounded border p-2 ${element.is_italic ? "border-ink bg-zinc-100" : "border-line"}`} onClick={() => patch({ is_italic: !element.is_italic })}><Italic className="h-4 w-4" /></button>
          <button title="Align left" className={`rounded border p-2 ${element.text_align === "left" ? "border-ink bg-zinc-100" : "border-line"}`} onClick={() => patch({ text_align: "left" })}><AlignLeft className="h-4 w-4" /></button>
          <button title="Align center" className={`rounded border p-2 ${element.text_align === "center" ? "border-ink bg-zinc-100" : "border-line"}`} onClick={() => patch({ text_align: "center" })}><AlignCenter className="h-4 w-4" /></button>
          <button title="Align right" className={`rounded border p-2 ${element.text_align === "right" ? "border-ink bg-zinc-100" : "border-line"}`} onClick={() => patch({ text_align: "right" })}><AlignRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Text color"><input className={inputClass} type="color" value={element.text_color} onChange={(event) => patch({ text_color: event.target.value })} /></Field>
          <Field label="Background"><input className={inputClass} type="color" value={element.background_color ?? "#ffffff"} onChange={(event) => patch({ background_color: event.target.value })} /></Field>
          <Field label="Text opacity"><input type="range" min="0" max="1" step="0.05" value={element.text_opacity} onChange={(event) => patch({ text_opacity: Number(event.target.value) })} /></Field>
          <Field label="Background opacity"><input type="range" min="0" max="1" step="0.05" value={element.background_opacity} onChange={(event) => patch({ background_opacity: Number(event.target.value) })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="X"><input className={inputClass} type="number" value={Math.round(element.x)} onChange={(event) => patch({ x: Number(event.target.value) })} /></Field>
          <Field label="Y"><input className={inputClass} type="number" value={Math.round(element.y)} onChange={(event) => patch({ y: Number(event.target.value) })} /></Field>
          <Field label="Width"><input className={inputClass} type="number" value={Math.round(element.width)} onChange={(event) => patch({ width: Number(event.target.value) })} /></Field>
          <Field label="Height"><input className={inputClass} type="number" value={Math.round(element.height)} onChange={(event) => patch({ height: Number(event.target.value) })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Line height"><input className={inputClass} type="number" step="0.1" value={element.line_height} onChange={(event) => patch({ line_height: Number(event.target.value) })} /></Field>
          <Field label="Letter spacing"><input className={inputClass} type="number" value={element.letter_spacing} onChange={(event) => patch({ letter_spacing: Number(event.target.value) })} /></Field>
          <Field label="Word spacing"><input className={inputClass} type="number" value={element.word_spacing} onChange={(event) => patch({ word_spacing: Number(event.target.value) })} /></Field>
          <Field label="Rotation"><input className={inputClass} type="number" value={element.rotation} onChange={(event) => patch({ rotation: Number(event.target.value) })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Transform">
            <select className={inputClass} value={element.text_transform} onChange={(event) => patch({ text_transform: event.target.value as TextElement["text_transform"] })}>
              <option value="none">None</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </Field>
          <Field label="Vertical align">
            <select className={inputClass} value={element.vertical_align} onChange={(event) => patch({ vertical_align: event.target.value as TextElement["vertical_align"] })}>
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="bottom">Bottom</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Field label="Pad T"><input className={inputClass} type="number" value={element.padding_top} onChange={(event) => patch({ padding_top: Number(event.target.value) })} /></Field>
          <Field label="Pad R"><input className={inputClass} type="number" value={element.padding_right} onChange={(event) => patch({ padding_right: Number(event.target.value) })} /></Field>
          <Field label="Pad B"><input className={inputClass} type="number" value={element.padding_bottom} onChange={(event) => patch({ padding_bottom: Number(event.target.value) })} /></Field>
          <Field label="Pad L"><input className={inputClass} type="number" value={element.padding_left} onChange={(event) => patch({ padding_left: Number(event.target.value) })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Border width"><input className={inputClass} type="number" value={element.border_width} onChange={(event) => patch({ border_width: Number(event.target.value) })} /></Field>
          <Field label="Border color"><input className={inputClass} type="color" value={element.border_color} onChange={(event) => patch({ border_color: event.target.value })} /></Field>
          <Field label="Border style">
            <select className={inputClass} value={element.border_style} onChange={(event) => patch({ border_style: event.target.value as TextElement["border_style"] })}>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </Field>
          <Field label="Radius"><input className={inputClass} type="number" value={element.border_radius} onChange={(event) => patch({ border_radius: Number(event.target.value) })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="rounded border border-line px-3 py-2 text-sm" onClick={onBringForward}>Bring forward</button>
          <button className="rounded border border-line px-3 py-2 text-sm" onClick={onSendBackward}>Send backward</button>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={element.auto_shrink} onChange={(event) => patch({ auto_shrink: event.target.checked })} /> Auto shrink text</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={element.clip_overflow} onChange={(event) => patch({ clip_overflow: event.target.checked })} /> Clip overflow</label>
      </div>
    </aside>
  );
}
