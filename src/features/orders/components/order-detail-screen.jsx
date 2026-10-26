"use client";

import { useState } from "react";
import { Check, CircleDot, CreditCard, MapPin, Package, Truck, User, X } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ProductThumb } from "@/features/catalog/components/product-thumb";
import { formatINR, formatIstDateTime } from "@/lib/format";
import { randInt, rngFor } from "@/mocks/rng";
import { PAID_STATUSES } from "@/mocks/orders";
import { setMockOrderStatus, useMockStore } from "@/mocks/store";
import { STATUS_OPTIONS, fulfillmentBadge, paymentBadge } from "../lib/order-status";

const MINUTE = 60 * 1000;

/**
 * What happened to an order, newest first. Times are derived from the order
 * itself (seeded), and never run past now — a status moved forward on an
 * order placed this morning does not claim it was delivered next week.
 */
function timeline(order, now) {
  const rng = rngFor("timeline", order.id);
  const placed = new Date(order.createdAt).getTime();
  const cap = (ms) => Math.min(ms, now.getTime());
  const events = [{ icon: CircleDot, text: `Order placed by ${order.contact.fullName}`, at: placed }];
  const paidLike = PAID_STATUSES.has(order.status) || order.status === "cancelled";

  if (paidLike) {
    events.push({ icon: CreditCard, text: `Payment of ${formatINR(order.total)} captured via ${order.payment.method}`, at: cap(placed + randInt(rng, 1, 4) * MINUTE) });
  }
  if (order.status === "payment_failed") {
    events.push({ icon: X, text: "Payment failed at the bank", at: cap(placed + 3 * MINUTE) });
  }
  if (order.status === "expired") {
    events.push({ icon: X, text: "Checkout abandoned; stock hold released", at: cap(placed + 30 * MINUTE) });
  }

  const confirmedAt = cap(placed + randInt(rng, 2, 8) * 60 * MINUTE);
  const shippedAt = cap(confirmedAt + randInt(rng, 20, 40) * 60 * MINUTE);
  const deliveredAt = cap(shippedAt + randInt(rng, 2, 5) * 24 * 60 * MINUTE);

  if (["confirmed", "shipped", "delivered"].includes(order.status)) {
    events.push({ icon: Check, text: "Order confirmed and sent for packing", at: confirmedAt });
  }
  if (order.status === "shipped" || order.status === "delivered") {
    events.push({ icon: Truck, text: `Shipped with Delhivery · AWB ${String(randInt(rng, 1e9, 9e9))}`, at: shippedAt });
  }
  if (order.status === "delivered") {
    events.push({ icon: Package, text: `Delivered to ${order.address.city}`, at: deliveredAt });
  }
  if (order.status === "cancelled") {
    events.push({ icon: X, text: "Cancelled by the customer; refund issued", at: confirmedAt });
  }

  return events.toSorted((a, b) => b.at - a.at);
}

