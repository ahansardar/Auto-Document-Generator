"use client";

import { Page } from "react-pdf";
import type { TemplatePage } from "@/lib/types";

export function PageSidebar({ pages, currentPage, onPageChange }: { pages: TemplatePage[]; currentPage: number; onPageChange: (page: number) => void }) {
  return (
    <aside className="h-full w-44 shrink-0 overflow-y-auto border-r border-line bg-white p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Pages</div>
      <div className="space-y-3">
        {pages.map((page) => (
          <button
            key={page.page_number}
            className={`w-full rounded border p-2 text-left text-xs ${currentPage === page.page_number ? "border-ink bg-zinc-100" : "border-line"}`}
            onClick={() => onPageChange(page.page_number)}
          >
            <Page pageNumber={page.page_number} width={110} renderTextLayer={false} renderAnnotationLayer={false} />
            <span className="mt-2 block">Page {page.page_number}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
