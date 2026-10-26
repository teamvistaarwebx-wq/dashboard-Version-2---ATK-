import { STOCK_FILTER } from "@/constants/catalog-query";

/**
 * Carries the active filters into whatever comes next — the following page, or
 * an open drawer — so paging or editing out of a search does not silently drop
 * it. Defaults are left out of the URL entirely.
 *
 * Lifted out of the page because the pager now renders inside a Suspense
 * boundary while the "+ Add Product" link renders outside it, and both build
 * the same URLs. One copy, one behaviour.
 *
 * `basePath` is which list — /products or /made-to-order. The two screens are
 * the same table over different halves of the catalogue.
 */
export function buildProductsHref({
  q,
  subcategory,
  stock,
  page,
  drawer,
  basePath = "/products",
}) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (subcategory) params.set("subcategory", subcategory);
  if (stock && stock !== STOCK_FILTER.ALL) params.set("stock", stock);
  if (page > 1) params.set("page", String(page));

  for (const [key, value] of Object.entries(drawer ?? {})) {
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** The drawer params, and the only two of them. */
const DRAWER_PARAMS = ["new", "edit"];

/**
 * The list URL behind an open drawer — the current one minus whichever param
 * opened it, with every filter left exactly as it was. Someone editing the
 * third Saree closes back into the Sarees.
 *
 * The mirror of buildProductsHref()'s `drawer` argument, and it lives beside it
 * for that reason. It takes the live pathname and params rather than the
 * filters because its callers are client components that already hold those
 * and do not receive the filters as props.
 */
export function buildListHref(pathname, searchParams) {
  const params = new URLSearchParams(searchParams);
  for (const key of DRAWER_PARAMS) params.delete(key);

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
