# AKT Gifting — Data models

Mongoose schemas for the admin app (source of truth for MongoDB).  
Storefront reads via admin APIs; it does **not** own these models.

**Enums / seed catalog:** `src/constants/enums.js`  
**DB connect:** `src/db/connect.js`  
**Seed script:** `scripts/seed-catalog.js`

```bash
MONGODB_URI="mongodb://..." npm run seed:catalog
```

---

## Design principles

| Principle | What we do |
|-----------|------------|
| Option A (product-as-SKU) | Most items have no variants: `sku` + `price` live on **Product**. When `hasVariants: true`, those fields are cleared; each variant has its own sku/price. |
| Description = two parts | `description` (required HTML narrative) + `details[]` (optional spec box). |
| Inventory is separate | Product only stores flags (`trackInventory`, `allowBackorder`, `lowStockThreshold`). Qty lives in **Inventory**; changes in **StockMovement**; checkout holds in **Reservation**. |
| No dual sources of truth | Do **not** store `available`, `price_min`, or `price_max` on Product. Compute at read time. |
| Collections link one way | Membership is `Product.collections[]` → Collection. Collection docs do **not** store a `products[]` array. |
| Money | Prices are **integers in paise** (₹12,729 → `1272900`). |
| Soft delete | Products use `isDeleted`; never hard-delete if referenced by orders. |

---

## Catalog tree

```
Women (slug: women)
├── Saree              (saree)
├── Dupatta            (dupatta)
├── Jewellery          (jewellery)
├── Footwear           (footwear)
└── Other Collection   (other-collection)

Men (slug: men)
├── Tie                (tie)
└── Other Collection   (other-collection)
```

Subcategory slugs are unique **per category** (both can have `other-collection`).

---

## Model map

```
Category ──< Subcategory
    │
    └── Product ──> Collection[]   (curated sets)
            │
            ├── (sku) ──> Inventory ──> Warehouse
            │                 │
            │                 ├── StockMovement
            │                 └── Reservation
            │
            └── variants[].sku ──> Inventory (when hasVariants)
```

| File | Model | Role |
|------|--------|------|
| `product.model.js` | Product | Catalog item + optional embedded variants |
| `category.model.js` | Category | Women / Men |
| `subcategory.model.js` | Subcategory | Saree, Tie, … |
| `collection.model.js` | Collection | Wedding Edit, Festive sets, … |
| `warehouse.model.js` | Warehouse | Stock locations (start with `MAIN`) |
| `inventory.model.js` | Inventory | onHand / reserved per product+sku+warehouse |
| `stock-movement.model.js` | StockMovement | Immutable stock audit log |
| `reservation.model.js` | Reservation | Checkout stock holds |
| `index.js` | — | Re-exports all models |

---

## Product

### Identity

| Field | Type | Notes |
|-------|------|--------|
| `title` | String | Required |
| `slug` | String | Required, unique, indexed, lowercase |
| `sku` | String | Required when `hasVariants: false`. Partial unique index |
| `vendor` | String | Default `"Atulyakarigari"` |

### Categorization

| Field | Type | Notes |
|-------|------|--------|
| `category` | ObjectId → Category | Required |
| `subcategory` | ObjectId → Subcategory | Required |
| `type` | String | Optional (e.g. Tissue Silk, Banarasi) |
| `tags` | [String] | Flexible filters |
| `collections` | [ObjectId → Collection] | Curated sets |
| `suggestedOccasions` | [String] | Wedding, Diwali, Rakhi, … |
| `suggestedRecipient` | [String] | Sister, Wife, Mother, … |

### Content (PDP description UI)

| Field | Type | Notes |
|-------|------|--------|
| `description` | String (plain text) | **Required** — narrative. Rendered as text with `white-space: pre-wrap`, so the author's line breaks survive. Never as markup: tags would show literally. |
| `shortDescription` | String | Cards, meta, share previews |
| `details` | Array | Optional spec boxes |

