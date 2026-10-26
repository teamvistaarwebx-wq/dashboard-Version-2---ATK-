/**
 * Consistent JSON envelope for admin API routes.
 * Storefront reads `json.data`; errors carry `json.error`.
 */

export function ok(data, init = {}) {
  return Response.json({ data }, { status: 200, ...init });
}

export function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}

export function serverError(message = "Internal server error") {
  return Response.json({ error: message }, { status: 500 });
}
