import { connectDb } from "@/db/connect";
import { Category } from "@/models/category.model";
import { Product } from "@/models/product.model";
import { Subcategory } from "@/models/subcategory.model";
import {
  FULFILLMENT,
  IN_STOCK_FILTER,
  PRODUCT_STATUS,
} from "@/constants/enums";
import {
  SORT_SPECS,
  normalizeLimit,
  normalizePage,
  normalizeSort,
} from "@/constants/catalog-query";
import {
  CARD_FIELDS,
  getAvailability,
  getCategorySlugs,
  toCard,
} from "@/features/catalog/lib/product-card";

const EMPTY_RESULT = { items: [], total: 0 };

/**
 * Storefront product listing.
 *
 * Always scoped to published, non-deleted products. Returns only the fields
 * a product card renders — description, cost price and admin metadata never
 * cross the API boundary.
 *
 * Also always scoped to ONE catalogue: in stock by default, made to order
 * only when asked for by name. Anything else falls back to in stock, so no
 * caller can get the two mixed in one list.
 */
export async function getProducts({
  category: categorySlug = "",
  subcategory: subcategorySlug = "",
  q = "",
  sort,
  page,
  limit,
  minPrice,
  maxPrice,
  fulfillment = "",
} = {}) {
  await connectDb();

  const sortKey = normalizeSort(sort);
  const currentPage = normalizePage(page);
  const pageSize = normalizeLimit(limit);

  const filter = {
    status: PRODUCT_STATUS.ACTIVE,
    isDeleted: false,
    ...(fulfillment === FULFILLMENT.MADE_TO_ORDER
      ? { fulfillment: FULFILLMENT.MADE_TO_ORDER }
      : IN_STOCK_FILTER),
  };

  // Independent lookups — resolve slugs together, then reconcile in memory.
  const [category, subcategoryMatches] = await Promise.all([
    categorySlug
      ? Category.findOne({ slug: categorySlug, isActive: true })
          .select("_id")
          .lean()
      : null,
    subcategorySlug
      ? Subcategory.find({ slug: subcategorySlug, isActive: true })
          .select("_id category")
          .lean()
      : [],
  ]);

  if (categorySlug) {
    if (!category) return emptyPage(currentPage, pageSize);
    filter.category = category._id;
  }

  if (subcategorySlug) {
    // Subcategory slugs are unique per category ("other-collection" exists
    // under both Women and Men), so narrow by category when we have one.
    const scoped = category
      ? subcategoryMatches.filter(
          (sub) => String(sub.category) === String(category._id)
        )
      : subcategoryMatches;

    if (scoped.length === 0) return emptyPage(currentPage, pageSize);
    filter.subcategory =
      scoped.length === 1 ? scoped[0]._id : { $in: scoped.map((s) => s._id) };
  }

  // Price bounds arrive as integer paise, matching how price is stored.
  const min = toPaise(minPrice);
  const max = toPaise(maxPrice);
  if (min !== null || max !== null) {
    filter.price = {};
    if (min !== null) filter.price.$gte = min;
    if (max !== null) filter.price.$lte = max;
  }

  const query = q.trim();
  if (query) {
    // Uses the product_text_search index. $text matches whole words only —
    // partial-prefix search would need an Atlas Search index instead.
    filter.$text = { $search: query };
  }

  const [docs, total] = await Promise.all([
    Product.find(filter)
      .select(CARD_FIELDS)
      .sort(SORT_SPECS[sortKey])
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Product.countDocuments(filter),
  ]);

  if (docs.length === 0) {
    return { ...EMPTY_RESULT, page: currentPage, limit: pageSize, totalPages: 0 };
  }

  // Independent reads — the SKU sum and the category lookup never wait on
  // each other.
  const [availability, categorySlugs] = await Promise.all([
    getAvailability(docs),
    getCategorySlugs(docs),
  ]);

  return {
    items: docs.map((doc) => toCard(doc, availability, categorySlugs)),
    page: currentPage,
    limit: pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

function emptyPage(page, limit) {
  return { ...EMPTY_RESULT, page, limit, totalPages: 0 };
}

function toPaise(value) {
  if (value == null || value === "") return null;
  const paise = Number.parseInt(value, 10);
  return Number.isFinite(paise) && paise >= 0 ? paise : null;
}
