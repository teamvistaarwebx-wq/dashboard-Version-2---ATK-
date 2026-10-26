"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { connectDb } from "@/db/connect";
import { Product } from "@/models/product.model";
import { Subcategory } from "@/models/subcategory.model";
import { PRODUCT_STATUS } from "@/constants/enums";
import { parseProductForm, slugify } from "@/features/catalog/lib/product-input";
import { adjustStock } from "@/features/inventory/lib/stock-ledger";
import { MOVEMENT_REASON } from "@/constants/enums";
import { requireAdmin } from "@/lib/auth/dal";
import { revalidateStorefront } from "@/lib/revalidate-storefront";

/** The two lists a saved product can be returned to. */
const RETURN_PATHS = ["/products", "/made-to-order"];

/** Mongo's duplicate-key error. The index name tells us which field clashed. */
const DUPLICATE_KEY = 11000;

/** Every generated SKU looks like AKI/SAR/1569. */
const SKU_BRAND = "AKI";
const SKU_PATTERN = /^AKI\/[A-Z]+\/\d+$/;
/** Where a brand-new subcategory's block starts: 1101, 2101, 3101… */
const BLOCK_SIZE = 1000;
const BLOCK_START = 101;

/** Two admins saving at once can pick the same number; step past it. */
const SKU_ATTEMPTS = 4;

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/**
 * Creates or updates a product.
 *
 * One action for both: the parsing, validation and slug rules are identical,
 * and splitting them would mean maintaining that twice for the sake of one
 * `if`. A present `id` means update.
 *
 * Authorised in here rather than only behind the drawer — a server action is a
 * public endpoint (same reasoning as deleteProduct and updateInquiry). Editing
 * is not destructive, so every signed-in admin including `staff` may do it;
 * only deletion is role-gated.
 *
 * Returns `{ errors }` keyed by field name so the form can print each message
 * under the input that caused it.
 */
export async function saveProduct(_prevState, formData) {
  const session = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const isUpdate = Boolean(id);

  if (isUpdate && !mongoose.Types.ObjectId.isValid(id)) {
    return { errors: { _form: "That product no longer exists." } };
  }

  const parsed = parseProductForm(formData);
  if (parsed.errors) return { errors: parsed.errors };

  const { values, openingStock } = parsed;

  await connectDb();

  // The form posts a subcategory; the category is whatever owns it. Asking for
  // both would let the two disagree, and this doubles as validation that the
  // id is a real, active subcategory rather than anything that was posted.
  const subcategory = await Subcategory.findOne({
    _id: values.subcategory,
    isActive: true,
  })
    .select("category name")
    .lean();

  if (!subcategory) return { errors: { subcategory: "Choose a category." } };

  const document = { ...values, category: subcategory.category };

  try {
    if (isUpdate) {
      const saved = await updateProduct(id, document, session.adminId);
      if (!saved) return { errors: { _form: "That product no longer exists." } };
    } else {
      const created = await createProduct(document, session.adminId, subcategory);

      /**
       * Opening stock goes through the ledger like every other quantity, so a
       * new product's first units are logged as a restock rather than
       * appearing from nowhere. Without this a product is born Sold Out.
       *
       * Only on create: an edit must not silently re-add stock every time
       * somebody fixes a typo in the description. Corrections are the
       * Inventory screen's job.
       */
      if (openingStock > 0) {
        await adjustStock({
          productId: created._id,
          sku: created.sku,
          delta: openingStock,
          reason: MOVEMENT_REASON.RESTOCK,
          note: "Opening stock",
          actor: session.adminId,
        });
      }
    }
  } catch (error) {
    const fieldErrors = toFieldErrors(error);
    if (fieldErrors) return { errors: fieldErrors };
    throw error;
  }

  revalidatePath("/products");
  revalidatePath("/made-to-order");
  revalidatePath("/inventory");
  // The dashboard counts catalogue size and stock per subcategory.
  revalidatePath("/");

  // The storefront caches its product reads for five minutes. Ping it so a
  // new or edited product shows now — after the response, so the drawer
  // closes without waiting on another app that may not even be running.
  after(() => revalidateStorefront("products"));

  // Sending the browser back to the list is what closes the drawer — the
  // ?new / ?edit param goes away and the component unmounts.
  redirect(safeReturnTo(formData.get("returnTo")));
}

/**
 * new + save(), not create(): the pre-validate hook clears variant fields,
 * renumbers details and enforces exactly one featured image, and it only runs
 * on a document instance.
 *
 * The slug and SKU are minted here rather than typed. Both are unique indexes,
 * so a hand-entered duplicate is a hard failure at exactly the wrong moment,
 * and neither is a decision anyone benefits from making.
 */
async function createProduct(document, adminId, subcategory) {
  const slug = await generateSlug(document.title);

  for (let attempt = 0; attempt < SKU_ATTEMPTS; attempt += 1) {
    const product = new Product({
      ...document,
      slug,
      sku: await generateSku(subcategory, attempt),
      // Live from the moment it is created, if that is how it was saved.
      publishedAt:
        document.status === PRODUCT_STATUS.ACTIVE ? new Date() : undefined,
      createdBy: adminId,
      updatedBy: adminId,
    });

    try {
      await product.save();
      return product;
    } catch (error) {
      const clashed = Object.keys(error?.keyPattern ?? {})[0];
      // Someone else claimed that number between our read and our write.
      if (error?.code === DUPLICATE_KEY && clashed === "sku") continue;
      throw error;
    }
  }

  throw new Error("Could not allocate a unique SKU");
}

