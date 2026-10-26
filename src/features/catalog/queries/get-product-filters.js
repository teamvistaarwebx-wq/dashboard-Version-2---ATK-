import { cache } from "react";
import { unstable_cache } from "next/cache";
import { connectDb } from "@/db/connect";
import { Subcategory } from "@/models/subcategory.model";
import { CACHE_TAG } from "@/constants/cache-tags";

/**
 * The category chips above the products table.
 *
 * Read from Subcategory, not Category: "Women" and "Men" are two chips that
 * narrow nothing anybody cares about, whereas Saree / Dupatta / Jewellery is
 * how staff actually think about the catalogue. Same call the dashboard's
 * stock panel makes.
 */
async function readProductFilters() {
  await connectDb();

  // Category first, then order: `order` restarts at 1 per category, so
  // sorting on it alone interleaves the two — Saree, Tie, Dupatta, Other
  // Collection. Category ids are time-ordered, which is also seed order, so
  // the Women chips come out ahead of the Men ones.
  const rows = await Subcategory.find({ isActive: true })
    .sort({ category: 1, order: 1 })
    .select("name slug")
    .lean();

  // Women and Men both carry "Other Collection" under the same slug, and the
  // list filters by slug — so one chip covers both, which is exactly what it
  // will match. Insertion order is the sorted order, so no second pass.
  const bySlug = new Map();
  for (const row of rows) {
    if (!bySlug.has(row.slug)) {
      bySlug.set(row.slug, { slug: row.slug, name: row.name });
    }
  }

  return [...bySlug.values()];
}

/**
 * Two layers, doing different jobs.
 *
 * `unstable_cache` keeps the result between requests: this is seven documents
 * that no admin screen can even edit, and it was being fetched again on every
 * navigation to Products. The hour is a backstop rather than the mechanism —
 * the tag is what actually invalidates it, if the seed is ever re-run.
 *
 * `cache` on the outside still earns its place, deduping the calls made inside
 * a single render.
 *
 * Returns plain strings, which matters: anything handed back from here is
 * serialised into the cache, and a Mongoose document or a raw ObjectId would
 * not survive the trip.
 */
export const getProductFilters = cache(
  unstable_cache(readProductFilters, ["product-filters"], {
    tags: [CACHE_TAG.CATALOG_TAXONOMY],
    revalidate: 3600,
  })
);
