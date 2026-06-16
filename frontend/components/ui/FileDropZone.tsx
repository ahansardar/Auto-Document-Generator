"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";

type FileDropZoneProps = {
  accept: string;
  title: string;
  description: string;
  file?: File | null;
  disabled?: boolean;
  compact?: boolean;
  onFile: (file: File | null) => void;
};

export function FileDropZone({ accept, title, description, file, disabled = false, compact = false, onFile }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  function pickFirstFile(files: FileList | null) {
    if (!files?.length || disabled) return;
    onFile(files[0]);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !disabled) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        pickFirstFile(event.dataTransfer.files);
      }}
      className={[
        "group flex cursor-pointer flex-col items-center justify-center rounded border border-dashed bg-white text-center transition",
        compact ? "min-h-32 p-5" : "min-h-64 p-10",
        dragging ? "border-ink bg-canvas shadow-inner" : "border-line hover:border-ink",
        disabled ? "cursor-not-allowed opacity-60" : ""
      ].join(" ")}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => pickFirstFile(event.target.files)}
      />
      <div className="mb-3 rounded-full bg-canvas p-3 transition group-hover:scale-105">
        <FileUp className="h-6 w-6" aria-hidden />
      </div>
      <span className="text-base font-semibold text-ink">{dragging ? "Drop it here" : title}</span>
      <span className="mt-1 max-w-md text-sm text-zinc-600">{description}</span>
      <span className="mt-3 rounded-full border border-line bg-canvas px-3 py-1 text-xs text-zinc-600">
        {file ? file.name : "Click to browse, or drag and drop"}
      </span>
    </div>
  );
}
