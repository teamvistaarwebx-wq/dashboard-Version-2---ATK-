"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, History, Info, Upload } from "lucide-react";
import { useSaveBar } from "@/components/layout/save-bar";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ClientPagination,
  EmptyTable,
  SearchInput,
  TableScroll,
  TBODY,
  TD,
  TH,
  THEAD,
  pageParam,
} from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useUrlState } from "@/hooks/use-url-state";
import { downloadText, toCsv } from "@/lib/csv";
import { formatIstDateTime, formatNumber } from "@/lib/format";
import { ImportProductsModal } from "@/features/catalog/components/import-products-modal";
import { ProductThumb } from "@/features/catalog/components/product-thumb";
import { PAID_STATUSES } from "@/mocks/orders";
import { randInt, rngFor } from "@/mocks/rng";
import { adjustMockInventory, useMockStore } from "@/mocks/store";

const PAGE_SIZE = 25;

const TABS = [
  { value: "all", label: "All", match: () => true },
  { value: "low", label: "Low stock", match: (row) => row.available > 0 && row.available <= row.lowStockThreshold },
  { value: "out", label: "Out of stock", match: (row) => row.available <= 0 },
];

/**
 * Stock counts at Main Warehouse. Stock is created with the product; this
 * page adjusts it. Edit any Available figure and the top bar becomes the save
 * bar; Save writes every changed row at once.
 */
