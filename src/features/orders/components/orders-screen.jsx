"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Change } from "@/components/ui/change";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Tabs } from "@/components/ui/tabs";
import { useUrlState } from "@/hooks/use-url-state";
import { formatKeyRange } from "@/lib/date-keys";
import { formatINR, formatIstDateTime, formatNumber, percentChange } from "@/lib/format";
import { useMockStore } from "@/mocks/store";
import { PAID_STATUSES } from "@/mocks/orders";
import { ORDER_PRESET_IDS, comparisonRange, parseRange } from "@/features/dashboard/lib/date-range";
import { ORDER_TABS, fulfillmentBadge, paymentBadge } from "../lib/order-status";
import { ExportOrdersModal } from "./export-orders-modal";

const PAGE_SIZE = 25;

/**
 * Orders for a date range, in IST days. The range filters everything on the
 * screen — the summary strip, the tab counts and the table — so Today and
 * Last 7 days visibly differ, and the strip's order count always equals the
 * "All" tab.
 */
function summarise(orders) {
  let items = 0;
  let revenue = 0;
  let paid = 0;
  let fulfilled = 0;

  for (const order of orders) {
    items += order.itemCount;
    if (!PAID_STATUSES.has(order.status)) continue;
    paid += 1;
    revenue += order.total;
    if (order.status === "shipped" || order.status === "delivered") fulfilled += 1;
  }

  return { orders: orders.length, items, revenue, fulfilledRate: paid ? (fulfilled / paid) * 100 : 0 };
}

function matchesSearch(order, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const digits = q.replace(/\D/g, "");
  return (
    order.orderNumber.toLowerCase().includes(q) ||
    order.contact.fullName.toLowerCase().includes(q) ||
    order.contact.email.includes(q) ||
    (digits.length >= 4 && order.contact.phone.replace(/\D/g, "").includes(digits))
  );
}

