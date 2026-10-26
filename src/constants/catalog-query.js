/** Shared listing contract between admin API and storefront. */

export const PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 60;

export const SORT = {
  FEATURED: "featured",
  PRICE_ASC: "price-asc",
  PRICE_DESC: "price-desc",
  NEWEST: "newest",
};

export const SORT_VALUES = Object.values(SORT);

/**
 * Mongo sort specs per sort key.
 *
 * NOTE: price sorts read Product.price, which is undefined for variant
 * products (cleared by the pre-validate hook). Once variant products exist,
 * these need an aggregation stage computing min(variants[].price).
 */
export const SORT_SPECS = {
  [SORT.FEATURED]: { salesCount: -1, createdAt: -1 },
  [SORT.PRICE_ASC]: { price: 1, _id: 1 },
  [SORT.PRICE_DESC]: { price: -1, _id: 1 },
  [SORT.NEWEST]: { publishedAt: -1, _id: 1 },
};

export function normalizeSort(value) {
  return SORT_VALUES.includes(value) ? value : SORT.FEATURED;
}

export function normalizePage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function normalizeLimit(value) {
  const limit = Number.parseInt(value, 10);
  if (!Number.isFinite(limit) || limit <= 0) return PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}

/**
 * Admin-only listing filter.
 *
 * Not a Product field: availability is `onHand - reserved` summed across the
 * Inventory rows for a product, so this is applied after the join rather than
 * in the first $match. See features/catalog/queries/get-admin-products.js.
 */
export const STOCK_FILTER = {
  ALL: "all",
  IN: "in",
  OUT: "out",
};

export const STOCK_FILTER_VALUES = Object.values(STOCK_FILTER);

export function normalizeStockFilter(value) {
  return STOCK_FILTER_VALUES.includes(value) ? value : STOCK_FILTER.ALL;
}
