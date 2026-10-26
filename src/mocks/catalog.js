import { addDays } from "./calendar";
import { randInt, rngFor, roundTo } from "./rng";

/**
 * The mock catalogue: ~40 pieces across the real ATK categories.
 *
 * There are no product photos in the repo, so each product carries a `swatch`
 * colour instead and the UI draws a woven-texture tile from it. Money is in
 * paise, like the real models.
 */

export const SUBCATEGORIES = [
  { id: "saree", name: "Saree", category: "Women", code: "SAR" },
  { id: "dupatta", name: "Dupatta", category: "Women", code: "DUP" },
  { id: "jewellery", name: "Jewellery", category: "Women", code: "JWL" },
  { id: "footwear", name: "Footwear", category: "Women", code: "FTW" },
  { id: "women-other", name: "Other Collection", category: "Women", code: "OTW" },
  { id: "tie", name: "Tie", category: "Men", code: "TIE" },
  { id: "men-other", name: "Other Collection", category: "Men", code: "OTM" },
];

export const CATEGORIES = ["Women", "Men"];

export const SUBCATEGORY_BY_ID = new Map(SUBCATEGORIES.map((s) => [s.id, s]));

/** "Saree", or "Other Collection · Men" where the bare name is ambiguous. */
export function subcategoryLabel(id) {
  const sub = SUBCATEGORY_BY_ID.get(id);
  if (!sub) return "—";
  return sub.name === "Other Collection" ? `${sub.name} · ${sub.category}` : sub.name;
}

export const COLLECTIONS = [
  "Diwali Gifting",
  "Wedding Season",
  "Corporate Favourites",
  "Under ₹2,500",
  "New Arrivals",
];

export const WAREHOUSES = ["Main Warehouse"];

/**
 * [title, subcategory, price in ₹, swatch, fabric, options]
 * options: m = made to order, d = draft, a = archived, c = has compare-at price
 */