/**
 * Loaded and saved rather than findOneAndUpdate, so the same pre-validate hook
 * runs on an edit as on a create.
 *
 * The slug is deliberately never rewritten: it is the product's public web
 * address, and changing it on a rename would break every link and search
 * result already pointing at it.
 */
async function updateProduct(id, document, adminId) {
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) return null;

  const wasPublished = Boolean(product.publishedAt);

  // Fixed at creation. Flipping an in-stock product to made to order would
  // strand its stock rows; the other way, its enquiries.
  const editable = { ...document };
  delete editable.fulfillment;

  for (const [key, value] of Object.entries(editable)) {
    product.set(key, value);
  }
  product.set("updatedBy", adminId);

  // Stamped on the first activation only — publishedAt is when it first went
  // live, not when it was last touched. `updatedAt` covers the latter.
  if (!wasPublished && document.status === PRODUCT_STATUS.ACTIVE) {
    product.set("publishedAt", new Date());
  }

  await product.save();
  return product;
}

/**
 * A unique, readable web address derived from the name.
 *
 * Collisions get a numeric suffix rather than an error: two products really
 * can be called "Rust Orange Chanderi Silk Saree", and refusing the second one
 * over a URL would be a strange thing to explain to whoever is adding it.
 */
async function generateSlug(title) {
  const base = slugify(title);

  // One indexed read covers the base and every suffix of it, instead of a
  // query per candidate.
  const taken = await Product.find({
    slug: new RegExp(`^${base.replace(REGEX_SPECIALS, "\\$&")}(-\\d+)?$`),
  })
    .select("slug")
    .lean();

  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(base)) return base;

  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
}

/**
 * AKI/SAR/1569 — brand, a code for the subcategory, then a number.
 *
 * The numbering deliberately follows the catalogue's existing convention: each
 * subcategory owns a block of a thousand (sarees 15xx, dupattas 21xx,
 * jewellery 31xx, ties 61xx) and a new product continues its own block. One
 * global counter would be simpler, but it would hand the next saree the number
 * after an unrelated muffler and the blocks would stop meaning anything.
 *
 * The letter code is the subcategory, not the hand-picked fabric-and-colour
 * initials of the seeded rows (BSDT, TSEG). Those encode a judgement no
 * generator can make; a stable three letters is the point of not asking.
 */
async function generateSku(subcategory, offset = 0) {
  const code =
    String(subcategory.name ?? "")
      .replace(/[^a-z]/gi, "")
      .slice(0, 3)
      .toUpperCase() || "GEN";

  const [ownBlock, anyBlock] = await Promise.all([
    highestSkuNumber({ subcategory: subcategory._id }),
    highestSkuNumber({}),
  ]);

  // Continue this subcategory's block, or open the next free one above every
  // block already in use when it is the first product of its kind.
  const next = ownBlock
    ? ownBlock + 1
    : Math.floor(anyBlock / BLOCK_SIZE) * BLOCK_SIZE + BLOCK_SIZE + BLOCK_START;

  return `${SKU_BRAND}/${code}/${next + offset}`;
}

/**
 * Deleted products count on purpose: the unique index still holds their SKUs,
 * so skipping them would hand out one that cannot be saved.
 *
 * Compared in the database rather than in JS — as a string "999" sorts above
 * "1000", so the numeric part has to be extracted before any max is taken.
 */
async function highestSkuNumber(match) {
  const [row] = await Product.aggregate([
    { $match: { ...match, sku: { $regex: SKU_PATTERN } } },
    {
      $project: {
        number: { $toInt: { $arrayElemAt: [{ $split: ["$sku", "/"] }, 2] } },
      },
    },
    { $group: { _id: null, max: { $max: "$number" } } },
  ]);

  return row?.max ?? 0;
}

/**
 * Turns the failures an admin can actually cause into a message under the
 * right field. Anything else is a real bug and should reach the error boundary
 * rather than be flattened into a form message.
 */
function toFieldErrors(error) {
  if (error?.code === DUPLICATE_KEY) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? "";
    // Both are generated now, so a clash here means a race we lost rather than
    // anything typed — say something retryable instead of naming a field the
    // form no longer shows.
    if (field === "slug" || field.includes("sku")) {
      return { _form: "Something else was saved at the same moment. Try again." };
    }
    return { _form: "Another product already uses one of those values." };
  }

  // The pre-validate hook throws plain Errors; Mongoose wraps field rules in a
  // ValidationError. Both carry a message worth showing.
  if (error?.name === "ValidationError") {
    const first = Object.values(error.errors ?? {})[0];
    return { _form: first?.message ?? "Some fields need another look." };
  }

  return null;
}

/**
 * `returnTo` comes from the browser, and redirect() will happily send someone
 * to another origin. Only a path back into one of the two product lists is
 * allowed — "//evil.example" included, which is a protocol-relative URL, not a
 * path.
 */
function safeReturnTo(value) {
  const target = String(value ?? "");

  if (target.startsWith("//")) return "/products";

  const allowed = RETURN_PATHS.some(
    (path) =>
      target === path ||
      target.startsWith(`${path}?`) ||
      target.startsWith(`${path}/`)
  );

  return allowed ? target : "/products";
}
