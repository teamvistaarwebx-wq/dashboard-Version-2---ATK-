"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Package, Search, ShoppingBag, X } from "lucide-react";
import { ProductThumb } from "@/features/catalog/components/product-thumb";
import { useMockStoreOptional } from "@/mocks/store";
import { searchMock } from "@/mocks/search";

/**
 * Search in the header: products, orders and inquiries in one dropdown.
 *
 * In mock mode results come straight from the mock store. Against the real
 * database there is no cross-collection search endpoint yet, so the dropdown
 * offers "Search orders for …" style shortcuts into each list's own `?q=`.
 *
 * ARIA combobox: focus stays in the input, ↑/↓ move the highlight, Enter
 * opens it, Escape closes. "/" or ⌘K / Ctrl+K focuses the field from anywhere.
 */
const GROUP_ICONS = {
  Orders: <ShoppingBag aria-hidden="true" />,
  Inquiries: <MessageSquare aria-hidden="true" />,
  Products: <Package aria-hidden="true" />,
};

export function GlobalSearch({ onClose, autoFocus = false, className = "" }) {
  const store = useMockStoreOptional();
  const router = useRouter();
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const listId = useId();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    if (store) return searchMock(store, q);

    const encoded = encodeURIComponent(q);
    return ["Orders", "Products", "Inquiries"].map((group) => ({
      group,
      id: `shortcut-${group}`,
      href: `/${group.toLowerCase()}?q=${encoded}`,
      title: `Search ${group.toLowerCase()} for “${q}”`,
    }));
  }, [query, store]);

  useEffect(() => {
    function onKeyDown(event) {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function go(result) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    onClose?.();
    router.push(result.href);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      go(results[active]);
    } else if (event.key === "Escape") {
      if (query) {
        setQuery("");
      } else {
        inputRef.current?.blur();
        onClose?.();
      }
      setOpen(false);
    }
  }

  const showList = open && query.trim().length >= 2;
  const activeId = showList && results[active] ? `${listId}-${active}` : undefined;

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search products, orders and inquiries"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        autoFocus={autoFocus}
        value={query}
        placeholder="Search orders, products, inquiries…"
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="h-9 w-full rounded-[10px] border border-border bg-surface pl-9 pr-14 text-13 text-foreground shadow-card outline-none transition placeholder:text-subtle hover:border-border-strong focus:border-brand focus-visible:outline-none focus:ring-[3px] focus:ring-brand/12 [&::-webkit-search-cancel-button]:hidden"
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-surface-muted px-1.5 font-mono text-[11px] text-muted sm:block">
          ⌘K
        </kbd>
      )}

      <div
        id={listId}
        role="listbox"
        aria-label="Search results"
        hidden={!showList}
        className="absolute right-0 top-full z-40 mt-2 max-h-[min(28rem,70dvh)] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 text-foreground shadow-popover md:w-[26rem]"
      >
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">No results for “{query.trim()}”</p>
        ) : (
          results.map((result, index) => {
            const first = index === 0 || results[index - 1].group !== result.group;
            return (
              <div key={result.id}>
                {first && store ? (
                  <p className="px-2.5 pb-1 pt-2 text-xs font-medium text-muted">{result.group}</p>
                ) : null}
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => go(result)}
                  onPointerMove={() => setActive(index)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 ${
                    index === active ? "bg-neutral-bg" : ""
                  }`}
                >
                  {result.product ? (
                    <ProductThumb product={result.product} size="xs" />
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted [&_svg]:size-4">
                      {GROUP_ICONS[result.group]}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className={`block truncate text-sm ${result.mono ? "font-mono" : ""}`}>{result.title}</span>
                    {result.meta ? <span className="block truncate text-xs text-muted">{result.meta}</span> : null}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