const RAW = [
  ["Banarasi Silk Saree, Crimson Zari Buta", "saree", 18500, "#9b1b30", "Banarasi Silk", "c"],
  ["Kanjivaram Silk Saree, Temple Border Gold", "saree", 32000, "#c99a2e", "Kanjivaram Silk", ""],
  ["Chanderi Silk Saree, Ivory and Gold", "saree", 8900, "#e9dfc7", "Chanderi Silk", "c"],
  ["Maheshwari Silk Saree, Peacock Blue", "saree", 6400, "#1f5f7a", "Maheshwari Silk", ""],
  ["Tussar Silk Saree, Hand-painted Madhubani", "saree", 12800, "#c8a26b", "Tussar Silk", ""],
  ["Bhagalpuri Silk Saree, Rust Orange", "saree", 5200, "#b7410e", "Bhagalpuri Silk", "c"],
  ["Patola Silk Saree, Double Ikat Red", "saree", 45000, "#a3172a", "Patola Silk", "m"],
  ["Sambalpuri Cotton Saree, Indigo Bandha", "saree", 4600, "#2e3a7a", "Sambalpuri Cotton", ""],
  ["Kota Doria Saree, Mint Green", "saree", 3800, "#8fc7aa", "Kota Doria", ""],
  ["Mysore Silk Saree, Bottle Green", "saree", 11500, "#1f5c3f", "Mysore Silk", ""],
  ["Jamdani Cotton Saree, Off White", "saree", 7200, "#ece6d6", "Handloom Cotton", "m"],
  ["Paithani Silk Saree, Purple Peacock Pallu", "saree", 28000, "#5b2a6e", "Paithani Silk", "m"],
  ["Banarasi Silk Dupatta, Gold Jaal", "dupatta", 4200, "#c99a2e", "Banarasi Silk", ""],
  ["Phulkari Dupatta, Hand-embroidered Mustard", "dupatta", 3600, "#d4a017", "Georgette", "c"],
  ["Chanderi Dupatta, Blush Pink", "dupatta", 2400, "#e3aab0", "Chanderi Silk", ""],
  ["Bandhani Dupatta, Red and Yellow", "dupatta", 1900, "#c62d42", "Georgette", ""],
  ["Ikat Cotton Dupatta, Black and White", "dupatta", 1600, "#2b2b2b", "Handloom Cotton", "a"],
  ["Kani Pashmina Dupatta, Ivory", "dupatta", 14500, "#e6dcc8", "Pashmina", "m"],
  ["Tussar Silk Dupatta, Kantha Stitch", "dupatta", 3200, "#b98a4e", "Tussar Silk", ""],
  ["Kundan Choker Set, Emerald Drops", "jewellery", 8600, "#2f6b4f", "Kundan", "c"],
  ["Meenakari Jhumkas, Royal Blue", "jewellery", 2200, "#2a4a9b", "Meenakari", ""],
  ["Oxidised Silver Hasli Necklace", "jewellery", 1800, "#8a8a8a", "Oxidised Silver", ""],
  ["Terracotta Bead Necklace, Earth Tones", "jewellery", 900, "#b5562e", "Terracotta", ""],
  ["Temple Jewellery Bangles, Set of 4", "jewellery", 3400, "#c99a2e", "Gold Plated Brass", ""],
  ["Dokra Brass Pendant, Tribal Motif", "jewellery", 1200, "#a67c2e", "Brass", ""],
  ["Pearl and Kundan Maang Tikka", "jewellery", 2600, "#e2d8c3", "Kundan", ""],
  ["Kolhapuri Chappals, Tan Leather", "footwear", 1800, "#a0632f", "Leather", ""],
  ["Mojari Juttis, Zari Embroidered Maroon", "footwear", 2400, "#7e0917", "Leather", ""],
  ["Punjabi Jutti, Phulkari Mustard", "footwear", 2100, "#d4a017", "Leather", ""],
  ["Kolhapuri Wedges, Gold Braid", "footwear", 2600, "#c99a2e", "Leather", ""],
  ["Embroidered Juttis, Ivory Pearl", "footwear", 2900, "#e9dfc7", "Leather", ""],
  ["Handloom Silk Potli Bag, Marigold", "women-other", 1400, "#e8a33b", "Raw Silk", ""],
  ["Kalamkari Stole, Indigo Floral", "women-other", 2300, "#2e3a7a", "Handloom Cotton", ""],
  ["Brocade Clutch, Antique Gold", "women-other", 2800, "#b08d3c", "Brocade", "d"],
  ["Ikat Silk Tie, Indigo", "tie", 1800, "#2e3a7a", "Ikat Silk", ""],
  ["Banarasi Silk Tie, Maroon Buta", "tie", 2200, "#7e0917", "Banarasi Silk", "c"],
  ["Khadi Cotton Tie, Charcoal", "tie", 1200, "#3a3a3a", "Khadi Cotton", ""],
  ["Kanjivaram Silk Tie, Peacock Green", "tie", 2400, "#1f6b5c", "Kanjivaram Silk", ""],
  ["Handloom Linen Tie, Sand", "tie", 1400, "#cbb48f", "Handloom Linen", ""],
  ["Ajrakh Silk Pocket Squares, Set of 3", "men-other", 1600, "#8b2e2e", "Modal Silk", ""],
  ["Nehru Jacket, Banarasi Brocade Black", "men-other", 9800, "#1f1b1a", "Brocade", "m"],
  ["Kullu Wool Stole, Charcoal Grey", "men-other", 3200, "#77736f", "Kullu Wool", "d"],
];

/** Units on hand before any order commits them. A few are set by hand. */
const STOCK_OVERRIDES = {
  "Kota Doria Saree, Mint Green": 0,
  "Temple Jewellery Bangles, Set of 4": 0,
  "Kolhapuri Wedges, Gold Braid": 0,
  "Kanjivaram Silk Saree, Temple Border Gold": 3,
  "Kundan Choker Set, Emerald Drops": 2,
  "Banarasi Silk Tie, Maroon Buta": 4,
};

