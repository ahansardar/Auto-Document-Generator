"use client";

import { useEffect, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Lock, Trash2, Unlock } from "lucide-react";
import type { EditorFont, TextElement } from "@/lib/types";

type Props = {
  element: TextElement | null;
  linkedVariableName: string;
  fontOptions: EditorFont[];
  onChange: (element: TextElement) => void;
  onVariableNameChange: (name: string) => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onFontUpload: (file: File | null) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-zinc-600">
      {label}
      {children}
    </label>
  );
}

const inputClass = "min-w-0 w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-ink";
const panelCard = "min-w-0 rounded border border-line bg-white p-3";

export function FormattingPanel({ element, linkedVariableName, fontOptions, onChange, onVariableNameChange, onDelete, onBringForward, onSendBackward, onFontUpload }: Props) {
  const [draftVariableName, setDraftVariableName] = useState(linkedVariableName);

  useEffect(() => {
    setDraftVariableName(linkedVariableName);
  }, [linkedVariableName]);

  if (!element) {
    return (
      <section className="min-w-0 border-t border-line bg-white p-3 sm:p-4 lg:border-l lg:border-t-0">
        <div className="rounded border border-dashed border-line bg-canvas p-4 text-sm text-zinc-600">
          Add a text box, select it, then name the variable that should fill it.
        </div>
      </section>
    );
  }

  const patch = (values: Partial<TextElement>) => onChange({ ...element, ...values });
  const isImage = element.element_type === "image";
  const isButton = element.element_type === "button";
  const isTextLike = element.element_type === "text" || element.element_type === "button";

  return (
    <section className="min-w-0 border-t border-line bg-white p-3 sm:p-4 lg:border-l lg:border-t-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Format</h2>
        <div className="flex gap-2">
          <button title="Delete text box" className="rounded border border-line p-2 text-red-600" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </button>
          <button title={element.locked ? "Unlock" : "Lock"} className="rounded border border-line p-2" onClick={() => patch({ locked: !element.locked })}>
            {element.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="grid gap-4">
        <div className={panelCard}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Element</div>
          <div className="grid gap-3">
            <Field label="Type">
              <input className={inputClass} value={element.element_type} readOnly />
            </Field>
            <Field label="Hyperlink URL">
              <input
                className={inputClass}
                value={element.hyperlink_url ?? ""}
                onChange={(event) => patch({ hyperlink_url: event.target.value })}
                placeholder="https://example.com or {{profile_url}}"
              />
            </Field>
            <p className="text-xs text-zinc-500">Links are clickable in generated PDFs. You can also use variables inside URLs.</p>
          </div>
        </div>

        {isImage ? (
          <div className={panelCard}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Image</div>
            <div className="grid gap-3">
              {element.image_src ? <img className="max-h-40 rounded border border-line object-contain" src={element.image_src} alt={element.image_alt ?? ""} /> : null}
              <Field label="Alt text">
                <input className={inputClass} value={element.image_alt ?? ""} onChange={(event) => patch({ image_alt: event.target.value })} />
              </Field>
              <Field label="Opacity"><input type="range" min="0" max="1" step="0.05" value={element.text_opacity} onChange={(event) => patch({ text_opacity: Number(event.target.value) })} /></Field>
            </div>
          </div>
        ) : null}

        {isButton ? (
          <div className={panelCard}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Button style</div>
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded border border-line px-3 py-2 text-sm" onClick={() => patch({ background_color: "#1c1812", background_opacity: 1, text_color: "#ffffff", border_width: 0 })}>Opaque</button>
              <button className="rounded border border-line px-3 py-2 text-sm" onClick={() => patch({ background_opacity: 0, text_color: "#1c1812", border_width: 1, border_color: "#1c1812" })}>Transparent</button>
            </div>
          </div>
        ) : null}

        {isTextLike ? <div className={panelCard}>
          <div className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">1. Text and linked field</div>
            <p className="mt-1 text-xs text-zinc-500">Keep variable name blank for static text, or enter a name to link this text to CSV/generated data.</p>
          </div>
          <div className="grid gap-3">
            <Field label="Variable name">
              <input
                className={inputClass}
                value={draftVariableName}
                onChange={(event) => setDraftVariableName(event.target.value)}
                onBlur={() => onVariableNameChange(draftVariableName)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                placeholder="certificate_id"
              />
            </Field>
            <Field label="Text token">
              <textarea className={`${inputClass} min-h-20`} value={element.content} onChange={(event) => patch({ content: event.target.value })} />
            </Field>
          </div>
        </div> : null}

        {isTextLike ? <div className={panelCard}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">2. Typography</div>
          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Font family">
                <select className={inputClass} value={element.font_family} onChange={(event) => patch({ font_family: event.target.value })}>
                  {fontOptions.map((font) => (
                    <option key={font.family} value={font.family}>
                      {font.family}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Font size"><input className={inputClass} type="number" value={element.font_size} onChange={(event) => patch({ font_size: Number(event.target.value) })} /></Field>
            </div>
            <Field label="Upload custom font">
              <input
                className={inputClass}
                type="file"
                accept=".ttf,.otf,.ttc,font/ttf,font/otf"
                onChange={(event) => {
                  onFontUpload(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button title="Bold" className={`rounded border p-2 ${element.is_bold ? "border-ink bg-zinc-100" : "border-line"}`} onClick={() => patch({ is_bold: !element.is_bold })}><Bold className="h-4 w-4" /></button>
              <button title="Italic" className={`rounded border p-2 ${element.is_italic ? "border-ink bg-zinc-100" : "border-line"}`} onClick={() => patch({ is_italic: !element.is_italic })}><Italic className="h-4 w-4" /></button>
              <button title="Align left" className={`rounded border p-2 ${element.text_align === "left" ? "border-ink bg-zinc-100" : "border-line"}`} onClick={() => patch({ text_align: "left" })}><AlignLeft className="h-4 w-4" /></button>
              <button title="Align center" className={`rounded border p-2 ${element.text_align === "center" ? "border-ink bg-zinc-100" : "border-line"}`} onClick={() => patch({ text_align: "center" })}><AlignCenter className="h-4 w-4" /></button>
              <button title="Align right" className={`rounded border p-2 ${element.text_align === "right" ? "border-ink bg-zinc-100" : "border-line"}`} onClick={() => patch({ text_align: "right" })}><AlignRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div> : null}

        <div className={`${panelCard} grid gap-3`}>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">3. Appearance</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Text color"><input className={inputClass} type="color" value={element.text_color} onChange={(event) => patch({ text_color: event.target.value })} /></Field>
            <Field label="Background"><input className={inputClass} type="color" value={element.background_color ?? "#ffffff"} onChange={(event) => patch({ background_color: event.target.value })} /></Field>
            <Field label="Text opacity"><input type="range" min="0" max="1" step="0.05" value={element.text_opacity} onChange={(event) => patch({ text_opacity: Number(event.target.value) })} /></Field>
            <Field label="Background opacity"><input type="range" min="0" max="1" step="0.05" value={element.background_opacity} onChange={(event) => patch({ background_opacity: Number(event.target.value) })} /></Field>
          </div>
        </div>

        <div className={`${panelCard} grid grid-cols-2 gap-3 sm:grid-cols-4`}>
          <div className="col-span-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:col-span-4">4. Position</div>
          <Field label="X"><input className={inputClass} type="number" value={Math.round(element.x)} onChange={(event) => patch({ x: Number(event.target.value) })} /></Field>
          <Field label="Y"><input className={inputClass} type="number" value={Math.round(element.y)} onChange={(event) => patch({ y: Number(event.target.value) })} /></Field>
          <Field label="Width"><input className={inputClass} type="number" value={Math.round(element.width)} onChange={(event) => patch({ width: Number(event.target.value) })} /></Field>
          <Field label="Height"><input className={inputClass} type="number" value={Math.round(element.height)} onChange={(event) => patch({ height: Number(event.target.value) })} /></Field>
        </div>
        <div className={`${panelCard} grid grid-cols-1 gap-3 sm:grid-cols-2`}>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:col-span-2">5. Spacing and transform</div>
          <Field label="Line height"><input className={inputClass} type="number" step="0.1" value={element.line_height} onChange={(event) => patch({ line_height: Number(event.target.value) })} /></Field>
          <Field label="Letter spacing"><input className={inputClass} type="number" value={element.letter_spacing} onChange={(event) => patch({ letter_spacing: Number(event.target.value) })} /></Field>
          <Field label="Word spacing"><input className={inputClass} type="number" value={element.word_spacing} onChange={(event) => patch({ word_spacing: Number(event.target.value) })} /></Field>
          <Field label="Rotation"><input className={inputClass} type="number" value={element.rotation} onChange={(event) => patch({ rotation: Number(event.target.value) })} /></Field>
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
        <div className={`${panelCard} grid grid-cols-2 gap-2 sm:grid-cols-4`}>
          <div className="col-span-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:col-span-4">6. Padding and border</div>
          <Field label="Pad T"><input className={inputClass} type="number" value={element.padding_top} onChange={(event) => patch({ padding_top: Number(event.target.value) })} /></Field>
          <Field label="Pad R"><input className={inputClass} type="number" value={element.padding_right} onChange={(event) => patch({ padding_right: Number(event.target.value) })} /></Field>
          <Field label="Pad B"><input className={inputClass} type="number" value={element.padding_bottom} onChange={(event) => patch({ padding_bottom: Number(event.target.value) })} /></Field>
          <Field label="Pad L"><input className={inputClass} type="number" value={element.padding_left} onChange={(event) => patch({ padding_left: Number(event.target.value) })} /></Field>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button className="rounded border border-line px-3 py-2 text-sm" onClick={onBringForward}>Bring forward</button>
          <button className="rounded border border-line px-3 py-2 text-sm" onClick={onSendBackward}>Send backward</button>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={element.auto_shrink} onChange={(event) => patch({ auto_shrink: event.target.checked })} /> Auto shrink text</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={element.clip_overflow} onChange={(event) => patch({ clip_overflow: event.target.checked })} /> Clip overflow</label>
      </div>
    </section>
  );
}
