"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STOCK_FILTER } from "@/constants/catalog-query";

/**
 * Search, category chips and the stock toggle above the products table.
 *
 * Filter state lives in the URL rather than in here, so the table stays a
 * server component: every change is a navigation the server answers with a
 * new list. That also makes a filtered view something staff can bookmark and
 * send to each other.
 *
 * The table arrives as `children` — a server component passed through — which
 * is what lets one `useTransition` dim the results it is filtering while the
 * next page streams in. Splitting them would leave the table with no idea a
 * filter had changed.
 */

/** One navigation per pause in typing, not one per keystroke. */
const SEARCH_DEBOUNCE_MS = 300;

const STOCK_CHIPS = [
  { value: STOCK_FILTER.ALL, label: "All stock" },
  { value: STOCK_FILTER.IN, label: "In stock" },
  { value: STOCK_FILTER.OUT, label: "Sold out" },
];

const CHIP = "rounded-full border px-4 py-2 font-nunito text-sm transition";
const CHIP_ON = "border-brand bg-brand-tint font-semibold text-brand";
const CHIP_OFF =
  "border-border bg-surface text-foreground hover:border-brand/40 hover:bg-brand-soft";

export function ProductFilters({
  q,
  subcategory,
  stock,
  subcategories,
  searchIcon,
  showStock = true,
  children,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [term, setTerm] = useState(q);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef(null);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function apply(updates) {
    const params = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    // A narrower filter can leave the current page past the end of the list.
    params.delete("page");

    const query = params.toString();

    // replace, not push: twenty keystrokes must not become twenty entries in
    // the back button. The transition keeps the chips and the input live
    // while the server builds the new list.
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  /**
   * Chips navigate immediately, and cancel any search still waiting out its
   * debounce — carrying the typed term along, so a click mid-word applies
   * both rather than losing one to the other.
   */
  function applyNow(updates) {
    clearTimeout(debounceRef.current);
    apply({ q: term.trim(), ...updates });
  }

  function handleSearchChange(event) {
    const value = event.target.value;

    // Urgent: the input must never lag behind the keyboard.
    setTerm(value);

    // Debounced in the handler rather than an effect — the navigation belongs
    // to the keystroke, not to a render.
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => apply({ q: value.trim() }),
      SEARCH_DEBOUNCE_MS
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          >
            {searchIcon}
          </span>

          <input
            type="search"
            value={term}
            onChange={handleSearchChange}
            placeholder="Search products…"
            aria-label="Search products"
            className="w-72 max-w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 font-nunito text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand"
          />
        </div>

        {subcategories.map((sub) => {
          const active = sub.slug === subcategory;

          return (
            <button
              key={sub.slug}
              type="button"
              aria-pressed={active}
              // Clicking the lit chip clears it — the row doubles as its own
              // "all categories" control, so it needs no extra chip.
              onClick={() => applyNow({ subcategory: active ? "" : sub.slug })}
              className={`${CHIP} ${active ? CHIP_ON : CHIP_OFF}`}
            >
              {sub.name}
            </button>
          );
        })}

        {/* Made to order has no stock to filter by. */}
        {(showStock ? STOCK_CHIPS : []).map((chip) => {
          const active = chip.value === stock;

          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={active}
              // "All stock" is the default, so it drops the param instead of
              // spelling it out in the URL.
              onClick={() =>
                applyNow({
                  stock: chip.value === STOCK_FILTER.ALL ? "" : chip.value,
                })
              }
              className={`${CHIP} ${active ? CHIP_ON : CHIP_OFF}`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div
        aria-busy={isPending}
        className={`mt-6 transition-opacity duration-150 ${
          isPending ? "opacity-50" : "opacity-100"
        }`}
      >
        {children}
      </div>
    </>
  );
}