**`details` item shape:**

```js
{ key: "fabric", label: "Fabric", value: "Tissue", position: 1 }
```

- `label` / `value` — display  
- `key` — normalized for filtering (auto-slugified from `label` in pre-validate if missing)  
- `position` — row order in the UI  

### Media

| Field | Type | Notes |
|-------|------|--------|
| `images` | Array | At least one required |
| `videos` | Array | Optional |

**Image:** `{ url, alt, position, isFeatured }`  
Pre-validate enforces **exactly one** `isFeatured` (falls back to `images[0]`).

**Video:** `{ url, alt, position, thumbnail, type }`  
`type`: `upload` | `youtube` | `vimeo`

### Pricing (when `hasVariants === false`)

| Field | Type | Notes |
|-------|------|--------|
| `price` | Number | Paise, required if no variants |
| `compareAtPrice` | Number | Struck-through MRP |
| `costPrice` | Number | Admin-only margin |
| `currency` | String | Default `INR` |
| `taxable` | Boolean | Default `true` |
| `taxClass` | String enum | `GST_5` \| `GST_12` \| `GST_18` \| `EXEMPT` |
| `hsnCode` | String | Indexed for GST reports |

When `hasVariants: true`, product-level `sku`, `price`, and `compareAtPrice` are **cleared**. Use `product.getPriceRange()` for “from ₹X”.

### Variants

| Field | Type | Notes |
|-------|------|--------|
| `hasVariants` | Boolean | Default `false` |
| `options` | `[{ name, values[] }]` | Axes (Size, Color, …) |
| `variants` | Array | Required if `hasVariants` |

**Variant item:** `{ sku, price, compareAtPrice, image, optionValues, weight, active }`  
Variant SKUs are uniquely indexed across the catalog.

### Inventory flags (not quantities)

| Field | Type | Default |
|-------|------|---------|
| `trackInventory` | Boolean | `true` |
| `allowBackorder` | Boolean | `false` |
| `lowStockThreshold` | Number | `5` |

### Shipping & physical

| Field | Type | Notes |
|-------|------|--------|
| `weight` | Number | |
| `weightUnit` | `g` \| `kg` | Default `g` (prefer grams in admin UI) |
| `dimensions` | `{ length, width, height, unit }` | Optional; unit `cm` \| `in` |
| `requiresShipping` | Boolean | Default `true` |

### SEO

| Field | Type | Notes |
|-------|------|--------|
| `seo.metaTitle` | String | Fallback → `title` |
| `seo.metaDescription` | String | Fallback → truncated description |

No `canonicalUrl` — canonical is always `/products/[slug]`.

### Gifting

| Field | Type | Default |
|-------|------|---------|
| `isGiftable` | Boolean | `true` |
| `allowGiftMessage` | Boolean | `true` |
| `giftWrapAvailable` | Boolean | `false` |
| `giftBoxCompatible` | Boolean | `false` — allowed in DIY gift-box builder |

### Merchandising / analytics

| Field | Type | Notes |
|-------|------|--------|
| `relatedProducts` | [ObjectId → Product] | Admin-curated; empty → same-subcategory fallback |
| `views` | Number | PDP view counter |
| `ratingAverage` | Number | Denormalized from reviews (0 until reviews exist) |
| `ratingCount` | Number | Default `0` |
| `salesCount` | Number | Increment on paid order |

### Lifecycle & admin

| Field | Type | Notes |
|-------|------|--------|
| `status` | `draft` \| `active` \| `archived` | Default `draft` |
| `publishedAt` | Date | Set / schedule when going active |
| `isDeleted` | Boolean | Soft delete |
| `internalNotes` | String | Admin-only |
| `createdBy` / `updatedBy` | ObjectId → User | |
| `createdAt` / `updatedAt` | Date | Mongoose timestamps |

### Product indexes