export function OrdersScreen() {
  const store = useMockStore();
  const { world } = store;
  const router = useRouter();
  const [params, setParams] = useUrlState();
  const [selected, setSelected] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);

  const { from, to } = parseRange(params, { today: world.todayKey, min: world.startKey, fallback: "last30" });
  const tab = ORDER_TABS.find((t) => t.value === params.get("status")) ?? ORDER_TABS[0];
  const query = params.get("q") ?? "";
  const page = pageParam(params.get("page"));

  const { inRange, summary, previousSummary, previousRange } = useMemo(() => {
    const previous = comparisonRange(from, to, "previous", world.todayKey);
    const current = store.orders.filter((o) => o.dayKey >= from && o.dayKey <= to);
    const before = store.orders.filter((o) => o.dayKey >= previous.from && o.dayKey <= previous.to);
    return { inRange: current, summary: summarise(current), previousSummary: summarise(before), previousRange: previous };
  }, [store.orders, from, to, world.todayKey]);

  const tabs = ORDER_TABS.map((t) => ({ value: t.value, label: t.label, count: inRange.filter((o) => t.match(o.status)).length }));
  const filtered = inRange.filter((order) => tab.match(order.status) && matchesSearch(order, query));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedRows = filtered.filter((order) => selected.has(order.id));
  const allOnPage = pageRows.length > 0 && pageRows.every((order) => selected.has(order.id));
  const someOnPage = pageRows.some((order) => selected.has(order.id));

  function toggle(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Set(current);
      for (const order of pageRows) {
        if (allOnPage) next.delete(order.id);
        else next.add(order.id);
      }
      return next;
    });
  }

  const strip = [
    { label: "Orders", value: formatNumber(summary.orders), change: percentChange(summary.orders, previousSummary.orders) },
    { label: "Items", value: formatNumber(summary.items), change: percentChange(summary.items, previousSummary.items) },
    { label: "Revenue", value: formatINR(summary.revenue), change: percentChange(summary.revenue, previousSummary.revenue) },
    {
      label: "Fulfilled",
      value: `${summary.fulfilledRate.toFixed(0)}%`,
      change: percentChange(summary.fulfilledRate, previousSummary.fulfilledRate),
    },
  ];

  return (
    <Page
      title="Orders"
      actions={
        <Button variant="secondary" onClick={() => setExporting(true)}>
          <Download aria-hidden="true" />
          Export
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <DateRangePicker
          from={from}
          to={to}
          today={world.todayKey}
          min={world.startKey}
          presetIds={ORDER_PRESET_IDS}
          align="start"
          label="Order date"
          onApply={(range) => {
            setSelected(new Set());
            setParams({ from: range.from, to: range.to, page: null });
          }}
        />
        <span className="text-13 text-muted">{formatKeyRange(from, to)}</span>
      </div>

      <Card className="mb-4">
        <dl className="grid grid-cols-2 sm:grid-cols-4">
          {strip.map((item, index) => (
            <div
              key={item.label}
              className={`flex flex-col gap-1 px-5 py-4 ${index % 2 ? "" : "border-r"} border-border sm:border-r sm:last:border-r-0 ${
                index < 2 ? "border-b sm:border-b-0" : ""
              }`}
            >
              <dt className="text-13 text-muted">{item.label}</dt>
              <dd className="text-2xl font-semibold tracking-tight tabular-nums">{item.value}</dd>
              <dd className="flex items-center gap-1.5 text-xs text-muted">
                <Change value={item.change} />
                <span className="truncate">vs {formatKeyRange(previousRange.from, previousRange.to)}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <div className="flex flex-col gap-2 border-b border-border px-4 pb-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:pb-0">
          <Tabs
            label="Order status"
            tabs={tabs}
            value={tab.value}
            controls="orders-table"
            onChange={(value) => setParams({ status: value === "all" ? null : value, page: null })}
          />
          <SearchInput
            label="Search orders"
            placeholder="Order number, customer, phone or email"
            defaultValue={query}
            onSearch={(value) => setParams({ q: value, page: null })}
            className="lg:w-80"
          />
        </div>

        <div id="orders-table">
          {pageRows.length === 0 ? (
            <EmptyTable title="No orders match">Try another date range, tab or search.</EmptyTable>
          ) : (
            <TableScroll minWidth="56rem">
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={`${TH} w-10`}>
                    <Checkbox
                      aria-label="Select all orders on this page"
                      checked={allOnPage}
                      indeterminate={!allOnPage && someOnPage}
                      onChange={togglePage}
                    />
                  </th>
                  <th scope="col" className={TH}>Order</th>
                  <th scope="col" className={TH}>Date</th>
                  <th scope="col" className={TH}>Customer</th>
                  <th scope="col" className={`${TH} text-right`}>Total</th>
                  <th scope="col" className={TH}>Payment</th>
                  <th scope="col" className={TH}>Fulfillment</th>
                  <th scope="col" className={`${TH} text-right`}>Items</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {pageRows.map((order) => {
                  const payment = paymentBadge(order.status);
                  const fulfillment = fulfillmentBadge(order.status);
                  const isSelected = selected.has(order.id);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/orders/${order.orderNumber}`)}
                      className={`${ROW_LINK} ${isSelected ? "bg-brand-tint/60" : ""}`}
                    >
                      <td className={TD} onClick={(event) => event.stopPropagation()}>
                        <Checkbox aria-label={`Select ${order.orderNumber}`} checked={isSelected} onChange={() => toggle(order.id)} />
                      </td>
                      <td className={TD}>
                        <Link
                          href={`/orders/${order.orderNumber}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-mono font-medium hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className={`${TD} whitespace-nowrap text-muted`}>{formatIstDateTime(order.createdAt)}</td>
                      <td className={TD}>
                        <span className="block truncate">{order.contact.fullName}</span>
                        <span className="block truncate text-xs text-muted">{order.address.city}</span>
                      </td>
                      <td className={`${TD} text-right font-mono tabular-nums`}>{formatINR(order.total)}</td>
                      <td className={TD}>
                        <Badge tone={payment.tone} dot>{payment.label}</Badge>
                      </td>
                      <td className={TD}>
                        <Badge tone={fulfillment.tone} dot>{fulfillment.label}</Badge>
                      </td>
                      <td className={`${TD} text-right font-mono tabular-nums`}>{order.itemCount}</td>
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

      {selectedRows.length ? (
        <p className="mt-2 text-13 text-muted" role="status">
          {selectedRows.length} selected ·{" "}
          <button type="button" className="text-brand-text hover:underline" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </p>
      ) : null}

      {exporting ? (
        <ExportOrdersModal
          pageRows={pageRows}
          filteredRows={filtered}
          selectedRows={selectedRows}
          filename={`atk-orders-${from}-to-${to}.csv`}
          onClose={() => setExporting(false)}
        />
      ) : null}
    </Page>
  );
}
