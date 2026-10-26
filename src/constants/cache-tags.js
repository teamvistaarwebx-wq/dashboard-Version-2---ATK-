/**
 * Tags for the reads that are cached across requests, not just within one.
 *
 * `React.cache()` — which several queries already use — only dedupes calls
 * inside a single render. These tags cover the other case: data that barely
 * changes and was being re-read from Mongo on every single navigation, by
 * every admin, forever.
 *
 * Named after what the data *is*, so the actions that change it can invalidate
 * by meaning rather than by remembering which query functions happen to touch
 * which collection.
 */
export const CACHE_TAG = {
  /**
   * Categories and subcategories — the chip row above the catalogue and the
   * grouped select in the product form. There is no admin screen that edits
   * these at all; they arrive by seed script.
   */
  CATALOG_TAXONOMY: "catalog-taxonomy",
};
