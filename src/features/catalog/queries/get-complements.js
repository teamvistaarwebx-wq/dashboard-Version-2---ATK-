import mongoose from "mongoose";
import { connectDb } from "@/db/connect";
import { Product } from "@/models/product.model";
import { IN_STOCK_FILTER, PRODUCT_STATUS } from "@/constants/enums";
import {
  CARD_FIELDS,
  getAvailability,
  getCategorySlugs,
  toCard,
} from "@/features/catalog/lib/product-card";

/**
 * "Recommended for Your Gift Box" — complements for a set of products.
 *
 * The inverse of get-related-products.js. That one finds substitutes (another
 * saree instead of this one); this one finds things that go WITH what is
 * already in the box (jewellery and juttis to pair with the saree), which is
 * what drives basket value on a gifting site.
 */

const WEIGHTS = {
  differentSubcategory: 30,
  occasion: 10,
  recipient: 8,
  tag: 4,
  giftBoxCompatible: 10,
  /** Same subcategory is a substitute, not a complement — push it down. */
  sameSubcategoryPenalty: -25,
};

const CANDIDATE_POOL = 200;

const SCORING_FIELDS = `${CARD_FIELDS} category subcategory type tags salesCount suggestedOccasions suggestedRecipient giftBoxCompatible`;

/**
 * In stock only — these rails fill a gift box, and a made-to-order piece can
 * never go in one.
 */
const PUBLISHED = {
  status: PRODUCT_STATUS.ACTIVE,
  isDeleted: false,
  ...IN_STOCK_FILTER,
};

export async function getComplements(ids = [], limit = 4) {
  await connectDb();

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) return [];

  const sources = await Product.find({ _id: { $in: validIds }, ...PUBLISHED })
    .select(
      "category subcategory tags suggestedOccasions suggestedRecipient price"
    )
    .lean();

  if (sources.length === 0) return [];

  const candidates = await Product.find({
    _id: { $nin: validIds },
    ...PUBLISHED,
  })
    .select(SCORING_FIELDS)
    .limit(CANDIDATE_POOL)
    .lean();

  if (candidates.length === 0) return [];

  // Score against every item in the box and sum, so a box of two sarees
  // pulls harder toward jewellery than a box of one.
  const ranked = candidates
    .map((doc) => ({
      doc,
      score: sources.reduce((total, source) => total + score(source, doc), 0),
    }))
    .sort(byScoreThenSales)
    .slice(0, limit)
    .map((entry) => entry.doc);

  const [availability, categorySlugs] = await Promise.all([
    getAvailability(ranked),
    getCategorySlugs(ranked),
  ]);

  return ranked.map((doc) => toCard(doc, availability, categorySlugs));
}

function score(source, candidate) {
  let total = 0;

  const sameCategory = String(source.category) === String(candidate.category);
  const sameSubcategory =
    String(source.subcategory) === String(candidate.subcategory);

  if (sameSubcategory) {
    total += WEIGHTS.sameSubcategoryPenalty;
  } else if (sameCategory) {
    // A saree and jewellery both sit under Women — that pairing is the point.
    total += WEIGHTS.differentSubcategory;
  }

  total +=
    overlap(source.suggestedOccasions, candidate.suggestedOccasions) *
    WEIGHTS.occasion;
  total +=
    overlap(source.suggestedRecipient, candidate.suggestedRecipient) *
    WEIGHTS.recipient;
  total += overlap(source.tags, candidate.tags) * WEIGHTS.tag;

  if (candidate.giftBoxCompatible) total += WEIGHTS.giftBoxCompatible;

  return total;
}

/** Set-based so a repeated value can't inflate the score. */
function overlap(a, b) {
  if (!a?.length || !b?.length) return 0;

  const seen = new Set(a);
  let count = 0;
  for (const value of new Set(b)) {
    if (seen.has(value)) count += 1;
  }
  return count;
}

function byScoreThenSales(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return (b.doc.salesCount ?? 0) - (a.doc.salesCount ?? 0);
}