- `slug` unique  
- `sku` unique **partial** (`hasVariants: false` and sku is string)  
- `variants.sku` unique **partial** (`hasVariants: true`)  
- `{ category, subcategory }`  
- `tags`  
- `{ status, publishedAt }`  
- `{ isDeleted, status }`  
- `hsnCode`  
- Text index: `title`, `description`, `tags`, `shortDescription`  

### Product helpers

- `getPriceRange()` → `{ min, max, varies }` from product price or active variants  

### Explicitly not on Product

- `available` — derive: `(onHand - reserved) > 0` or `allowBackorder`  
- `price_min` / `price_max` / `price_varies` — use `getPriceRange()`  
- Shopify selling plans, quantity breaks, duplicate media blobs  

---

## Category

| Field | Type | Notes |
|-------|------|--------|
| `name` | String | Required (Women, Men) |
| `slug` | String | Unique |
| `image` | String | |
| `order` | Number | Nav / filter order |
| `isActive` | Boolean | |
| `seo` | `{ metaTitle, metaDescription }` | |

---

## Subcategory

| Field | Type | Notes |
|-------|------|--------|
| `name` | String | Required |
| `slug` | String | Unique with `category` |
| `category` | ObjectId → Category | Required |
| `image` | String | |
| `description` | String | |
| `order` | Number | |
| `isActive` | Boolean | |
| `seo` | object | |

Index: `{ category: 1, slug: 1 }` unique.

---

## Collection

Curated merchandising sets (e.g. “Wedding Edit 2026”).

| Field | Type | Notes |
|-------|------|--------|
| `name` | String | Required |
| `slug` | String | Unique |
| `image` | String | |
| `description` | String | |
| `startsAt` / `endsAt` | Date | Optional schedule |
| `isActive` | Boolean | |
| `order` | Number | |

Products join via `Product.collections` only.

---

## Warehouse

Even with one location today, warehouse is a document so a second location is data, not a schema change.

| Field | Type | Notes |
|-------|------|--------|
| `name` | String | Required |
| `code` | String | Unique, uppercase (e.g. `MAIN`) |
| `address` | object | line1, city, state, postalCode, country |
| `isDefault` | Boolean | |
| `isActive` | Boolean | |

Seed creates `MAIN`.

---

## Inventory

One row per `(productId, sku, warehouse)`.

| Field | Type | Notes |
|-------|------|--------|
| `productId` | ObjectId → Product | Required |
| `sku` | String | Product sku or variant sku |
| `warehouse` | ObjectId → Warehouse | Required |
| `onHand` | Number | Physical count |
| `reserved` | Number | Held for checkout |
| `lowStockThreshold` | Number | Optional override |

**Virtual:** `available` = `max(0, onHand - reserved)` — not persisted.

Unique index: `{ productId, sku, warehouse }`.

---

## StockMovement

Immutable log of every stock change.

| Field | Type | Notes |
|-------|------|--------|
| `sku` | String | |
| `warehouse` | ObjectId → Warehouse | |
| `productId` | ObjectId → Product | |
| `delta` | Number | +/- quantity |
| `reason` | enum | `restock`, `adjustment`, `sale`, `reservation`, `release`, `return`, `damage` |
| `note` | String | |
| `refType` / `refId` | String | e.g. order id |
| `actor` | ObjectId → User | |
| `createdAt` | Date | No `updatedAt` |

---

## Reservation

Stock held during checkout until paid, cancelled, or expired.

| Field | Type | Notes |
|-------|------|--------|
| `sku` | String | |
| `warehouse` | ObjectId → Warehouse | |
| `productId` | ObjectId → Product | |
| `quantity` | Number | ≥ 1 |
| `orderId` | ObjectId → Order | Optional until order created |
| `sessionId` | String | Cart / checkout session |
| `status` | enum | `active`, `consumed`, `released`, `expired` |
| `expiresAt` | Date | Indexed for cleanup jobs |

