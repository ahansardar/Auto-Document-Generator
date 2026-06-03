"use client";

import { ArrowLeft, Eye, FilePlus2, Minus, Plus, Redo2, Save, Undo2, Wand2 } from "lucide-react";

type Props = {
  name: string;
  zoom: number;
  saving: boolean;
  preview: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onNameChange: (name: string) => void;
  onZoomChange: (zoom: number) => void;
  onAddText: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onBackHome: () => void;
  onPreviewToggle: () => void;
  onGenerate: () => void;
};

export function TopToolbar({ name, zoom, saving, preview, canUndo, canRedo, onNameChange, onZoomChange, onAddText, onSave, onUndo, onRedo, onBackHome, onPreviewToggle, onGenerate }: Props) {
  return (
    <header className="flex min-h-16 flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2 sm:gap-3 sm:px-4">
      <button title="Back to home" className="rounded border border-line px-2.5 py-2 text-sm sm:px-3" onClick={onBackHome}>
        <ArrowLeft className="mr-2 inline h-4 w-4" /> Home
      </button>
      <input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        className="min-w-44 flex-1 border-0 bg-transparent text-base font-semibold outline-none sm:text-lg"
      />
      <div className="flex shrink-0 items-center gap-2">
      <button title="Zoom out" className="rounded border border-line p-2" onClick={() => onZoomChange(Math.max(0.35, zoom - 0.1))}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-12 text-center text-sm sm:w-14">{Math.round(zoom * 100)}%</span>
      <button title="Zoom in" className="rounded border border-line p-2" onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}>
        <Plus className="h-4 w-4" />
      </button>
      </div>
      <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
      <button title="Add text box" className="shrink-0 rounded bg-ink px-3 py-2 text-sm font-medium text-white" onClick={onAddText}>
        <FilePlus2 className="mr-2 inline h-4 w-4" /> Text
      </button>
      <button title="Undo" className="shrink-0 rounded border border-line px-3 py-2 text-sm disabled:opacity-40" onClick={onUndo} disabled={!canUndo}>
        <Undo2 className="mr-2 inline h-4 w-4" /> Undo
      </button>
      <button title="Redo" className="shrink-0 rounded border border-line px-3 py-2 text-sm disabled:opacity-40" onClick={onRedo} disabled={!canRedo}>
        <Redo2 className="mr-2 inline h-4 w-4" /> Redo
      </button>
      <button title="Preview variables" className={`shrink-0 rounded border px-3 py-2 text-sm ${preview ? "border-ink bg-zinc-100" : "border-line"}`} onClick={onPreviewToggle}>
        <Eye className="mr-2 inline h-4 w-4" /> Preview
      </button>
      <button title="Save template" className="shrink-0 rounded border border-line px-3 py-2 text-sm" onClick={onSave} disabled={saving}>
        <Save className="mr-2 inline h-4 w-4" /> {saving ? "Saving" : "Save"}
      </button>
      <button title="Generate PDF" className="shrink-0 rounded border border-line px-3 py-2 text-sm" onClick={onGenerate}>
        <Wand2 className="mr-2 inline h-4 w-4" /> Generate
      </button>
      </div>
    </header>
  );
}
