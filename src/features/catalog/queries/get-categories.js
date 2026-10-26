import { connectDb } from "@/db/connect";
import { Category } from "@/models/category.model";
import { Subcategory } from "@/models/subcategory.model";

/**
 * Active categories, optionally with their active subcategories nested.
 * Drives the storefront's Women/Men tabs and subcategory filter chips.
 */
export async function getCategories({ includeSubcategories = false } = {}) {
  await connectDb();

  if (!includeSubcategories) {
    const categories = await Category.find({ isActive: true })
      .select("name slug image order")
      .sort({ order: 1, name: 1 })
      .lean();

    return categories.map(toCategory);
  }

  // Independent reads — run them together rather than sequentially.
  const [categories, subcategories] = await Promise.all([
    Category.find({ isActive: true })
      .select("name slug image order")
      .sort({ order: 1, name: 1 })
      .lean(),
    Subcategory.find({ isActive: true })
      .select("name slug image order category")
      .sort({ order: 1, name: 1 })
      .lean(),
  ]);

  // Group by parent id once instead of filtering the array per category.
  const byCategory = new Map();
  for (const sub of subcategories) {
    const key = String(sub.category);
    const bucket = byCategory.get(key);
    if (bucket) {
      bucket.push(toSubcategory(sub));
    } else {
      byCategory.set(key, [toSubcategory(sub)]);
    }
  }

  return categories.map((category) => ({
    ...toCategory(category),
    subcategories: byCategory.get(String(category._id)) ?? [],
  }));
}

function toCategory(category) {
  return {
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    image: category.image || "",
  };
}

function toSubcategory(subcategory) {
  return {
    id: String(subcategory._id),
    name: subcategory.name,
    slug: subcategory.slug,
    image: subcategory.image || "",
  };
}
