"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

function getPageList(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [1];
  if (page > 3) pages.push("…");
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
    pages.push(i);
  }
  if (page < totalPages - 2) pages.push("…");
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function go(next: number) {
    const params = new URLSearchParams(search.toString());
    params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (total === 0) {
    return (
      <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500">
        <span>No results</span>
      </div>
    );
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = getPageList(page, totalPages);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 text-xs text-slate-500 border-t border-slate-100">
      <span>
        Showing <span className="font-medium text-slate-700">{start}</span>–
        <span className="font-medium text-slate-700">{end}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`g-${idx}`} className="px-1.5 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => go(p)}
              className={cn(
                "min-w-[32px] h-8 rounded-md text-xs font-medium px-2",
                p === page
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
