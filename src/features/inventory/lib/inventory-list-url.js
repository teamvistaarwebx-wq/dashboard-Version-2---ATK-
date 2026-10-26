import { STOCK_VIEW } from "@/constants/inventory";

/**
 * Carries the active filters into whatever comes next — the following page, or
 * the adjust drawer.
 *
 * Lifted out of the page for the same reason as the catalogue's version: the
 * pager now renders inside a Suspense boundary while other links to the same
 * URLs render outside it.
 */
export function buildInventoryHref({ q, view, page, adjust }) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (view !== STOCK_VIEW.ALL) params.set("view", view);
  if (page > 1) params.set("page", String(page));
  if (adjust) params.set("adjust", adjust);

  const query = params.toString();
  return query ? `/inventory?${query}` : "/inventory";
}
