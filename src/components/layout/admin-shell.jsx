"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { ToastProvider } from "@/components/ui/toast";
import { AdminNav } from "./admin-nav";
import { TopBar } from "./top-bar";

/**
 * Frame for every signed-in screen: the sidebar sits on the canvas, and the
 * page floats beside it in a rounded panel with its own header and its own
 * scroll. Below 1024px the panel goes edge to edge and the sidebar moves into
 * an off-canvas drawer opened from the header.
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

      <div className="flex h-dvh bg-canvas">
        <aside className="hidden w-64 shrink-0 lg:block">
          <AdminNav session={session} storeName={storeName} signOutAction={signOutAction} />
        </aside>

        {navOpen ? (
          <Drawer side="left" title="Navigation" hideHeader onClose={() => setNavOpen(false)} className="lg:hidden">
            <AdminNav
              session={session}
              storeName={storeName}
              signOutAction={signOutAction}
              onNavigate={() => setNavOpen(false)}
              onClose={() => setNavOpen(false)}
            />
          </Drawer>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background lg:rounded-2xl lg:shadow-panel">
            <TopBar onOpenNav={() => setNavOpen(true)} />

            <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto focus:outline-none">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
