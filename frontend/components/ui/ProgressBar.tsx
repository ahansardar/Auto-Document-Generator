"use client";

type ProgressBarProps = {
  value: number;
  label: string;
  detail?: string;
};

export function ProgressBar({ value, label, detail }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="rounded border border-line bg-canvas p-3" role="status" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="shrink-0 tabular-nums text-zinc-600">{safeValue}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-line">
        <div className="h-full rounded-full bg-ink transition-all duration-300 ease-out" style={{ width: `${safeValue}%` }} />
      </div>
      {detail ? <div className="mt-2 text-xs text-zinc-600">{detail}</div> : null}
    </div>
  );
}
