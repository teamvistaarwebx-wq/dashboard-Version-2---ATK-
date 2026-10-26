"use client";

import { useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatNumber } from "@/lib/format";

/**
 * Pieces for the index tables (Orders, Products, Inventory, Inquiries…).
 * Tables scroll sideways inside their card on narrow screens; the page never
 * does.
 */

export const TABLE = "w-full text-left text-13";
export const THEAD = "border-b border-border bg-surface-muted/70 text-[11px] uppercase tracking-wider text-muted";
export const TH = "whitespace-nowrap px-3 py-2.5 font-medium first:pl-4 last:pr-4";
export const TD = "px-3 py-3 align-middle first:pl-4 last:pr-4";
export const TBODY = "divide-y divide-border";
export const ROW_LINK = "cursor-pointer transition-colors hover:bg-surface-muted";

export function TableScroll({ minWidth = "48rem", children }) {
  return (
    <div className="relative overflow-x-auto">
      <table className={TABLE} style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function EmptyTable({ title = "Nothing here", children }) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="text-sm font-medium">{title}</p>
      {children ? <p className="mt-1 text-13 text-muted">{children}</p> : null}
    </div>
  );
}

/**
 * Search box that updates its owner after a short pause, so typing "AKT-2026"
 * filters once, not eight times. `defaultValue` seeds it from the URL.
 */
export function SearchInput({ label, placeholder, defaultValue = "", onSearch, className = "" }) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const timer = useRef(null);

  function update(next) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(next.trim()), 250);
  }

  return (
    <div className={`relative min-w-0 ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => update(event.target.value)}
        className="h-9 w-full rounded-[10px] border border-border bg-surface pl-9 pr-3 text-13 text-foreground shadow-card outline-none transition placeholder:text-subtle hover:border-border-strong focus-visible:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/12"
      />
    </div>
  );
}

/** "1–25 of 362" with previous / next. */
export function ClientPagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-13 text-muted">
      <span className="tabular-nums">
        {formatNumber(start)}–{formatNumber(end)} of {formatNumber(total)}
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-border bg-surface p-1.5 text-foreground shadow-card transition hover:border-border-strong hover:bg-surface-muted disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-border bg-surface p-1.5 text-foreground shadow-card transition hover:border-border-strong hover:bg-surface-muted disabled:opacity-40"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </span>
    </nav>
  );
}

/** Reads a positive page number from a URL param. */
export function pageParam(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
