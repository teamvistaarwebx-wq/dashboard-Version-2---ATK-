"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Info, X } from "lucide-react";
import { useSaveBar } from "@/components/layout/save-bar";
import { Page } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropZone } from "@/components/ui/drop-zone";
import { Select } from "@/components/ui/select";
import { FieldLabel, FieldMessage, TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useToast } from "@/components/ui/toast";
import { useHydrated } from "@/hooks/use-hydrated";
import { fileToThumbnail, isImageFile } from "@/lib/images";
import { COLLECTIONS, SUBCATEGORY_BY_ID, WAREHOUSES, slugify } from "@/mocks/catalog";
import { saveMockProduct, useMockStore } from "@/mocks/store";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "../lib/import-products";
import { swatchFor } from "../lib/swatch";
import { CATEGORY_OPTIONS, STATUS_BADGE } from "./products-screen";

/**
 * Add or edit a product on one page. Stock is part of the product: saving a
 * new in-stock product creates its inventory record at Main Warehouse in the
 * same step, so there is no separate "now go and add stock" visit.
 */
const GST_OPTIONS = [
  { value: "GST_5", label: "GST 5% · apparel up to ₹1,000" },
  { value: "GST_12", label: "GST 12% · apparel above ₹1,000" },
  { value: "GST_18", label: "GST 18% · jewellery, accessories" },
  { value: "EXEMPT", label: "Exempt" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

function rupees(paise) {
  return paise ? String(paise / 100) : "";
}

function toForm(product, row, defaults) {
  return {
    title: product?.title ?? "",
    description: product?.description ?? "",
    images: product?.images ?? [],
    price: rupees(product?.price),
    compareAtPrice: rupees(product?.compareAtPrice),
    taxClass: product?.taxClass ?? "GST_12",
    fulfillment: product?.fulfillment ?? defaults.fulfillment ?? "in_stock",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    quantity: product ? String(row?.available ?? 0) : "",
    lowStockThreshold: String(row?.lowStockThreshold ?? product?.lowStockThreshold ?? 5),
    leadTimeDays: String(product?.leadTimeDays ?? 30),
    seoTitle: product?.seoTitle ?? "",
    seoDescription: product?.seoDescription ?? "",
    handle: product?.handle ?? "",
    handleEdited: Boolean(product),
    status: product?.status ?? "active",
    subcategory: product?.subcategory ?? "",
    tags: product?.tags ?? [],
    collections: product?.collections ?? [],
  };
}

export function ProductEditor({ productId, defaults = {} }) {
  const hydrated = useHydrated();
  const store = useMockStore();

  if (!hydrated) {
    return (
      <Page title={productId ? "Product" : "Add product"} backHref="/products" backLabel="Back to products">
        <div className="h-96 animate-pulse rounded-xl bg-surface-muted" />
      </Page>
    );
  }

  const product = productId ? store.productById.get(productId) : null;
  if (productId && !product) {
    return (
      <Page title="Product not found" backHref="/products" backLabel="Back to products">
        <Card>
          <p className="px-4 py-12 text-center text-13 text-muted">This product does not exist in the prototype data.</p>
        </Card>
      </Page>
    );
  }

  return <EditorForm key={productId ?? "new"} product={product} row={product ? store.inventoryById.get(product.id) : null} defaults={defaults} />;
}

function EditorForm({ product, row, defaults }) {
  const store = useMockStore();
  const router = useRouter();
  const toast = useToast();
  const [initial, setInitial] = useState(() => toForm(product, row, defaults));
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const madeToOrder = form.fulfillment === "made_to_order";

  function set(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !current.handleEdited) next.handle = slugify(value);
      return next;
    });
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const found = {};
    if (!form.title.trim()) found.title = "Enter a title";
    if (!form.sku.trim()) found.sku = "Enter a SKU";
    else if (store.products.some((p) => p.id !== product?.id && p.sku.toLowerCase() === form.sku.trim().toLowerCase())) {
      found.sku = "Another product already uses this SKU";
    }
    const price = Number(form.price);
    if (!form.price || !Number.isFinite(price) || price <= 0) found.price = "Enter a price above ₹0";
    if (form.compareAtPrice && !(Number(form.compareAtPrice) > price)) found.compareAtPrice = "Must be higher than the price";
    if (!form.subcategory) found.subcategory = "Choose a category";
    if (!madeToOrder && !/^\d+$/.test(form.quantity || "0")) found.quantity = "Enter a whole number";
    if (madeToOrder && !(Number(form.leadTimeDays) > 0)) found.leadTimeDays = "Enter the days needed to weave";
    return found;
  }

  function save() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      toast(`Fix ${Object.keys(found).length} ${Object.keys(found).length === 1 ? "field" : "fields"} before saving`, { tone: "critical" });
      return;
    }

    setSaving(true);
    const sub = SUBCATEGORY_BY_ID.get(form.subcategory);
    const quantity = madeToOrder ? 0 : Number(form.quantity || 0);
    const committed = row?.committed ?? 0;
    const title = form.title.trim();

    const saved = {
      ...(product ?? {}),
      id: product?.id,
      title,
      handle: form.handle || slugify(title),
      sku: form.sku.trim().toUpperCase(),
      barcode: form.barcode.trim(),
      category: sub.category,
      subcategory: sub.id,
      swatch: product?.swatch ?? swatchFor(title),
      images: form.images,
      description: form.description.trim(),
      price: Math.round(Number(form.price) * 100),
      compareAtPrice: form.compareAtPrice ? Math.round(Number(form.compareAtPrice) * 100) : null,
      taxClass: form.taxClass,
      status: form.status,
      fulfillment: form.fulfillment,
      leadTimeDays: madeToOrder ? Number(form.leadTimeDays) : null,
      tags: form.tags,
      collections: form.collections,
      seoTitle: (form.seoTitle || title).slice(0, SEO_TITLE_MAX),
      seoDescription: form.seoDescription || form.description.trim().slice(0, SEO_DESCRIPTION_MAX),
      createdAt: product?.createdAt ?? store.world.todayKey,
      warehouse: WAREHOUSES[0],
      lowStockThreshold: Number(form.lowStockThreshold) || 5,
      popularity: product?.popularity ?? 1,
      onHand: quantity,
    };

    saveMockProduct(saved, {
      // The field shows what is available to sell; units already promised to
      // paid orders sit on top of it on the shelf.
      quantity: madeToOrder ? undefined : quantity + committed,
      lowStockThreshold: saved.lowStockThreshold,
    });

    if (!product) {
      toast(
        madeToOrder
          ? "Product created as made to order"
          : `Product created with ${quantity} in stock at ${WAREHOUSES[0]}`
      );
      router.push("/products");
      return;
    }

    toast(madeToOrder ? "Product saved" : `Product saved · ${quantity} available at ${WAREHOUSES[0]}`);
    setInitial(form);
    setSaving(false);
  }

  useSaveBar({
    dirty: dirty || (!product && Boolean(form.title)),
    saving,
    saveLabel: product ? "Save" : "Save product",
    onSave: save,
    onDiscard: () => {
      setForm(initial);
      setErrors({});
    },
  });

  const badge = STATUS_BADGE[form.status];

  return (
    <Page
      title={product ? product.title : "Add product"}
      backHref="/products"
      backLabel="Back to products"
      titleMeta={product ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-4 p-4">
              <TextField id="title" label="Title" required value={form.title} error={errors.title} placeholder="Banarasi Silk Saree, Crimson Zari Buta" onChange={(e) => set("title", e.target.value)} />
              <TextareaField id="description" label="Description" rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
          </Card>

          <MediaCard images={form.images} onChange={(images) => set("images", images)} />

          <Card title="Pricing">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <TextField id="price" label="Price" required prefix="₹" inputMode="decimal" value={form.price} error={errors.price} placeholder="0" onChange={(e) => set("price", e.target.value)} inputClassName="font-mono" />
              <TextField
                id="compare-at"
                label="Compare-at price"
                prefix="₹"
                inputMode="decimal"
                value={form.compareAtPrice}
                error={errors.compareAtPrice}
                hint="Shown struck through on the storefront"
                placeholder="0"
                onChange={(e) => set("compareAtPrice", e.target.value)}
                inputClassName="font-mono"
              />
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <FieldLabel htmlFor="tax-class">GST class</FieldLabel>
                <Select id="tax-class" aria-labelledby="tax-class-label" value={form.taxClass} onValueChange={(value) => set("taxClass", value)} options={GST_OPTIONS} />
                <span id="tax-class-label" className="sr-only">GST class</span>
              </div>
            </div>
          </Card>

          <Card title="Inventory">
            <div className="flex flex-col gap-4 p-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-13 font-medium">Fulfilment</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ["in_stock", "In stock", "Woven already. Counted in inventory and sold at checkout."],
                    ["made_to_order", "Made to order", "Woven after a quote. No stock; customers request a quote."],
                  ].map(([value, label, hint]) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-13 transition-colors ${
                        form.fulfillment === value ? "border-brand bg-brand-tint/50" : "border-border hover:bg-surface-muted"
                      }`}
                    >
                      <input type="radio" name="fulfillment" value={value} checked={form.fulfillment === value} onChange={() => set("fulfillment", value)} className="mt-0.5 size-4 accent-brand" />
                      <span>
                        <span className="block font-medium">{label}</span>
                        <span className="block text-xs text-muted">{hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="sku" label="SKU" required value={form.sku} error={errors.sku} placeholder="ATK-SAR-0042" onChange={(e) => set("sku", e.target.value)} inputClassName="font-mono uppercase" />
                <TextField id="barcode" label="Barcode (EAN)" value={form.barcode} placeholder="Optional" onChange={(e) => set("barcode", e.target.value)} inputClassName="font-mono" />
              </div>

              {madeToOrder ? (
                <TextField
                  id="lead-time"
                  label="Lead time"
                  suffix="days"
                  inputMode="numeric"
                  value={form.leadTimeDays}
                  error={errors.leadTimeDays}
                  hint="How long weaving takes once a quote is accepted"
                  onChange={(e) => set("leadTimeDays", e.target.value)}
                  className="sm:max-w-[calc(50%-0.5rem)]"
                  inputClassName="font-mono"
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] items-center gap-3 border-b border-border bg-surface-muted px-3 py-2 text-xs text-muted">
                    <span>Location</span>
                    <span>Available</span>
                    <span>Alert below</span>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] items-start gap-3 px-3 py-2.5">
                    <span className="pt-2 text-13">
                      {WAREHOUSES[0]}
                      {row?.committed ? <span className="block text-xs text-muted">{row.committed} committed to orders</span> : null}
                    </span>
                    <TextField
                      id="quantity"
                      label={`Quantity at ${WAREHOUSES[0]}`}
                      labelHidden
                      inputMode="numeric"
                      value={form.quantity}
                      error={errors.quantity}
                      placeholder="0"
                      onChange={(e) => set("quantity", e.target.value)}
                      inputClassName="font-mono"
                    />
                    <TextField
                      id="low-stock"
                      label="Low-stock alert level"
                      labelHidden
                      inputMode="numeric"
                      value={form.lowStockThreshold}
                      onChange={(e) => set("lowStockThreshold", e.target.value)}
                      inputClassName="font-mono"
                    />
                  </div>
                </div>
              )}

              {!product && !madeToOrder ? (
                <p className="flex items-start gap-2 text-13 text-muted">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Saving creates this product&apos;s inventory at {WAREHOUSES[0]} with the quantity above.
                </p>
              ) : null}
            </div>
          </Card>

          <SeoCard form={form} set={set} />

          <div className="flex justify-end gap-2">
            {dirty ? (
              <Button variant="secondary" onClick={() => setForm(initial)}>
                Discard
              </Button>
            ) : null}
            <Button onClick={save} disabled={saving}>
              {product ? "Save" : "Save product"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Status">
            <div className="p-4 pt-3">
              <span id="status-label" className="sr-only">Status</span>
              <Select id="status" aria-labelledby="status-label" value={form.status} onValueChange={(value) => set("status", value)} options={STATUS_OPTIONS} />
              <p className="mt-2 text-xs text-muted">
                {form.status === "active" ? "Visible on the storefront." : form.status === "draft" ? "Hidden until you set it active." : "Hidden and kept for records."}
              </p>
            </div>
          </Card>

          <Card title="Organisation">
            <div className="flex flex-col gap-4 p-4 pt-3">
              <div className="flex flex-col gap-1.5">
                <span id="subcategory-label" className="text-13 font-medium">
                  Category <span className="text-critical" aria-hidden="true">*</span>
                </span>
                <Select
                  id="subcategory"
                  aria-labelledby="subcategory-label"
                  value={form.subcategory}
                  invalid={Boolean(errors.subcategory)}
                  placeholder="Choose a category"
                  onValueChange={(value) => set("subcategory", value)}
                  options={CATEGORY_OPTIONS}
                />
                <FieldMessage error={errors.subcategory} id="subcategory-message" />
              </div>
              <TagInput tags={form.tags} onChange={(tags) => set("tags", tags)} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-13 font-medium">Collections</legend>
                {COLLECTIONS.map((name) => (
                  <label key={name} className="flex items-center gap-2 text-13">
                    <Checkbox
                      checked={form.collections.includes(name)}
                      onChange={(e) => set("collections", e.target.checked ? [...form.collections, name] : form.collections.filter((c) => c !== name))}
                    />
                    {name}
                  </label>
                ))}
              </fieldset>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

function MediaCard({ images, onChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [busy, setBusy] = useState(false);

  async function add(files) {
    setBusy(true);
    const added = await Promise.all(
      files.filter(isImageFile).map(async (file, index) => ({ id: `${Date.now()}-${index}`, name: file.name, url: await fileToThumbnail(file) }))
    );
    onChange([...images, ...added]);
    setBusy(false);
  }

  function move(from, to) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <Card title="Media" subtitle="The first image is the cover. Drag to reorder.">
      <div className="flex flex-col gap-3 p-4 pt-3">
        {images.length ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {images.map((image, index) => (
              <li
                key={image.id ?? image.url}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) move(dragIndex, index);
                  setDragIndex(null);
                }}
                className={`group relative aspect-square overflow-hidden rounded-lg border bg-surface-muted ${index === 0 ? "border-brand" : "border-border"} ${dragIndex === index ? "opacity-50" : ""}`}
              >
                {/* Data URLs from the browser; next/image cannot optimise them. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.name ?? ""} className="size-full cursor-grab object-cover" />
                {index === 0 ? <span className="absolute left-1 top-1"><Badge tone="brand">Cover</Badge></span> : null}
                <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <span className="flex gap-1">
                    <IconButton label={`Move ${image.name ?? "image"} earlier`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                      <ArrowLeft />
                    </IconButton>
                    <IconButton label={`Move ${image.name ?? "image"} later`} disabled={index === images.length - 1} onClick={() => move(index, index + 1)}>
                      <ArrowRight />
                    </IconButton>
                  </span>
                  <IconButton label={`Remove ${image.name ?? "image"}`} onClick={() => onChange(images.filter((_, i) => i !== index))}>
                    <X />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <DropZone compact={images.length > 0} multiple accept="image/*" label={busy ? "Adding…" : "Add images"} hint="or drop JPG, PNG or WebP files here" onFiles={add} />
      </div>
    </Card>
  );
}

function IconButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-6 items-center justify-center rounded-md bg-surface/90 text-foreground shadow-card disabled:opacity-40 [&_svg]:size-3.5"
      {...props}
    >
      {children}
    </button>
  );
}

function SeoCard({ form, set }) {
  const title = form.seoTitle || form.title || "Product title";
  const description = form.seoDescription || form.description.slice(0, SEO_DESCRIPTION_MAX) || "Add a description to see how this product appears in search results.";

  return (
    <Card title="Search engine listing">
      <div className="flex flex-col gap-4 p-4 pt-3">
        <div className="rounded-lg border border-border p-3" aria-label="Search result preview">
          <p className="text-xs text-muted">Atulya Karigari</p>
          <p className="truncate text-xs text-serp-url">atulyakarigari.com › products › {form.handle || "product-handle"}</p>
          <p className="mt-0.5 truncate text-base text-serp-link">{title}</p>
          <p className="line-clamp-2 text-13 text-muted">{description}</p>
        </div>

        <TextField
          id="seo-title"
          label="SEO title"
          value={form.seoTitle}
          placeholder={form.title || "Defaults to the product title"}
          counter={`${form.seoTitle.length} / ${SEO_TITLE_MAX}`}
          error={form.seoTitle.length > SEO_TITLE_MAX ? `Search engines cut titles after ${SEO_TITLE_MAX} characters` : undefined}
          onChange={(e) => set("seoTitle", e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <TextareaField
            id="seo-description"
            label="Meta description"
            rows={3}
            value={form.seoDescription}
            placeholder="Defaults to the first 160 characters of the description"
            onChange={(e) => set("seoDescription", e.target.value)}
          />
          <FieldMessage
            counter={`${form.seoDescription.length} / ${SEO_DESCRIPTION_MAX}`}
            error={form.seoDescription.length > SEO_DESCRIPTION_MAX ? `Search engines cut descriptions after ${SEO_DESCRIPTION_MAX} characters` : undefined}
          />
        </div>
        <TextField
          id="handle"
          label="URL handle"
          prefix="/"
          value={form.handle}
          onChange={(e) => {
            set("handle", slugify(e.target.value));
            set("handleEdited", true);
          }}
          inputClassName="font-mono"
        />
      </div>
    </Card>
  );
}

function TagInput({ tags, onChange }) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim().replace(/,$/, "");
    if (value && !tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) onChange([...tags, value]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor="tags">Tags</FieldLabel>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-2 py-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-neutral-bg px-1.5 py-0.5 text-xs">
            {tag}
            <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => onChange(tags.filter((t) => t !== tag))} className="text-muted hover:text-foreground">
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id="tags"
          value={draft}
          placeholder={tags.length ? "" : "Silk, Wedding…"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={add}
          className="min-w-20 flex-1 bg-transparent text-13 outline-none focus-visible:outline-none"
        />
      </div>
      <p className="text-xs text-muted">Press Enter or comma to add</p>
    </div>
  );
}
