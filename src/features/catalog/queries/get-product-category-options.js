import { cache } from "react";
import { unstable_cache } from "next/cache";
import { connectDb } from "@/db/connect";
import { Category } from "@/models/category.model";
import { Subcategory } from "@/models/subcategory.model";
import { CACHE_TAG } from "@/constants/cache-tags";

/**
 * The grouped options behind the product drawer's Category select.
 *
 * Category is NOT its own field in the form: every subcategory belongs to
 * exactly one category, so asking for both would let the two disagree. The
 * select is grouped by category and posts a subcategory id; the action derives
 * the category from it.
 *
 * The ids are the reason this is a database read at all. The names could be
 * hardcoded as easily as the type and colour menus now are — nothing in the
 * admin edits them, they arrive by seed script — but a product stores its
 * subcategory as an ObjectId, and those are assigned by Mongo at seed time.
 * Freezing them into the codebase would mean a re-seed silently saving products
 * against ids that no longer exist.
 *
 * Two small indexed finds, and nothing else. This used to carry an aggregation
 * over the whole catalogue as well, rebuilding the type and colour suggestions
 * on every open; those live in constants/product-vocabulary.js now.
 */
async function readProductCategoryOptions() {
  await connectDb();

  // Independent reads — two round trips become one wait.
  const [categories, subcategories] = await Promise.all([
    Category.find({ isActive: true }).sort({ order: 1 }).select("name").lean(),

    Subcategory.find({ isActive: true })
      .sort({ order: 1 })
      .select("name category")
      .lean(),
  ]);

  // Grouped in one pass off a Map, rather than filtering the subcategory list
  // once per category. Insertion order is the sorted order, so the optgroups
  // come out in nav order without a second sort.
  const groups = new Map(
    categories.map((category) => [
      String(category._id),
      { id: String(category._id), name: category.name, subcategories: [] },
    ])
  );

  for (const sub of subcategories) {
    groups.get(String(sub.category))?.subcategories.push({
      id: String(sub._id),
      name: sub.name,
    });
  }

  // A category with no subcategories is an empty <optgroup> — nothing to pick.
  return [...groups.values()].filter(
    (group) => group.subcategories.length > 0
  );
}

/**
 * Cached for an hour, and invalidated only by the taxonomy tag — which nothing
 * in the admin fires, because nothing in the admin edits categories. The hour
 * is effectively the whole mechanism; the tag is there for the day a re-seed
 * changes them.
 *
 * `cache` on the outside still earns its place, deduping within one render.
 *
 * The ids are already strings by the time they are returned — necessary, since
 * an ObjectId would not survive being serialised into the cache.
 */
export const getProductCategoryOptions = cache(
  unstable_cache(readProductCategoryOptions, ["product-category-options"], {
    tags: [CACHE_TAG.CATALOG_TAXONOMY],
    revalidate: 3600,
  })
);