export function OrderDetailScreen({ orderNumber }) {
  const store = useMockStore();
  const toast = useToast();
  const order = store.orders.find((o) => o.orderNumber === String(orderNumber).toUpperCase());
  const [status, setStatus] = useState(order?.status ?? "");

  if (!order) {
    return (
      <Page title="Order not found" backHref="/orders" backLabel="Back to orders">
        <Card>
          <p className="px-4 py-12 text-center text-13 text-muted">There is no order {orderNumber} in the prototype data.</p>
        </Card>
      </Page>
    );
  }

  const payment = paymentBadge(order.status);
  const fulfillment = fulfillmentBadge(order.status);
  const events = timeline(order, store.world.now);
  const { amounts } = order;

  return (
    <Page
      title={<span className="font-mono">{order.orderNumber}</span>}
      backHref="/orders"
      backLabel="Back to orders"
      titleMeta={
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge tone={payment.tone} dot>{payment.label}</Badge>
          <Badge tone={fulfillment.tone} dot>{fulfillment.label}</Badge>
        </span>
      }
      actions={<span className="text-13 text-muted">{formatIstDateTime(order.createdAt, { withYear: true })}</span>}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title={`${order.itemCount} ${order.itemCount === 1 ? "item" : "items"}`}>
            <ul className="mt-2 divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.sku} className="flex items-center gap-3 px-4 py-3">
                  <ProductThumb product={store.productById.get(item.productId) ?? item} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.title}</p>
                    <p className="font-mono text-xs text-muted">{item.sku}</p>
                  </div>
                  <p className="shrink-0 font-mono text-13 text-muted tabular-nums">
                    {formatINR(item.price)} × {item.quantity}
                  </p>
                  <p className="w-24 shrink-0 text-right font-mono text-sm tabular-nums">{formatINR(item.price * item.quantity)}</p>
                </li>
              ))}
              {order.packaging ? (
                <li className="flex items-center justify-between gap-3 px-4 py-3 text-13">
                  <span>Gift packaging · {order.packaging.name}</span>
                  <span className="font-mono tabular-nums">{formatINR(order.packaging.price)}</span>
                </li>
              ) : null}
              {order.card ? (
                <li className="flex items-center justify-between gap-3 px-4 py-3 text-13">
                  <span>
                    {order.card.name}
                    <span className="block text-xs text-muted">“{order.cardMessage}”</span>
                  </span>
                  <span className="font-mono tabular-nums">{formatINR(order.card.price)}</span>
                </li>
              ) : null}
            </ul>
          </Card>

          <Card title="Timeline">
            <ol className="relative mx-4 mb-4 mt-3 flex flex-col gap-4 border-l border-border pl-5">
              {events.map((event, index) => {
                const Icon = event.icon;
                return (
                  <li key={index} className="relative">
                    <span className="absolute -left-[1.95rem] top-0 flex size-5 items-center justify-center rounded-full border border-border bg-surface text-muted">
                      <Icon className="size-3" aria-hidden="true" />
                    </span>
                    <p className="text-13">{event.text}</p>
                    <p className="text-xs text-muted">{formatIstDateTime(new Date(event.at), { withYear: true })}</p>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Status">
            <div className="flex flex-col gap-2 p-4 pt-3">
              <span id="order-status-label" className="sr-only">
                Order status
              </span>
              <Select id="order-status" aria-labelledby="order-status-label" value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />
              <Button
                disabled={status === order.status}
                onClick={() => {
                  setMockOrderStatus(order.id, status);
                  toast(`Order ${order.orderNumber} marked ${STATUS_OPTIONS.find((o) => o.value === status)?.label.toLowerCase()}`);
                }}
              >
                Update status
              </Button>
            </div>
          </Card>

          <Card title={<span className="flex items-center gap-2"><User className="size-4 text-muted" aria-hidden="true" />Customer</span>}>
            <div className="flex flex-col gap-0.5 p-4 pt-2 text-13">
              <p className="font-medium">{order.contact.fullName}</p>
              <p className="break-all text-brand-text">{order.contact.email}</p>
              <p className="font-mono text-muted">{order.contact.phone}</p>
            </div>
          </Card>

          <Card title={<span className="flex items-center gap-2"><MapPin className="size-4 text-muted" aria-hidden="true" />Shipping address</span>}>
            <address className="flex flex-col gap-0.5 p-4 pt-2 text-13 not-italic">
              <span>{order.contact.fullName}</span>
              <span>{order.address.line1}</span>
              <span>{order.address.line2}</span>
              <span>
                {order.address.city}, {order.address.state} <span className="font-mono">{order.address.pincode}</span>
              </span>
              <span>India</span>
            </address>
          </Card>

          <Card title="Payment">
            <dl className="flex flex-col gap-1.5 p-4 pt-3 text-13">
              {[
                ["Subtotal", amounts.subtotal],
                ["Gift packaging", amounts.packaging],
                ["Greeting card", amounts.card],
                ["Shipping", amounts.shipping],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-mono tabular-nums">{value ? formatINR(value) : "—"}</dd>
                </div>
              ))}
              <div className="mt-1 flex justify-between gap-3 border-t border-border pt-2 font-medium">
                <dt>Total</dt>
                <dd className="font-mono tabular-nums">{formatINR(amounts.total)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-xs text-muted">
                <dt>{order.payment.method} · Razorpay</dt>
                <dd className="font-mono">{order.payment.razorpayPaymentId ?? "No payment"}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </Page>
  );
}