export function InventoryScreen() {
  const store = useMockStore();
  const toast = useToast();
  const [params, setParams] = useUrlState();
  const [drafts, setDrafts] = useState({});
  const [historyFor, setHistoryFor] = useState(null);
  const [importing, setImporting] = useState(false);

  const tab = TABS.find((t) => t.value === params.get("view")) ?? TABS[0];
  const query = (params.get("q") ?? "").toLowerCase();
  const page = pageParam(params.get("page"));

  const searched = store.inventory.filter(
    (row) => !query || row.product.title.toLowerCase().includes(query) || row.sku.toLowerCase().includes(query)
  );
  const tabs = TABS.map((t) => ({ value: t.value, label: t.label, count: searched.filter(t.match).length }));
  const filtered = searched.filter(tab.match);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const changes = Object.entries(drafts)
    .map(([productId, value]) => ({ productId, value, row: store.inventoryById.get(productId) }))
    .filter(({ value, row }) => row && value !== String(row.available));
  const invalid = changes.filter(({ value }) => !/^\d+$/.test(value));

  function save() {
    if (invalid.length) {
      toast(`Enter whole numbers for ${invalid.length} ${invalid.length === 1 ? "product" : "products"}`, { tone: "critical" });
      return;
    }
    adjustMockInventory(
      changes.map(({ productId, value, row }) => ({ productId, onHand: Number(value) + row.committed })),
      store.inventoryById
    );
    toast(`Inventory updated for ${changes.length} ${changes.length === 1 ? "product" : "products"}`);
    setDrafts({});
  }

  useSaveBar({ dirty: changes.length > 0, onSave: save, onDiscard: () => setDrafts({}) });

  function exportInventory() {
    downloadText(
      "atk-inventory.csv",
      toCsv(
        [
          { label: "title", value: (r) => r.product.title },
          { label: "sku", value: (r) => r.sku },
          { label: "warehouse", value: (r) => r.warehouse },
          { label: "committed", value: (r) => r.committed },
          { label: "available", value: (r) => r.available },
          { label: "on_hand", value: (r) => r.onHand },
          { label: "low_stock_alert", value: (r) => r.lowStockThreshold },
        ],
        filtered
      )
    );
    toast(`Exported ${filtered.length} rows`);
  }

  return (
    <Page
      title="Inventory"
      actions={
        <>
          <Button variant="secondary" onClick={() => setImporting(true)}>
            <Upload aria-hidden="true" />
            Import
          </Button>
          <Button variant="secondary" onClick={exportInventory}>
            <Download aria-hidden="true" />
            Export
          </Button>
        </>
      }
    >
      <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 text-13 shadow-card">
        <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
        <p>
          Stock is set when you create a product. Use this page to adjust counts.{" "}
          <span className="text-muted">Import uses the same product CSV and sample as Products.</span>
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-2 border-b border-border px-4 pb-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:pb-0">
          <Tabs label="Stock level" tabs={tabs} value={tab.value} controls="inventory-table" onChange={(value) => setParams({ view: value === "all" ? null : value, page: null })} />
          <SearchInput label="Search inventory" placeholder="Product or SKU" defaultValue={params.get("q") ?? ""} onSearch={(value) => setParams({ q: value, page: null })} className="lg:w-72" />
        </div>

        <div id="inventory-table">
          {rows.length === 0 ? (
            <EmptyTable title="Nothing in this view">{tab.value === "out" ? "Every product has stock." : "Try another search."}</EmptyTable>
          ) : (
            <TableScroll minWidth="50rem">
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={TH}>Product</th>
                  <th scope="col" className={TH}>SKU</th>
                  <th scope="col" className={`${TH} text-right`}>Committed</th>
                  <th scope="col" className={`${TH} w-32`}>Available</th>
                  <th scope="col" className={`${TH} text-right`}>On hand</th>
                  <th scope="col" className={`${TH} w-12`}>
                    <span className="sr-only">History</span>
                  </th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {rows.map((row) => {
                  const value = drafts[row.productId] ?? String(row.available);
                  const changed = value !== String(row.available);
                  const bad = changed && !/^\d+$/.test(value);
                  const onHand = /^\d+$/.test(value) ? Number(value) + row.committed : row.onHand;
                  return (
                    <tr key={row.productId} className={changed ? "bg-brand-tint/50" : ""}>
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <ProductThumb product={row.product} size="sm" />
                          <Link href={`/products/${row.productId}`} className="min-w-0 truncate font-medium hover:underline">
                            {row.product.title}
                          </Link>
                        </div>
                      </td>
                      <td className={`${TD} font-mono text-muted`}>{row.sku}</td>
                      <td className={`${TD} text-right font-mono tabular-nums`}>{row.committed}</td>
                      <td className={TD}>
                        <label htmlFor={`available-${row.productId}`} className="sr-only">
                          Available for {row.product.title}
                        </label>
                        <input
                          id={`available-${row.productId}`}
                          inputMode="numeric"
                          value={value}
                          aria-invalid={bad || undefined}
                          onChange={(event) => setDrafts((current) => ({ ...current, [row.productId]: event.target.value.trim() }))}
                          className={`h-8 w-24 rounded-lg border bg-surface px-2.5 text-right font-mono text-13 outline-none focus-visible:outline-none focus:ring-2 ${
                            bad
                              ? "border-critical focus:ring-critical/15"
                              : row.available <= 0 && !changed
                                ? "border-critical/50 text-critical focus:border-brand focus:ring-brand/15"
                                : "border-border-strong focus:border-brand focus:ring-brand/15"
                          }`}
                        />
                      </td>
                      <td className={`${TD} text-right font-mono tabular-nums`}>{onHand}</td>
                      <td className={TD}>
                        <button
                          type="button"
                          aria-label={`Stock history for ${row.product.title}`}
                          onClick={() => setHistoryFor(row)}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-neutral-bg hover:text-foreground"
                        >
                          <History className="size-4" aria-hidden="true" />
                        </button>
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

      {historyFor ? <HistoryDrawer row={historyFor} onClose={() => setHistoryFor(null)} /> : null}
      {importing ? <ImportProductsModal onClose={() => setImporting(false)} /> : null}
    </Page>
  );
}

/**
 * Stock movements for one SKU: edits made in the prototype, recent sales from
 * the order data, and seeded restocks back to the opening count.
 */
function HistoryDrawer({ row, onClose }) {
  const store = useMockStore();

  const movements = useMemo(() => {
    const list = store.overlay.movements
      .filter((m) => m.productId === row.productId)
      .map((m) => ({ id: m.id, at: m.at, delta: m.delta, label: m.reason === "restock" ? "Stock added" : "Adjusted", note: m.note }));

    if (!row.product.isNew) {
      const since = store.world.now.getTime() - 60 * 24 * 60 * 60 * 1000;
      for (const order of store.orders) {
        if (new Date(order.createdAt).getTime() < since) break;
        if (!PAID_STATUSES.has(order.status)) continue;
        const item = order.items.find((i) => i.sku === row.sku);
        if (item) list.push({ id: order.id, at: order.createdAt, delta: -item.quantity, label: "Sold", note: order.orderNumber });
      }

      const rng = rngFor("restocks", row.sku);
      let at = store.world.now.getTime() - randInt(rng, 3, 12) * 24 * 60 * 60 * 1000;
      for (let index = 0; index < 4; index += 1) {
        list.push({ id: `restock-${index}`, at: new Date(at).toISOString(), delta: randInt(rng, 6, 18), label: "Restocked", note: "Received from weaver cluster" });
        at -= randInt(rng, 14, 24) * 24 * 60 * 60 * 1000;
      }
    }

    return list.toSorted((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 40);
  }, [store, row]);

  return (
    <Drawer title="Stock history" onClose={onClose}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <ProductThumb product={row.product} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.product.title}</p>
          <p className="font-mono text-xs text-muted">
            {row.sku} · {row.available} available · {row.onHand} on hand
          </p>
        </div>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {movements.length === 0 ? <li className="px-4 py-10 text-center text-13 text-muted">No movements yet.</li> : null}
        {movements.map((m) => (
          <li key={`${m.id}-${m.at}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-13">{m.label}</p>
              <p className="truncate text-xs text-muted">
                {formatIstDateTime(m.at, { withYear: true })} · <span className={m.note?.startsWith("AKT-") ? "font-mono" : ""}>{m.note}</span>
              </p>
            </div>
            <span className={`shrink-0 font-mono text-13 tabular-nums ${m.delta > 0 ? "text-success" : m.delta < 0 ? "text-critical" : "text-muted"}`}>
              {m.delta > 0 ? "+" : m.delta < 0 ? "−" : ""}
              {formatNumber(Math.abs(m.delta))}
            </span>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
