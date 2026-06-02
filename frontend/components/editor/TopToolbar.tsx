"use client";

import { Eye, FilePlus2, Minus, Plus, Save, Wand2 } from "lucide-react";

type Props = {
  name: string;
  zoom: number;
  saving: boolean;
  preview: boolean;
  onNameChange: (name: string) => void;
  onZoomChange: (zoom: number) => void;
  onAddText: () => void;
  onSave: () => void;
  onPreviewToggle: () => void;
  onGenerate: () => void;
};

export function TopToolbar({ name, zoom, saving, preview, onNameChange, onZoomChange, onAddText, onSave, onPreviewToggle, onGenerate }: Props) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-line bg-white px-4">
      <input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        className="min-w-0 flex-1 border-0 bg-transparent text-lg font-semibold outline-none"
      />
      <button title="Zoom out" className="rounded border border-line p-2" onClick={() => onZoomChange(Math.max(0.35, zoom - 0.1))}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-14 text-center text-sm">{Math.round(zoom * 100)}%</span>
      <button title="Zoom in" className="rounded border border-line p-2" onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}>
        <Plus className="h-4 w-4" />
      </button>
      <button title="Add text box" className="rounded bg-ink px-3 py-2 text-sm font-medium text-white" onClick={onAddText}>
        <FilePlus2 className="mr-2 inline h-4 w-4" /> Text
      </button>
      <button title="Preview variables" className={`rounded border px-3 py-2 text-sm ${preview ? "border-ink bg-zinc-100" : "border-line"}`} onClick={onPreviewToggle}>
        <Eye className="mr-2 inline h-4 w-4" /> Preview
      </button>
      <button title="Save template" className="rounded border border-line px-3 py-2 text-sm" onClick={onSave} disabled={saving}>
        <Save className="mr-2 inline h-4 w-4" /> {saving ? "Saving" : "Save"}
      </button>
      <button title="Generate PDF" className="rounded border border-line px-3 py-2 text-sm" onClick={onGenerate}>
        <Wand2 className="mr-2 inline h-4 w-4" /> Generate
      </button>
    </header>
  );
}
