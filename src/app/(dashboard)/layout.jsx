import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { signOut } from "@/features/auth/actions/sign-out";
import { AdminShell } from "@/components/layout/admin-shell";
import { MOCK_AUTH_BYPASS, MOCK_MODE, MOCK_SESSION, STORE_NAME } from "@/lib/mock-mode";
import { MockStoreProvider } from "@/mocks/store";

/**
 * Every authenticated screen hangs off here. `requireAdmin()` runs before any
 * child does, and because `getSession()` is cache()-wrapped the pages
 * underneath can ask again for free.
 *
 * In mock mode the mock store wraps the shell. `now` is fixed here, on the
 * server, so the client generates exactly the same data and hydration matches.
 */
export default async function DashboardLayout({ children }) {
  const session = MOCK_AUTH_BYPASS ? MOCK_SESSION : await requireAdmin();

  const shell = (
    <AdminShell
      session={session}
      storeName={STORE_NAME}
      signOutAction={MOCK_AUTH_BYPASS ? null : signOut}
    >
      {children}
    </AdminShell>
  );

  if (!MOCK_MODE) return shell;

  // "Today" must be the request's today, never the build's.
  await connection();
  return <MockStoreProvider nowIso={new Date().toISOString()}>{shell}</MockStoreProvider>;
}
