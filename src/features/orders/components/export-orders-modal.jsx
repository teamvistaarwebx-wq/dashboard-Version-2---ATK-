"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { downloadText, toCsv } from "@/lib/csv";
import { formatIstDateTime, formatNumber } from "@/lib/format";
import { fulfillmentBadge, paymentBadge } from "../lib/order-status";

/**
 * Export as CSV: the page on screen, everything matching the filters, or the
 * rows ticked in the table. Money is written in rupees (not paise) so the
 * sheet adds up in Excel without dividing by 100.
 */
const COLUMNS = [
  { label: "Order", value: (o) => o.orderNumber },
  { label: "Date (IST)", value: (o) => formatIstDateTime(o.createdAt, { withYear: true }) },
  { label: "Customer", value: (o) => o.contact.fullName },
  { label: "Email", value: (o) => o.contact.email },
  { label: "Phone", value: (o) => o.contact.phone },
  { label: "City", value: (o) => o.address.city },
  { label: "State", value: (o) => o.address.state },
  { label: "Pincode", value: (o) => o.address.pincode },
  { label: "Items", value: (o) => o.itemCount },
  { label: "Products", value: (o) => o.items.map((i) => `${i.quantity} × ${i.title} (${i.sku})`).join(" | ") },
  { label: "Subtotal (₹)", value: (o) => o.amounts.subtotal / 100 },
  { label: "Packaging (₹)", value: (o) => o.amounts.packaging / 100 },
  { label: "Card (₹)", value: (o) => o.amounts.card / 100 },
  { label: "Shipping (₹)", value: (o) => o.amounts.shipping / 100 },
  { label: "Total (₹)", value: (o) => o.amounts.total / 100 },
  { label: "Payment", value: (o) => paymentBadge(o.status).label },
  { label: "Fulfillment", value: (o) => fulfillmentBadge(o.status).label },
  { label: "Payment method", value: (o) => o.payment.method },
];

export function ExportOrdersModal({ pageRows, filteredRows, selectedRows, filename, onClose }) {
  const toast = useToast();
  const name = useId();
  const [scope, setScope] = useState(selectedRows.length ? "selected" : "filtered");

  const options = [
    { value: "page", label: "Current page", count: pageRows.length },
    { value: "filtered", label: "All orders matching filters", count: filteredRows.length },
    { value: "selected", label: "Selected", count: selectedRows.length },
  ];
  const rows = scope === "page" ? pageRows : scope === "selected" ? selectedRows : filteredRows;

  function exportNow() {
    downloadText(filename, toCsv(COLUMNS, rows));
    toast(`Exported ${formatNumber(rows.length)} ${rows.length === 1 ? "order" : "orders"}`);
    onClose();
  }

  return (
    <Modal
      title="Export orders"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={exportNow} disabled={rows.length === 0}>
            Export orders
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-13 font-medium">Export</legend>
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-2.5 text-sm ${option.count === 0 ? "cursor-not-allowed text-subtle" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={scope === option.value}
                disabled={option.count === 0}
                onChange={() => setScope(option.value)}
                className="size-4 accent-brand"
              />
              <span className="flex-1">{option.label}</span>
              <span className="font-mono text-xs text-muted">{formatNumber(option.count)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-13 font-medium">Format</legend>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="radio" checked readOnly className="size-4 accent-brand" />
            CSV for Excel, Numbers or Google Sheets
          </label>
        </fieldset>
      </div>
    </Modal>
  );
}
