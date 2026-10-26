import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/cookie";
import { MOCK_AUTH_BYPASS } from "@/lib/mock-mode";

/**
 * Optimistic gate. Bounces requests with no session cookie straight to
 * /login so a signed-out visitor never pays for a render, but it does not
 * verify the token — that needs the signing secret, and this file is meant to
 * stay deployable to the edge with no shared module state.
 *
 * The real check is `requireAdmin()` in `lib/auth/dal.js`, which every page,
 * layout and server action calls. A forged cookie gets past this and stops
 * there.
 */
export function proxy(request) {
  // Mock prototype under `next dev` only — see lib/mock-mode.js.
  if (MOCK_AUTH_BYPASS) return NextResponse.next();
  if (request.cookies.has(ADMIN_SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";

  // Where they were headed, so sign-in can put them back.
  const from = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (from && from !== "/") url.searchParams.set("from", from);

  return NextResponse.redirect(url);
}

/**
 * Everything except the auth pages, the API (bearer-authenticated
 * server-to-server, so a redirect there would break the storefront) and
 * static assets. Without the negative match, this would block CSS and images.
 */
export const config = {
  matcher: [
    "/((?!api/|login|accept-invite|_next/static|_next/image|favicon.ico|images/|fonts/).*)",
  ],
};
