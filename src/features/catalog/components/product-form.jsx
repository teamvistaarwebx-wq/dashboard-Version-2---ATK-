"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ChipsInput } from "@/components/ui/chips-input";
import { SelectField } from "@/components/ui/select-field";
import { SuggestField } from "@/components/ui/suggest-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import {
  FULFILLMENT,
  PRODUCT_STATUS,
  TAX_CLASS_VALUES,
} from "@/constants/enums";
import {
  PRODUCT_COLOURS,
  PRODUCT_TYPES,
} from "@/constants/product-vocabulary";
import { useDrawerClose } from "@/features/catalog/hooks/use-drawer-close";
import { saveProduct } from "../actions/save-product";
import { DetailRowsField } from "./detail-rows-field";
import { CategorySelect, FieldSkeleton } from "./product-category-field";
import { ProductImageUploader } from "./product-image-uploader";

/**
 * Add / edit a product.
 *
 * Eleven fields are always visible; the rest sit behind collapsed sections,
 * and the ones that only make sense in context appear only in that context —
 * GST class and HSN code when the product is taxable, backorder rules when
 * stock is being counted, gift options when it is giftable. A form that shows
 * every field at once is how a catalogue ends up full of half-right data.
 *
 * The slug and the SKU are deliberately absent. Both are unique keys, both are
 * generated in the action, and a hand-typed duplicate of either fails the save
 * outright — asking a person to invent one is asking for the error.
 *
 * `noValidate` on purpose: the browser's own bubbles appear one at a time,
 * float over the layout and cannot be styled. The action returns every problem
 * at once, keyed by field, and each one prints under its own input.
 *
 * Where to go when this closes is worked out here rather than handed down from
 * the drawer. It has to be: a server component now sits between the two so the
 * panel can open before these values exist, and a callback cannot cross that
 * boundary. `useDrawerClose()` is the same hook the panel itself uses, so
 * Cancel, the X and Escape cannot end up disagreeing about where "back" is.
 *
 * `categoriesPromise`, not the resolved list, and unresolved on purpose. Every
 * field here renders from constants or from `product` — the Category select
 * alone needs Mongo, because it posts a subcategory id. Taking the awaited
 * value would hold the entire form behind that one read; taking the promise
 * lets the form paint in full and leaves `use()` to the single component that
 * actually needs it.
 *
 * `fulfillment` is which list the drawer was opened from, and only matters for
 * a new product — an existing one says what it is itself, and never changes.
 * Made to order drops every stock field and the gift-box option: the piece is
 * woven on demand and only ever reaches a customer through a quote.
 */
const INITIAL_STATE = { errors: {} };
const EMPTY = {};

/** Module scope — constants, so never rebuilt per render. */
const STATUS_OPTIONS = [
  { value: PRODUCT_STATUS.DRAFT, label: "Draft — not on the site" },
  { value: PRODUCT_STATUS.ACTIVE, label: "Active — live" },
  { value: PRODUCT_STATUS.ARCHIVED, label: "Archived" },
];

const TAX_OPTIONS = TAX_CLASS_VALUES.map((value) => ({
  value,
  label: value === "EXEMPT" ? "Exempt" : `${value.replace("GST_", "GST ")}%`,
}));