---

## Enums (`src/constants/enums.js`)

| Export | Values |
|--------|--------|
| `PRODUCT_STATUS` | `draft`, `active`, `archived` |
| `TAX_CLASS` | `GST_5`, `GST_12`, `GST_18`, `EXEMPT` |
| `WEIGHT_UNIT` | `g`, `kg` |
| `DIMENSION_UNIT` | `cm`, `in` |
| `VIDEO_TYPE` | `upload`, `youtube`, `vimeo` |
| `MOVEMENT_REASON` | restock, adjustment, sale, reservation, release, return, damage |
| `RESERVATION_STATUS` | active, consumed, released, expired |
| `CATALOG_SEED` | Women/Men subcategory seed data |

---

## Example: simple saree (no variants)

```js
{
  title: "Emerald Green Tissue Silk Saree with Golden Zari",
  slug: "emerald-green-tissue-silk-saree-with-golden-zari",
  sku: "AKI/TSEG/1526",
  vendor: "Atulyakarigari",
  category: ObjectId("..."),      // Women
  subcategory: ObjectId("..."),   // Saree
  type: "Tissue Silk",
  description: "<p>A luxurious emerald green...</p>",
  shortDescription: "Emerald tissue silk with golden zari",
  details: [
    { key: "colour", label: "Colour", value: "Emerald Green", position: 0 },
    { key: "fabric", label: "Fabric", value: "Tissue", position: 1 },
    { key: "saree-length", label: "Saree Length", value: "5.50 meter", position: 2 },
    { key: "fabric-care", label: "Fabric Care", value: "Dry clean only", position: 3 },
  ],
  images: [
    { url: "https://...", alt: "Front", position: 0, isFeatured: true },
  ],
  price: 1272900,                 // ₹12,729.00
  compareAtPrice: null,
  currency: "INR",
  taxClass: "GST_5",
  hasVariants: false,
  trackInventory: true,
  status: "active",
  publishedAt: new Date(),
}
```

Matching inventory row:

```js
{
  productId: ObjectId("..."),
  sku: "AKI/TSEG/1526",
  warehouse: ObjectId("..."),   // MAIN
  onHand: 10,
  reserved: 1,
  // available virtual → 9
}
```

---

## Storefront read rules (reminder)

1. List/detail only `status: "active"` and `isDeleted: false`.  
2. Availability = inventory join (or `allowBackorder`).  
3. Spec UI = `description` + ordered `details`.  
4. Featured image = the one with `isFeatured: true`.  
5. Variant products: show price via `getPriceRange()` / API equivalent.  

---

## Import

Import each model from its own file:

```js
import { Product } from "@/models/product.model";
import { Inventory } from "@/models/inventory.model";
```

**Not** from the `@/models` barrel. Importing the barrel registers all fifteen
schemas, so a route that touches one collection pays to construct the other
fourteen on every cold start. The barrel still exists for anything that
genuinely wants every model, but application code should not use it.

### Adding an index

`autoIndex` is off in production (see `src/db/connect.js`), so adding a
`schema.index(...)` here creates it **locally only**. Create it by hand in the
Atlas UI — Collections → Indexes → Create Index — matching the declaration.

Nothing will warn you if you forget: the query keeps returning correct results
and just scans the collection instead.

### Populate needs the referenced model imported

Mongoose resolves a `ref` through its model registry, by name, at query time.
A model nothing has imported is not in that registry, so this fails at runtime
with `MissingSchemaError` — there is no build-time error to catch it:

```js
import { StockMovement } from "@/models/stock-movement.model";
// Side-effect imports: both are reached only through populate()'s `ref`.
import "@/models/product.model";
import "@/models/admin-user.model";

await StockMovement.find()
  .populate({ path: "productId", select: "title" })
  .populate({ path: "actor", select: "fullName email" });
```

This does not apply to `$lookup`, which names a collection directly and never
consults the registry.
