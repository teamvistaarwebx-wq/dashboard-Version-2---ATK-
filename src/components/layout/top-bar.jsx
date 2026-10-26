"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, CircleAlert, Menu as MenuIcon, Search, X } from "lucide-react";
import { GlobalSearch } from "./global-search";
import { NAV_GROUPS, SETTINGS_ITEM, isActive } from "./admin-nav";
import { ThemeSwitch } from "./theme-switch";
import { useSaveBarState } from "./save-bar";

/**
 * The 56px header across the top of the page panel: where you are on the
 * left, search and theme on the right.
 *
 * While a form has unsaved changes it becomes the contextual save bar instead
 * — same height, so the page underneath does not move.
 */
const SECTIONS = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM];

const SEGMENT_LABELS = { new: "New", edit: "Edit", movements: "Movements" };

/** "Orders / Details" from /orders/AKT-2026-131405, "Banners / Edit" from /banners/x/edit. */
function useCrumbs() {
  const pathname = usePathname();
  const section = SECTIONS.find((item) => isActive(item.href, pathname)) ?? SECTIONS[0];
  if (section.href === "/") return { section, trail: [] };

  const rest = pathname.slice(section.href.length).split("/").filter(Boolean);
  const trail = [];
  for (const segment of rest) {
    const label = SEGMENT_LABELS[segment] ?? "Details";
    // "/products/abc/edit" reads "Products / Edit", not "Details / Edit".
    if (label !== "Details" && trail.at(-1) === "Details") trail.pop();
    trail.push(label);
  }
  return { section, trail };
}

export function TopBar({ onOpenNav }) {
  const saveBar = useSaveBarState();
  const [searchOpen, setSearchOpen] = useState(false);
  const { section, trail } = useCrumbs();
  const SectionIcon = section.icon;

  // Leaving the page with unsaved edits asks first.
  useEffect(() => {
    if (!saveBar) return undefined;
    function onBeforeUnload(event) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveBar]);

  if (saveBar) {
    return (
      <header data-topbar className="flex h-14 shrink-0 items-center gap-3 bg-brand px-3 text-white sm:px-6">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium" role="status">
          <CircleAlert className="size-4 shrink-0 text-gold" aria-hidden="true" />
          <span className="truncate">Unsaved changes</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={saveBar.discard}
            disabled={saveBar.saving}
            className="h-8 rounded-[10px] border border-white/25 px-3 text-13 font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={saveBar.save}
            disabled={saveBar.saving}
            className="h-8 rounded-[10px] bg-white px-3.5 text-13 font-semibold text-brand transition hover:bg-white/90 disabled:opacity-60"
          >
            {saveBar.saving ? "Saving…" : saveBar.saveLabel}
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-2 sm:gap-3 sm:px-6">
      {searchOpen ? (
        <div className="flex flex-1 items-center gap-2 md:hidden">
          <GlobalSearch autoFocus onClose={() => setSearchOpen(false)} />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="rounded-lg p-2 text-muted hover:bg-neutral-bg hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className={`flex min-w-0 flex-1 items-center gap-1.5 ${searchOpen ? "hidden md:flex" : ""}`}>
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-muted transition hover:bg-neutral-bg hover:text-foreground lg:hidden"
        >
          <MenuIcon className="size-5" aria-hidden="true" />
        </button>

        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1.5 text-13">
            <li className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="hidden size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-brand-text shadow-card sm:flex"
              >
                <SectionIcon className="size-4" strokeWidth={2} />
              </span>
              {trail.length ? (
                <Link href={section.href} className="truncate text-muted transition hover:text-foreground">
                  {section.label}
                </Link>
              ) : (
                <span aria-current="page" className="truncate font-medium text-foreground">
                  {section.label}
                </span>
              )}
            </li>
            {trail.map((label, index) => (
              <Fragment key={`${label}-${index}`}>
                <li aria-hidden="true">
                  <ChevronRight className="size-3.5 text-subtle" />
                </li>
                <li
                  aria-current={index === trail.length - 1 ? "page" : undefined}
                  className={`truncate ${index === trail.length - 1 ? "font-medium text-foreground" : "text-muted"}`}
                >
                  {label}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      </div>

      <div className={`flex shrink-0 items-center gap-1 sm:gap-2 ${searchOpen ? "hidden md:flex" : ""}`}>
        <div className="hidden w-72 md:block lg:w-80">
          <GlobalSearch />
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="rounded-lg p-2 text-muted transition hover:bg-neutral-bg hover:text-foreground md:hidden"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>

        <ThemeSwitch />
      </div>
    </header>
  );
}
