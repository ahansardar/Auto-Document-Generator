"use client";

import { Page } from "react-pdf";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { TemplatePage } from "@/lib/types";

export function PageSidebar({
  pages,
  currentPage,
  onPageChange,
  onDeletePage,
  onMovePage
}: {
  pages: TemplatePage[];
  currentPage: number;
  onPageChange: (page: number) => void;
  onDeletePage: (page: TemplatePage) => void;
  onMovePage: (page: TemplatePage, direction: "up" | "down") => void;
}) {
  return (
    <aside className="w-full shrink-0 overflow-x-auto border-b border-line bg-white p-3 lg:h-full lg:w-44 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:mb-3">Pages</div>
      <div className="flex gap-3 lg:block lg:space-y-3">
        {pages.map((page, index) => (
          <div
            key={page.page_number}
            className={`min-w-32 rounded border p-2 text-xs lg:w-full ${currentPage === page.page_number ? "border-ink bg-zinc-100" : "border-line"}`}
          >
            <button className="block w-full text-left" onClick={() => onPageChange(page.page_number)}>
              <Page pageNumber={page.source_page_number} width={96} renderTextLayer={false} renderAnnotationLayer={false} />
              <span className="mt-2 block">Page {page.page_number}</span>
              <span className="mt-0.5 block text-[10px] text-zinc-500">Original {page.source_page_number}</span>
            </button>
            <span className="mt-2 flex gap-1">
              <button
                title="Move page up"
                disabled={index === 0}
                className="rounded border border-line p-1 disabled:opacity-35"
                onClick={() => onMovePage(page, "up")}
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                title="Move page down"
                disabled={index === pages.length - 1}
                className="rounded border border-line p-1 disabled:opacity-35"
                onClick={() => onMovePage(page, "down")}
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              <button
                title="Delete page"
                disabled={pages.length <= 1}
                className="rounded border border-line p-1 text-red-600 disabled:opacity-35"
                onClick={() => onDeletePage(page)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
