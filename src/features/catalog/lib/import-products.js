import { SUBCATEGORIES, WAREHOUSES, slugify } from "@/mocks/catalog";

/**
 * Bulk product import: one CSV row = one product AND its inventory record.
 *
 * Every row is checked before anything is written. Errors block the row
 * (it is skipped); warnings do not (it imports, with the stated default).
 * The column set is the same one Export writes, so an exported sheet can be
 * edited and imported straight back.
 */

export const IMPORT_COLUMNS = [
  "title",
  "sku",
  "category",
  "subcategory",
  "price",
  "compare_at_price",
  "quantity",
  "warehouse",
  "image_files",
  "seo_title",
  "seo_description",
  "tags",
  "status",
  "fulfillment",
  "description",
];

const REQUIRED_COLUMNS = ["title", "sku", "price"];
export const SEO_TITLE_MAX = 70;
export const SEO_DESCRIPTION_MAX = 160;

function parseMoney(raw) {
  const cleaned = String(raw ?? "").replace(/[₹,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : Number.NaN;
}

function resolveCategory(category, subcategory) {
  const cat = category.trim().toLowerCase();
  const sub = subcategory.trim().toLowerCase();
  const matches = SUBCATEGORIES.filter(
    (s) => s.name.toLowerCase() === sub && (!cat || s.category.toLowerCase() === cat)
  );
  // "Other Collection" exists under both Women and Men, so it needs the category.
  return matches.length === 1 ? matches[0] : null;
}

function splitList(raw) {
  return String(raw ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param parsed   { columns, rows } from parseCsvObjects
 * @param products the current catalogue
 * @param images   Map of lower-cased file name → File, from the image drop zone
 * @param overwrite update products whose SKU already exists instead of erroring
 */
export function validateImport(parsed, { products, images, overwrite }) {
  const missing = REQUIRED_COLUMNS.filter((column) => !parsed.columns.includes(column));
  if (missing.length) {
    return { fileError: `The CSV is missing ${missing.length === 1 ? "the column" : "columns"} ${missing.join(", ")}. Start from the sample CSV.`, rows: [] };
  }
  if (parsed.rows.length === 0) {
    return { fileError: "The CSV has a header row but no products under it.", rows: [] };
  }

  const bySku = new Map(products.map((p) => [p.sku.toLowerCase(), p]));
  const firstLine = new Map();

  const rows = parsed.rows.map((data, index) => {
    const line = index + 2;
    const errors = [];
    const warnings = [];

    const title = data.title ?? "";
    const sku = (data.sku ?? "").toUpperCase();
    if (!title) errors.push("Missing title");
    if (!sku) errors.push("Missing SKU");

    let existing = null;
    if (sku) {
      const seen = firstLine.get(sku);
      if (seen) errors.push(`Duplicate SKU in file (also on row ${seen})`);
      else firstLine.set(sku, line);

      existing = bySku.get(sku.toLowerCase()) ?? null;
      if (existing && !seen) {
        if (overwrite) warnings.push(`Updates existing product “${existing.title}”`);
        else errors.push("SKU already exists in the catalogue");
      }
    }

    const price = parseMoney(data.price);
    if (price === null) errors.push("Missing price");
    else if (Number.isNaN(price) || price <= 0) errors.push(`Price “${data.price}” is not a number`);

    let compareAt = parseMoney(data.compare_at_price);
    if (Number.isNaN(compareAt)) {
      warnings.push("Compare-at price is not a number; left empty");
      compareAt = null;
    } else if (compareAt !== null && price && compareAt <= price) {
      warnings.push("Compare-at price is not above the price; left empty");
      compareAt = null;
    }

    const sub = resolveCategory(data.category ?? "", data.subcategory ?? "");
    if (!sub) {
      const label = [data.category, data.subcategory].filter(Boolean).join(" / ") || "blank";
      errors.push(`Unknown category “${label}”`);
    }

    const fulfillmentRaw = (data.fulfillment ?? "").toLowerCase().replace(/[\s-]+/g, "_");
    let fulfillment = "in_stock";
    if (fulfillmentRaw === "made_to_order") fulfillment = "made_to_order";
    else if (fulfillmentRaw && fulfillmentRaw !== "in_stock") warnings.push(`Fulfilment “${data.fulfillment}” not recognised; set to in stock`);

    let quantity = 0;
    if (fulfillment === "in_stock") {
      const rawQty = data.quantity ?? "";
      if (rawQty === "") warnings.push("No quantity; stock set to 0");
      else if (!/^\d+$/.test(rawQty)) errors.push(`Quantity “${rawQty}” must be a whole number`);
      else quantity = Number(rawQty);
    }

    const warehouse = data.warehouse ?? "";
    if (warehouse && !WAREHOUSES.some((w) => w.toLowerCase() === warehouse.toLowerCase())) {
      warnings.push(`Unknown warehouse “${warehouse}”; stock goes to Main Warehouse`);
    }

    const statusRaw = (data.status ?? "").toLowerCase();
    let status = "active";
    if (["active", "draft", "archived"].includes(statusRaw)) status = statusRaw;
    else if (statusRaw) warnings.push(`Status “${data.status}” not recognised; set to active`);

    const imageRefs = splitList(data.image_files).map((ref) => {
      if (/^https?:\/\//i.test(ref)) return { name: ref, url: ref };
      const file = images.get(ref.toLowerCase());
      if (!file) warnings.push(`Image “${ref}” was not uploaded`);
      return { name: ref, file };
    });
    const usableImages = imageRefs.filter((ref) => ref.url || ref.file);
    if (usableImages.length === 0 && imageRefs.length === 0) warnings.push("No images");

    const description = data.description ?? "";
    let seoTitle = data.seo_title ?? "";
    if (seoTitle.length > SEO_TITLE_MAX) warnings.push(`SEO title is ${seoTitle.length} characters (limit ${SEO_TITLE_MAX})`);
    if (!seoTitle) seoTitle = title.slice(0, SEO_TITLE_MAX);

    let seoDescription = data.seo_description ?? "";
    if (!seoDescription) {
      warnings.push("Meta description empty; filled from the description");
      seoDescription = description.slice(0, SEO_DESCRIPTION_MAX);
    } else if (seoDescription.length > SEO_DESCRIPTION_MAX) {
      warnings.push(`Meta description is ${seoDescription.length} characters (limit ${SEO_DESCRIPTION_MAX})`);
    }

    const product = {
      ...(existing && overwrite ? existing : {}),
      id: existing && overwrite ? existing.id : undefined,
      title,
      handle: existing && overwrite ? existing.handle : slugify(title),
      sku,
      category: sub?.category ?? "",
      subcategory: sub?.id ?? "",
      price: Math.round((price || 0) * 100),
      compareAtPrice: compareAt ? Math.round(compareAt * 100) : null,
      status,
      fulfillment,
      leadTimeDays: fulfillment === "made_to_order" ? existing?.leadTimeDays ?? 30 : null,
      tags: splitList(data.tags),
      description,
      seoTitle,
      seoDescription,
      warehouse: WAREHOUSES[0],
      lowStockThreshold: existing?.lowStockThreshold ?? 5,
    };

    return {
      line,
      data,
      product,
      quantity,
      imageRefs: usableImages,
      errors,
      warnings,
      state: errors.length ? "error" : warnings.length ? "warning" : "ready",
    };
  });

  return {
    fileError: null,
    rows,
    counts: {
      total: rows.length,
      importable: rows.filter((row) => row.state !== "error").length,
      errors: rows.filter((row) => row.state === "error").length,
      warnings: rows.filter((row) => row.warnings.length > 0 && row.state !== "error").length,
    },
  };
}

/** Rows for Export, in the import column order. Money in rupees. */
export const EXPORT_COLUMNS = [
  { label: "title", value: (p) => p.title },
  { label: "sku", value: (p) => p.sku },
  { label: "category", value: (p) => p.category },
  { label: "subcategory", value: (p) => SUBCATEGORIES.find((s) => s.id === p.subcategory)?.name ?? "" },
  { label: "price", value: (p) => p.price / 100 },
  { label: "compare_at_price", value: (p) => (p.compareAtPrice ? p.compareAtPrice / 100 : "") },
  { label: "quantity", value: (p) => (p.fulfillment === "in_stock" ? p.available ?? "" : "") },
  { label: "warehouse", value: (p) => p.warehouse ?? WAREHOUSES[0] },
  { label: "image_files", value: (p) => (p.images ?? []).filter((i) => /^https?:/.test(i.url)).map((i) => i.url).join("|") },
  { label: "seo_title", value: (p) => p.seoTitle ?? "" },
  { label: "seo_description", value: (p) => p.seoDescription ?? "" },
  { label: "tags", value: (p) => (p.tags ?? []).join("|") },
  { label: "status", value: (p) => p.status },
  { label: "fulfillment", value: (p) => p.fulfillment },
  { label: "description", value: (p) => p.description ?? "" },
];
