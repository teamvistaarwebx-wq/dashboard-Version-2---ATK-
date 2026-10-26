"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus, Upload } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ClientPagination,
  EmptyTable,
  ROW_LINK,
  SearchInput,
  TableScroll,
  TBODY,
  TD,
  TH,
  THEAD,
  pageParam,
} from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useUrlState } from "@/hooks/use-url-state";
import { downloadText, toCsv } from "@/lib/csv";
import { formatINR } from "@/lib/format";
import { SUBCATEGORIES, subcategoryLabel } from "@/mocks/catalog";
import { useMockStore } from "@/mocks/store";
import { EXPORT_COLUMNS } from "../lib/import-products";
import { ImportProductsModal } from "./import-products-modal";
import { ProductThumb } from "./product-thumb";

const PAGE_SIZE = 25;

export const STATUS_BADGE = {
  active: { label: "Active", tone: "success" },
  draft: { label: "Draft", tone: "neutral" },
  archived: { label: "Archived", tone: "neutral" },
};

const TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export const CATEGORY_OPTIONS = [
  { label: "Women", options: SUBCATEGORIES.filter((s) => s.category === "Women").map((s) => ({ value: s.id, label: s.name })) },
  { label: "Men", options: SUBCATEGORIES.filter((s) => s.category === "Men").map((s) => ({ value: s.id, label: s.name })) },
];

/** "24 in stock" / "Out of stock" / "Made to order" for a product row. */
export function InventoryText({ product, row }) {
  if (product.fulfillment === "made_to_order") return <span className="text-muted">Made to order</span>;
  if (!row) return <span className="text-muted">Not tracked</span>;
  if (row.available <= 0) return <span className="font-medium text-critical">Out of stock</span>;
  return (
    <span className={row.available <= row.lowStockThreshold ? "text-warning" : ""}>
      <span className="font-mono">{row.available}</span> in stock
    </span>
  );
}

export function ProductsScreen() {
  const store = useMockStore();
  const router = useRouter();
  const toast = useToast();
  const [params, setParams] = useUrlState();
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const tab = TABS.find((t) => t.value === params.get("status"))?.value ?? "all";
  const query = (params.get("q") ?? "").toLowerCase();
  const category = params.get("category") ?? "";
  const page = pageParam(params.get("page"));

  const base = store.products.filter(
    (p) =>
      (!category || p.subcategory === category) &&
      (!query || p.title.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query))
  );
  const tabs = TABS.map((t) => ({ ...t, count: t.value === "all" ? base.length : base.filter((p) => p.status === t.value).length }));
  const filtered = tab === "all" ? base : base.filter((p) => p.status === tab);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allOnPage = rows.length > 0 && rows.every((p) => selected.has(p.id));

  function exportProducts() {
    const list = (selected.size ? filtered.filter((p) => selected.has(p.id)) : filtered).map((p) => ({
      ...p,
      available: store.inventoryById.get(p.id)?.available,
    }));
    downloadText("atk-products.csv", toCsv(EXPORT_COLUMNS, list));
    toast(`Exported ${list.length} products`);
  }

  return (
    <Page
      title="Products"
      actions={
        <>
          <Button variant="secondary" onClick={() => setImporting(true)}>
            <Upload aria-hidden="true" />
            Import
          </Button>
          <Button variant="secondary" onClick={exportProducts}>
            <Download aria-hidden="true" />
            Export
          </Button>
          <ButtonLink href="/products/new">
            <Plus aria-hidden="true" />
            Add product
          </ButtonLink>
        </>
      }
    >
      <Card>
        <div className="flex flex-col gap-2 border-b border-border p-2 lg:flex-row lg:items-center lg:justify-between">
          <Tabs label="Product status" tabs={tabs} value={tab} controls="products-table" onChange={(value) => setParams({ status: value === "all" ? null : value, page: null })} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput label="Search products" placeholder="Title or SKU" defaultValue={params.get("q") ?? ""} onSearch={(value) => setParams({ q: value, page: null })} className="sm:w-64" />
            <span id="category-filter-label" className="sr-only">
              Category
            </span>
            <div className="sm:w-48">
              <Select
                id="category-filter"
                size="sm"
                aria-labelledby="category-filter-label"
                value={category}
                onValueChange={(value) => setParams({ category: value, page: null })}
                options={[{ value: "", label: "All categories" }, ...CATEGORY_OPTIONS]}
              />
            </div>
          </div>
        </div>

        <div id="products-table">
          {rows.length === 0 ? (
            <EmptyTable title="No products match">Try another tab, search or category.</EmptyTable>
          ) : (
            <TableScroll minWidth="52rem">
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={`${TH} w-10`}>
                    <Checkbox
                      aria-label="Select all products on this page"
                      checked={allOnPage}
                      indeterminate={!allOnPage && rows.some((p) => selected.has(p.id))}
                      onChange={() =>
                        setSelected((current) => {
                          const next = new Set(current);
                          for (const p of rows) allOnPage ? next.delete(p.id) : next.add(p.id);
                          return next;
                        })
                      }
                    />
                  </th>
                  <th scope="col" className={TH}>Product</th>
                  <th scope="col" className={TH}>Status</th>
                  <th scope="col" className={TH}>Inventory</th>
                  <th scope="col" className={TH}>Category</th>
                  <th scope="col" className={`${TH} text-right`}>Price</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {rows.map((product) => {
                  const badge = STATUS_BADGE[product.status] ?? STATUS_BADGE.draft;
                  const imported = store.importedIds.has(product.id);
                  return (
                    <tr key={product.id} onClick={() => router.push(`/products/${product.id}`)} className={`${ROW_LINK} ${selected.has(product.id) ? "bg-brand-tint/60" : ""}`}>
                      <td className={TD} onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${product.title}`}
                          checked={selected.has(product.id)}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              next.has(product.id) ? next.delete(product.id) : next.add(product.id);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <ProductThumb product={product} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link href={`/products/${product.id}`} onClick={(event) => event.stopPropagation()} className="truncate font-medium hover:underline">
                                {product.title}
                              </Link>
                              {imported ? <Badge tone="gold">Imported</Badge> : product.isNew ? <Badge tone="gold">New</Badge> : null}
                            </div>
                            <span className="font-mono text-xs text-muted">{product.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className={TD}>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>
                        <InventoryText product={product} row={store.inventoryById.get(product.id)} />
                      </td>
                      <td className={`${TD} text-muted`}>{subcategoryLabel(product.subcategory)}</td>
                      <td className={`${TD} text-right font-mono tabular-nums`}>
                        {product.fulfillment === "made_to_order" ? <span className="text-muted">from </span> : null}
                        {formatINR(product.price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableScroll>
          )}
        </div>
        {filtered.length > 0 ? (
          <ClientPagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPage={(next) => setParams({ page: next === 1 ? null : next })} />
        ) : null}
      </Card>

      {importing ? <ImportProductsModal onClose={() => setImporting(false)} /> : null}
    </Page>
  );
}
