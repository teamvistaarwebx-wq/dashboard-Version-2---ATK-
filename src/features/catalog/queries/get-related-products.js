import mongoose from "mongoose";
import { connectDb } from "@/db/connect";
import { Product } from "@/models/product.model";
import {
  FULFILLMENT,
  IN_STOCK_FILTER,
  PRODUCT_STATUS,
} from "@/constants/enums";
import {
  CARD_FIELDS,
  getAvailability,
  getCategorySlugs,
  toCard,
} from "@/features/catalog/lib/product-card";

/**
 * "You may also like" — substitutes for the product being viewed.
 *
 * Three tiers, in order:
 *   1. Product.relatedProducts[] — admin curation always wins
 *   2. Attribute similarity, scored below
 *   3. Same-category backfill, so the row is never short
 *
 * Deliberately NOT collaborative filtering: there is no Order model yet, so
 * there is no co-purchase signal to learn from. The attribute data is fully
 * populated, which makes content-based the only approach that works today —
 * and it has no cold-start problem when new products are added.
 */

/**
 * Signal weights. Subcategory dominates because a saree's best substitute is
 * another saree; the softer signals then order within that set.
 */
const WEIGHTS = {
  subcategory: 40,
  type: 15,
  tag: 8,
  occasion: 6,
  recipient: 4,
  priceBand: 10,
};

/** A substitute should sit in a comparable price bracket. */
const PRICE_BAND = 0.3;

/** Candidates scored per request. Two-stage: cheap query, then rank. */
const CANDIDATE_POOL = 200;

/** Fields needed to score — a superset of what the card renders. */
const SCORING_FIELDS = `${CARD_FIELDS} category subcategory type tags salesCount suggestedOccasions suggestedRecipient`;

const PUBLISHED = {
  status: PRODUCT_STATUS.ACTIVE,
  isDeleted: false,
};

export async function getRelatedProducts(idOrSlug, limit = 4) {
  if (!idOrSlug) return [];

  await connectDb();

  const source = await findSource(idOrSlug);
  if (!source) return [];

  // Substitutes come from the source's own catalogue: an in-stock saree's
  // row never offers a made-to-order piece, and the reverse.
  const published = {
    ...PUBLISHED,
    ...(source.fulfillment === FULFILLMENT.MADE_TO_ORDER
      ? { fulfillment: FULFILLMENT.MADE_TO_ORDER }
      : IN_STOCK_FILTER),
  };

  const excluded = [source._id];
  const picked = [];

  // Tier 1 — admin curation.
  if (source.relatedProducts?.length > 0) {
    const curated = await Product.find({
      _id: { $in: source.relatedProducts },
      ...published,
    })
      .select(SCORING_FIELDS)
      .limit(limit)
      .lean();

    // Preserve the order the admin arranged them in.
    const byId = new Map(curated.map((doc) => [String(doc._id), doc]));
    for (const id of source.relatedProducts) {
      const doc = byId.get(String(id));
      if (doc) picked.push(doc);
      if (picked.length >= limit) break;
    }

    excluded.push(...picked.map((doc) => doc._id));
  }

  // Tier 2 — attribute similarity.
  if (picked.length < limit) {
    const candidates = await Product.find({
      _id: { $nin: excluded },
      category: source.category,
      ...published,
    })
      .select(SCORING_FIELDS)
      .limit(CANDIDATE_POOL)
      .lean();

    const ranked = candidates
      .map((doc) => ({ doc, score: score(source, doc) }))
      .sort(byScoreThenSales)
      .map((entry) => entry.doc);

    for (const doc of ranked) {
      if (picked.length >= limit) break;
      picked.push(doc);
      excluded.push(doc._id);
    }
  }

  // Tier 3 — backfill from anywhere so the row is never short.
  if (picked.length < limit) {
    const filler = await Product.find({
      _id: { $nin: excluded },
      ...published,
    })
      .select(SCORING_FIELDS)
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(limit - picked.length)
      .lean();

    picked.push(...filler);
  }

  if (picked.length === 0) return [];

  const [availability, categorySlugs] = await Promise.all([
    getAvailability(picked),
    getCategorySlugs(picked),
  ]);

  return picked.map((doc) => toCard(doc, availability, categorySlugs));
}

async function findSource(idOrSlug) {
  const filter = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: String(idOrSlug).toLowerCase() };

  return Product.findOne({ ...filter, ...PUBLISHED })
    .select(
      "category subcategory type tags price relatedProducts " +
        "suggestedOccasions suggestedRecipient fulfillment"
    )
    .lean();
}

/** Higher is more similar. Ties break on sales, so proven items surface. */
function score(source, candidate) {
  let total = 0;

  if (String(source.subcategory) === String(candidate.subcategory)) {
    total += WEIGHTS.subcategory;
  }

  if (source.type && source.type === candidate.type) {
    total += WEIGHTS.type;
  }

  total += overlap(source.tags, candidate.tags) * WEIGHTS.tag;
  total +=
    overlap(source.suggestedOccasions, candidate.suggestedOccasions) *
    WEIGHTS.occasion;
  total +=
    overlap(source.suggestedRecipient, candidate.suggestedRecipient) *
    WEIGHTS.recipient;

  if (withinPriceBand(source.price, candidate.price)) {
    total += WEIGHTS.priceBand;
  }

  return total;
}

/** Set-based so a repeated tag can't inflate the score. */
function overlap(a, b) {
  if (!a?.length || !b?.length) return 0;

  const seen = new Set(a);
  let count = 0;
  for (const value of new Set(b)) {
    if (seen.has(value)) count += 1;
  }
  return count;
}

function withinPriceBand(sourcePrice, candidatePrice) {
  if (typeof sourcePrice !== "number" || typeof candidatePrice !== "number") {
    return false;
  }
  if (sourcePrice <= 0) return false;

  const delta = Math.abs(candidatePrice - sourcePrice) / sourcePrice;
  return delta <= PRICE_BAND;
}

function byScoreThenSales(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return (b.doc.salesCount ?? 0) - (a.doc.salesCount ?? 0);
}
