"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { ToastProvider } from "@/components/ui/toast";
import { AdminNav } from "./admin-nav";
import { TopBar } from "./top-bar";

/**
 * Frame for every signed-in screen: top bar across, nav down the left, the
 * page scrolling on its own to the right. Below 1024px the nav moves into an
 * off-canvas drawer opened from the top bar.
 */
export function AdminShell({ session, storeName, signOutAction, children }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <ToastProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <div className="flex h-dvh flex-col">
        <TopBar
          session={session}
          storeName={storeName}
          signOutAction={signOutAction}
          onOpenNav={() => setNavOpen(true)}
        />

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-60 shrink-0 border-r border-border lg:block">
            <AdminNav />
          </aside>

          {navOpen ? (
            <Drawer side="left" title="Navigation" hideHeader onClose={() => setNavOpen(false)} className="lg:hidden">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
                <span className="text-sm font-semibold">{storeName}</span>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-lg p-1.5 text-muted transition hover:bg-neutral-bg hover:text-foreground"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <AdminNav onNavigate={() => setNavOpen(false)} />
              </div>
            </Drawer>
          ) : null}

          <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto focus:outline-none">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
