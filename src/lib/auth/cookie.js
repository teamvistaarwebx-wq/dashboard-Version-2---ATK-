/**
 * Own module, no imports.
 *
 * `proxy.js` runs in the edge runtime and needs this name, but must not pull
 * in `session.js` — that would drag `next/headers` and `jose` into the edge
 * bundle for a string.
 */
export const ADMIN_SESSION_COOKIE = "akt_admin_session";
