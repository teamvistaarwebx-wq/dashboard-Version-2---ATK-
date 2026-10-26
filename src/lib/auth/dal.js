import { forbidden, redirect } from "next/navigation";
import { getSession } from "./session";

/**
 * The single enforcement point for admin identity.
 *
 * `proxy.js` only checks that a cookie exists — it cannot verify a signature
 * without pulling the secret into the edge bundle, and the Next docs warn
 * against treating it as an auth boundary. So every page, layout and server
 * action calls in here instead, close to the data it is about to touch.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");

  return session;
}

/**
 * Role gate for the actions only a super admin may run — inviting staff,
 * changing someone else's role, disabling an account.
 *
 * `forbidden()` rather than a redirect: the person is signed in, they just
 * cannot do this. Next renders `forbidden.jsx` with a 403.
 */
export async function requireRole(...roles) {
  const session = await requireAdmin();

  if (!roles.includes(session.role)) {
    forbidden();
  }

  return session;
}
