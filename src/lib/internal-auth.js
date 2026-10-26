import crypto from "crypto";

/**
 * Guards admin routes the storefront calls server-to-server.
 *
 * Same bearer-secret shape as the storefront's revalidate webhook. This is
 * not user auth — it only proves the caller is our own storefront, never who
 * the shopper is. Identity still comes from the OTP token or a session.
 */
export function isInternalRequest(request) {
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    console.error("INTERNAL_API_SECRET is not set — refusing internal call");
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  return timingSafeEqual(provided, secret);
}

/** Constant-time compare so the secret can't be recovered by timing. */
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;

  return crypto.timingSafeEqual(bufA, bufB);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