export function ProductForm({
  product = EMPTY,
  categoriesPromise,
  fulfillment = FULFILLMENT.IN_STOCK,
}) {
  const { listHref, close } = useDrawerClose();

  const kind = product.fulfillment ?? fulfillment;
  const madeToOrder = kind === FULFILLMENT.MADE_TO_ORDER;

  const [state, formAction, isPending] = useActionState(
    saveProduct,
    INITIAL_STATE
  );

  const errors = state?.errors ?? EMPTY;
  const hasFieldError = Object.keys(errors).some((key) => key !== "_form");

  // Defaults come out true for a new product: `undefined !== false`.
  const [taxable, setTaxable] = useState(product.taxable !== false);
  const [trackInventory, setTrackInventory] = useState(
    product.trackInventory !== false
  );
  const [isGiftable, setIsGiftable] = useState(product.isGiftable !== false);

  return (
    <form
      action={formAction}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
        {product.id ? (
          <input type="hidden" name="id" value={product.id} />
        ) : null}
        <input type="hidden" name="returnTo" value={listHref} />
        <input type="hidden" name="fulfillment" value={kind} />

        <ProductImageUploader
          defaultValue={product.images ?? []}
          error={errors.images}
          disabled={isPending}
        />

        <TextField
          id="product-title"
          name="title"
          label="Product name"
          defaultValue={product.title ?? ""}
          placeholder="Rust Orange Chanderi Silk Saree"
          error={errors.title}
          required
          disabled={isPending}
        />

        {/* Read-only, because both are generated and the slug can never change
            once set — it is the product's public web address. Shown so the
            SKU can be read out or copied. */}
        {product.id ? (
          <p className="-mt-3 font-nunito text-xs text-muted">
            SKU <span className="font-semibold text-foreground">{product.sku}</span>
            {" · "}
            URL{" "}
            <span className="font-semibold text-foreground">
              {madeToOrder ? "/made-to-order/" : "/products/"}
              {product.slug}
            </span>
          </p>
        ) : (
          <p className="-mt-3 font-nunito text-xs text-muted">
            A SKU and web address are created automatically when you save.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* The one field in the drawer that cannot be drawn without the
              query. An empty <select> is not a partly-rendered field, it is a
              dead end, so this one waits behind a visible skeleton. */}
          <Suspense fallback={<FieldSkeleton label="Category" />}>
            <CategorySelect
              categoriesPromise={categoriesPromise}
              defaultValue={product.subcategory ?? ""}
              error={errors.subcategory}
              disabled={isPending}
            />
          </Suspense>

          {/* A plain list, no fetch and nothing to wait for. It is also only a
              suggestion — the input is free text, so a fabric missing from
              constants/product-vocabulary.js can still be typed and saved. */}
          <SuggestField
            id="product-type"
            name="type"
            label="Fabric / type"
            suggestions={PRODUCT_TYPES}
            defaultValue={product.type ?? ""}
            placeholder="Banarasi Silk"
            disabled={isPending}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SuggestField
            id="product-colour"
            name="colour"
            label="Colour"
            suggestions={PRODUCT_COLOURS}
            defaultValue={product.colour ?? ""}
            placeholder="Rust Orange"
            hint="Becomes the first specification row."
            disabled={isPending}
          />

          <SelectField
            id="product-status"
            name="status"
            label="Status"
            options={STATUS_OPTIONS}
            defaultValue={product.status || PRODUCT_STATUS.DRAFT}
            disabled={isPending}
          />
        </div>

        <ChipsInput
          name="suggestedOccasions"
          label="Occasions"
          placeholder="Wedding, then Enter"
          defaultValue={product.suggestedOccasions ?? []}
          disabled={isPending}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            id="product-price"
            name="price"
            label={madeToOrder ? "Price per unit (₹)" : "Retail price (₹)"}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={product.price ?? ""}
            placeholder="14559"
            hint={
              madeToOrder
                ? "Shown as indicative. The final price is set in the quote."
                : "What the customer pays."
            }
            error={errors.price}
            required
            disabled={isPending}
          />

          <TextField
            id="product-compare-price"
            name="compareAtPrice"
            label="MRP (₹)"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={product.compareAtPrice ?? ""}
            placeholder="17999"
            hint="Optional. Shown struck through beside the price."
            error={errors.compareAtPrice}
            disabled={isPending}
          />
        </div>

        <TextareaField
          id="product-description"
          name="description"
          label="Description"
          rows={7}
          defaultValue={product.description ?? ""}
          placeholder={
            "A traditional handwoven Sambalpuri cotton saree on a jet-black base with vibrant orange and pink accents.\n\nWoven by hand in Odisha. ✨"
          }
          hint="Appears on the product page exactly as you type it — line breaks, blank lines between paragraphs and emoji are all kept."
          error={errors.description}
          required
          disabled={isPending}
        />

        <Section title="Pricing & tax">
          <Checkbox
            name="taxable"
            label="Taxable"
            checked={taxable}
            onChange={setTaxable}
            disabled={isPending}
          />

          {/* Only while it is taxable — an untaxed product has no GST class
              and no HSN code to give. */}
          {taxable ? (
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                id="product-tax-class"
                name="taxClass"
                label="GST rate"
                options={TAX_OPTIONS}
                defaultValue={product.taxClass || "GST_5"}
                disabled={isPending}
              />

              <TextField
                id="product-hsn"
                name="hsnCode"
                label="HSN code"
                defaultValue={product.hsnCode ?? ""}
                placeholder="5007"
                hint="For GST returns."
                disabled={isPending}
              />
            </div>
          ) : null}

          <TextField
            id="product-cost-price"
            name="costPrice"
            label="Cost price (₹)"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product.costPrice ?? ""}
            hint="Your margin. Never leaves the admin."
            disabled={isPending}
          />
        </Section>

        <Section title={madeToOrder ? "Shipping" : "Stock & shipping"}>
          {madeToOrder ? (
            <p className="font-nunito text-xs leading-relaxed text-muted">
              Made to order — woven once a customer commits to a quantity, so
              no stock is counted and it never appears on the Inventory screen.
            </p>
          ) : (
            <Checkbox
              name="trackInventory"
              label="Count stock for this product"
              checked={trackInventory}
              onChange={setTrackInventory}
              disabled={isPending}
            />
          )}

          {/* All three are meaningless when nothing is being counted. */}
          {trackInventory && !madeToOrder ? (
            <>
              {/* Only on a new product. Changing this on an edit would let a
                  typo in the description quietly re-add stock — corrections
                  belong on the Inventory screen, where they are logged with a
                  reason. */}
              {product.id ? (
                <p className="font-nunito text-xs leading-relaxed text-muted">
                  Stock: <strong className="text-foreground">{product.onHand ?? 0}</strong>{" "}
                  on hand.{" "}
                  {/* Straight to this SKU's adjust form, rather than to a
                      search the person then has to repeat. */}
                  <Link
                    href={`/inventory?adjust=${encodeURIComponent(product.sku ?? "")}`}
                    className="text-brand underline-offset-2 hover:underline"
                  >
                    Adjust stock
                  </Link>
                  , where every change is logged with a reason.
                </p>
              ) : (
                <TextField
                  id="product-stock"
                  name="stockQuantity"
                  label="Opening stock"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  defaultValue=""
                  placeholder="0"
                  hint="How many you have right now. Leave at 0 and it will read Sold Out until you stock it."
                  error={errors.stockQuantity}
                  disabled={isPending}
                />
              )}

              <Checkbox
                name="allowBackorder"
                label="Keep selling at zero stock (backorder)"
                defaultChecked={Boolean(product.allowBackorder)}
                disabled={isPending}
              />

              <TextField
                id="product-low-stock"
                name="lowStockThreshold"
                label="Warn below this many"
                type="number"
                min="0"
                defaultValue={product.lowStockThreshold ?? 5}
                disabled={isPending}
              />
            </>
          ) : null}

          <TextField
            id="product-weight"
            name="weight"
            label="Weight (grams)"
            type="number"
            min="0"
            step="1"
            defaultValue={product.weight ?? ""}
            placeholder="850"
            hint="Not used yet — needed when a courier is connected."
            disabled={isPending}
          />
        </Section>

        <Section title="Gifting">
          <Checkbox
            name="isGiftable"
            label="Can be given as a gift"
            checked={isGiftable}
            onChange={setIsGiftable}
            disabled={isPending}
          />

          {isGiftable ? (
            <>
              <Checkbox
                name="allowGiftMessage"
                label="Allow a gift message"
                defaultChecked={product.allowGiftMessage !== false}
                disabled={isPending}
              />
              <Checkbox
                name="giftWrapAvailable"
                label="Gift wrap available"
                defaultChecked={Boolean(product.giftWrapAvailable)}
                disabled={isPending}
              />
              {/* A made-to-order piece is never in the gift box — it is
                  quoted, not checked out. */}
              {madeToOrder ? null : (
                <Checkbox
                  name="giftBoxCompatible"
                  label="Allowed in the DIY gift box builder"
                  defaultChecked={Boolean(product.giftBoxCompatible)}
                  disabled={isPending}
                />
              )}
            </>
          ) : null}
        </Section>

        <Section title="More details">
          <TextareaField
            id="product-short-description"
            name="shortDescription"
            label="Short description"
            rows={2}
            defaultValue={product.shortDescription ?? ""}
            hint="One line. Used for Google and link previews."
            disabled={isPending}
          />

          <ChipsInput
            name="tags"
            label="Tags"
            placeholder="banarasi, then Enter"
            defaultValue={product.tags ?? []}
            hint="Helps this product turn up in search."
            disabled={isPending}
          />

          <DetailRowsField
            defaultValue={product.details ?? []}
            disabled={isPending}
          />

          <TextareaField
            id="product-internal-notes"
            name="internalNotes"
            label="Internal notes"
            rows={3}
            defaultValue={product.internalNotes ?? ""}
            hint="Only your team sees this."
            disabled={isPending}
          />
        </Section>
      </div>

      {/* Pinned, so the save button is reachable without scrolling back up
          through the whole form — and so a failure is never off-screen. */}
      <footer className="shrink-0 border-t border-border px-6 py-4">
        {errors._form || hasFieldError ? (
          <p
            role="alert"
            className="mb-3 rounded-lg bg-danger/8 px-3 py-2.5 font-nunito text-sm text-danger"
          >
            {errors._form ?? "Check the highlighted fields above."}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 font-nunito text-sm font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 font-nunito text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving
              </>
            ) : product.id ? (
              "Save changes"
            ) : (
              "Save product"
            )}
          </button>
        </div>
      </footer>
    </form>
  );
}

function Section({ title, children }) {
  return (
    <details className="rounded-lg border border-border">
      <summary className="cursor-pointer px-4 py-3 font-nunito text-xs font-semibold uppercase tracking-wide text-muted transition hover:text-brand">
        {title}
      </summary>
      <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
        {children}
      </div>
    </details>
  );
}

/**
 * Controlled when `onChange` is given — that is how a box gets to reveal the
 * fields that depend on it. Uncontrolled otherwise, so the leaf options keep
 * posting their own value without a state variable each.
 */
function Checkbox({ name, label, checked, onChange, defaultChecked, disabled }) {
  return (
    <label className="flex items-center gap-2.5 font-nunito text-sm text-foreground">
      <input
        type="checkbox"
        name={name}
        {...(onChange
          ? { checked, onChange: (event) => onChange(event.target.checked) }
          : { defaultChecked })}
        disabled={disabled}
        className="h-4 w-4 shrink-0 accent-brand"
      />
      {label}
    </label>
  );
}