/** Products were added over the two years before today. */
const CATALOGUE_START = "2024-09-15";

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function describe(fabric, sub) {
  const piece = sub.name === "Other Collection" ? "piece" : sub.name.toLowerCase();
  return `A ${fabric} ${piece} from the Atulya Karigari artisan network, made in small batches so no two are quite alike. Arrives gift-ready in a handmade box.`;
}

function gstClass(subId, rupees) {
  if (subId === "jewellery") return "GST_18";
  return rupees > 1000 ? "GST_12" : "GST_5";
}

function buildCatalogue() {
  const counters = new Map();

  return RAW.map(([title, subId, rupees, swatch, fabric, flags], index) => {
    const sub = SUBCATEGORY_BY_ID.get(subId);
    const rng = rngFor("product", title);

    const n = (counters.get(sub.code) ?? 0) + 1;
    counters.set(sub.code, n);
    // Low numbers with gaps, like a catalogue that has had pieces retired.
    const sku = `ATK-${sub.code}-${String(10 + n * 2 + (index % 2)).padStart(4, "0")}`;

    const madeToOrder = flags.includes("m");
    const status = flags.includes("d")
      ? "draft"
      : flags.includes("a")
        ? "archived"
        : "active";

    const price = rupees * 100;
    const compareAtPrice = flags.includes("c")
      ? roundTo(rupees * (1.15 + rng() * 0.15), 100) * 100
      : null;

    const description = describe(fabric, sub);
    const tags = [fabric, sub.name, rupees >= 10000 ? "Premium" : null].filter(Boolean);
    const collections = [
      rupees <= 2500 ? "Under ₹2,500" : null,
      subId === "tie" || subId === "men-other" ? "Corporate Favourites" : null,
      rng() > 0.55 ? "Diwali Gifting" : null,
      subId === "saree" || subId === "jewellery" ? "Wedding Season" : null,
    ].filter(Boolean);

    const onHand =
      title in STOCK_OVERRIDES ? STOCK_OVERRIDES[title] : randInt(rng, 9, 46);

    return {
      id: `p-${String(index + 1).padStart(3, "0")}`,
      title,
      handle: slugify(title),
      sku,
      barcode: `890${String(4000000000 + index * 7919).slice(0, 10)}`,
      category: sub.category,
      subcategory: subId,
      fabric,
      swatch,
      images: [],
      description,
      price,
      compareAtPrice,
      taxClass: gstClass(subId, rupees),
      status,
      fulfillment: madeToOrder ? "made_to_order" : "in_stock",
      leadTimeDays: madeToOrder ? randInt(rng, 21, 45) : null,
      tags,
      collections,
      seoTitle: `${title} | Atulya Karigari`.slice(0, 70),
      seoDescription: description.slice(0, 158),
      createdAt: addDays(CATALOGUE_START, Math.floor(index * 14 + rng() * 10)),
      /** Opening stock at Main Warehouse, before committed units. */
      onHand: madeToOrder ? 0 : onHand,
      lowStockThreshold: 5,
      warehouse: WAREHOUSES[0],
      /** How often it turns up in a cart — cheaper and saree-heavy. */
      popularity:
        (subId === "saree" ? 1.6 : subId === "tie" ? 1.3 : 1) / Math.sqrt(rupees / 1000),
    };
  });
}

export const BASE_PRODUCTS = buildCatalogue();

/** What can appear on an order: active, in stock (fulfilment-wise). */
export const ORDERABLE_PRODUCTS = BASE_PRODUCTS.filter(
  (p) => p.status === "active" && p.fulfillment === "in_stock"
);

export const MADE_TO_ORDER_PRODUCTS = BASE_PRODUCTS.filter(
  (p) => p.fulfillment === "made_to_order"
);
