"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleAlert, LogOut, Menu as MenuIcon, Search, Settings, X } from "lucide-react";
import { Menu } from "@/components/ui/menu";
import { GlobalSearch } from "./global-search";
import { ThemeSwitch } from "./theme-switch";
import { useSaveBarState } from "./save-bar";

/**
 * The 56px near-black bar: logo, search, store and account.
 *
 * While a form has unsaved changes it becomes the contextual save bar instead
 * — same height and colour, so the page underneath does not move.
 */
export function TopBar({ session, storeName, onOpenNav, signOutAction }) {
  const saveBar = useSaveBarState();
  const [searchOpen, setSearchOpen] = useState(false);

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
      <header data-topbar className="flex h-14 shrink-0 items-center gap-3 bg-topbar px-3 text-white sm:px-4">
        <div className="hidden w-56 shrink-0 lg:block">
          <Logo />
        </div>
        <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium" role="status">
          <CircleAlert className="size-4 shrink-0 text-gold" aria-hidden="true" />
          <span className="truncate">Unsaved changes</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={saveBar.discard}
            disabled={saveBar.saving}
            className="h-8 rounded-lg border border-white/20 px-3 text-13 font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={saveBar.save}
            disabled={saveBar.saving}
            className="h-8 rounded-lg bg-white px-3 text-13 font-medium text-topbar transition hover:bg-white/90 disabled:opacity-60"
          >
            {saveBar.saving ? "Saving…" : saveBar.saveLabel}
          </button>
        </div>
      </header>
    );
  }

  return (
    <header data-topbar className="flex h-14 shrink-0 items-center gap-2 bg-topbar px-2 text-white sm:gap-3 sm:px-4">
      {searchOpen ? (
        <div className="flex flex-1 items-center gap-2 md:hidden">
          <GlobalSearch autoFocus onClose={() => setSearchOpen(false)} />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="rounded-lg p-2 text-white/80 hover:bg-white/10"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className={`flex min-w-0 flex-1 items-center gap-1 md:flex-none lg:w-56 ${searchOpen ? "hidden md:flex" : ""}`}>
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-white/85 transition hover:bg-white/10 lg:hidden"
        >
          <MenuIcon className="size-5" aria-hidden="true" />
        </button>
        <Logo />
      </div>

      <div className="hidden flex-1 justify-center md:flex">
        <GlobalSearch className="max-w-lg" />
      </div>

      <div className={`flex shrink-0 items-center gap-1 sm:gap-2 ${searchOpen ? "hidden md:flex" : ""}`}>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="rounded-lg p-2 text-white/85 transition hover:bg-white/10 md:hidden"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>

        <ThemeSwitch />

        <Menu
          label="Account"
          buttonClassName="flex items-center gap-2 rounded-lg py-1 pl-2 pr-1 text-13 text-white/90 transition hover:bg-white/10"
          buttonContent={
            <>
              <span className="hidden max-w-40 truncate sm:block">{storeName}</span>
              <Avatar name={session.name || session.email} />
            </>
          }
          header={
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{session.name || session.email}</p>
              <p className="truncate text-xs text-muted">{session.email}</p>
              <p className="mt-1 text-xs capitalize text-muted">{session.role.replace(/_/g, " ")}</p>
            </div>
          }
          items={[
            { separator: true },
            { label: "Settings", href: "/settings", icon: <Settings aria-hidden="true" /> },
            signOutAction
              ? { label: "Sign out", action: signOutAction, icon: <LogOut aria-hidden="true" /> }
              : { label: "Sign out", disabled: true, hint: "Mock mode", icon: <LogOut aria-hidden="true" /> },
          ]}
        />
      </div>
    </header>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center rounded-md px-1 py-1" aria-label="Atulya Karigari admin home">
      <Image src="/images/logo/logo.svg" alt="" width={124} height={28} priority unoptimized className="h-7 w-auto" />
    </Link>
  );
}

function Avatar({ name }) {
  const initials = String(name)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <span
      aria-hidden="true"
      className="flex size-7 items-center justify-center rounded-lg bg-gold text-xs font-semibold text-gold-foreground"
    >
      {initials}
    </span>
  );
}
