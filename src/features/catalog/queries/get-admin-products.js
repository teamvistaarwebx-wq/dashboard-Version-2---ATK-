import { connectDb } from "@/db/connect";
import { Product } from "@/models/product.model";
import {
  PAGE_SIZE,
  STOCK_FILTER,
  normalizePage,
  normalizeStockFilter,
} from "@/constants/catalog-query";
import {
  pickFeaturedImage,
  resolvePrice,
} from "@/features/catalog/lib/product-card";
import { resolveImageUrl } from "@/lib/storefront";
import { FULFILLMENT, IN_STOCK_FILTER } from "@/constants/enums";

/**
 * The admin catalogue table.
 *
 * Deliberately NOT getProducts(): that one is the storefront contract and is
 * hard-scoped to published products. Back office needs the drafts and the
 * archived rows too — everything except what has been deleted.
 *
 * One aggregation rather than find() + a second read, because two of the
 * things this screen filters and sorts on do not live on Product: the
 * subcategory name comes from another collection, and "in stock" is a sum
 * over Inventory. Paginating first and joining after would count the wrong
 * total the moment either filter is on.
 */

/** Hoisted — escaping a search term must not rebuild this per call. */
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/** Clamped per row, matching getAvailability(): a negative never nets off. */
const AVAILABLE_PER_ROW = {
  $max: [
    0,
    {
      $subtract: [
        { $ifNull: ["$$row.onHand", 0] },
        { $ifNull: ["$$row.reserved", 0] },
      ],
    },
  ],
};

/**
 * Mirrors isAvailable() in features/catalog/lib/product-card.js — an untracked
 * or backorderable product is always sellable, because there is no count for
 * it to run out of.
 */
const IN_STOCK_EXPRESSION = {
  $cond: {
    if: {
      $or: [
        { $eq: ["$trackInventory", false] },
        { $eq: ["$allowBackorder", true] },
      ],
    },
    then: true,
    else: {
      $gt: [
        {
          $sum: {
            $map: { input: "$stock", as: "row", in: AVAILABLE_PER_ROW },
          },
        },
        0,
      ],
    },
  },
};

const JOIN_STAGES = [
  {
    $lookup: {
      from: "subcategories",
      localField: "subcategory",
      foreignField: "_id",
      as: "sub",
      pipeline: [{ $project: { _id: 0, name: 1, slug: 1 } }],
    },
  },
  {
    $lookup: {
      from: "inventories",
      localField: "_id",
      foreignField: "productId",
      as: "stock",
      pipeline: [{ $project: { _id: 0, onHand: 1, reserved: 1 } }],
    },
  },
  {
    $set: {
      subcategoryName: { $first: "$sub.name" },
      subcategorySlug: { $first: "$sub.slug" },
      inStock: IN_STOCK_EXPRESSION,
    },
  },
];

/** Newest first — the row someone just added is the one they came to check. */
const LIST_SORT = { createdAt: -1, _id: -1 };

/** Only what a table row renders. The description never leaves the DB. */
const LIST_PROJECTION = {
  title: 1,
  type: 1,
  status: 1,
  price: 1,
  hasVariants: 1,
  "variants.price": 1,
  "variants.active": 1,
  "images.url": 1,
  "images.alt": 1,
  "images.isFeatured": 1,
  subcategoryName: 1,
  inStock: 1,
  occasion: { $first: "$suggestedOccasions" },
};

export async function getAdminProducts({
  q = "",
  subcategory = "",
  stock = "",
  page,
  fulfillment = FULFILLMENT.IN_STOCK,
} = {}) {
  await connectDb();

  const currentPage = normalizePage(page);
  const madeToOrder = fulfillment === FULFILLMENT.MADE_TO_ORDER;
  // Made to order has no stock, so there is nothing for the toggle to filter.
  const stockFilter = madeToOrder ? STOCK_FILTER.ALL : normalizeStockFilter(stock);

  // Products and Made to Order are two separate lists — never one with a
  // filter on it — so a product only ever turns up on the screen it belongs to.
  const match = {
    isDeleted: false,
    ...(madeToOrder ? { fulfillment: FULFILLMENT.MADE_TO_ORDER } : IN_STOCK_FILTER),
  };

  const term = String(q).trim();
  if (term) {
    /**
     * A case-insensitive substring, not the $text index the storefront
     * listing uses: $text matches whole words only, and someone typing "bana"
     * into an admin search expects the Banarasi rows back. This screen is
     * internal and the catalogue is small, so the unindexed scan is fine —
     * revisit if the catalogue reaches thousands of rows.
     */
    const search = new RegExp(term.replace(REGEX_SPECIALS, "\\$&"), "i");
    match.$or = [
      { title: search },
      { sku: search },
      { type: search },
      { tags: search },
    ];
  }

  // Both of these read fields that only exist after the join above.
  const postJoinMatch = {};
  if (subcategory) postJoinMatch.subcategorySlug = subcategory;
  if (stockFilter === STOCK_FILTER.IN) postJoinMatch.inStock = true;
  if (stockFilter === STOCK_FILTER.OUT) postJoinMatch.inStock = false;

  const [result] = await Product.aggregate([
    { $match: match },
    ...JOIN_STAGES,
    ...(Object.keys(postJoinMatch).length > 0 ? [{ $match: postJoinMatch }] : []),
    { $sort: LIST_SORT },
    {
      $facet: {
        // $project sits inside the facet, after the page has been cut, so the
        // shaping runs over 20 rows rather than the whole matched set.
        rows: [
          { $skip: (currentPage - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE },
          { $project: LIST_PROJECTION },
        ],
        // Counted in the same pass. A separate countDocuments() could not see
        // `inStock`, which does not exist until the join has run.
        count: [{ $count: "value" }],
      },
    },
  ]);

  const total = result?.count?.[0]?.value ?? 0;

  return {
    items: (result?.rows ?? []).map(toRow),
    page: currentPage,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

function toRow(doc) {
  const { price, priceVaries } = resolvePrice(doc);
  const image = pickFeaturedImage(doc.images);

  return {
    id: String(doc._id),
    title: doc.title,
    // "Banarasi Silk · Wedding" — what it is, then when it gets given.
    subtitle: [doc.type, doc.occasion].filter(Boolean).join(" · "),
    category: doc.subcategoryName ?? "",
    price,
    priceVaries,
    status: doc.status,
    inStock: doc.inStock === true,
    // Product images are served from the storefront's public/ — see
    // lib/storefront.js for why a raw path would 404 in here.
    imageUrl: resolveImageUrl(image?.url),
  };
}
