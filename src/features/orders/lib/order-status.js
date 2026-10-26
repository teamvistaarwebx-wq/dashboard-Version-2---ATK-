import { fulfillmentStatus, paymentStatus } from "@/mocks/orders";

/** Pill wording and tone for an order's payment and fulfilment. */
export const PAYMENT_BADGE = {
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Payment pending", tone: "warning" },
  failed: { label: "Failed", tone: "critical" },
  refunded: { label: "Refunded", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};

export const FULFILLMENT_BADGE = {
  unfulfilled: { label: "Unfulfilled", tone: "warning" },
  shipped: { label: "Shipped", tone: "brand" },
  delivered: { label: "Delivered", tone: "success" },
  on_hold: { label: "On hold", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function paymentBadge(status) {
  return PAYMENT_BADGE[paymentStatus(status)];
}

export function fulfillmentBadge(status) {
  return FULFILLMENT_BADGE[fulfillmentStatus(status)];
}

/** The status tabs on Orders, as filters over the raw order status. */
export const ORDER_TABS = [
  { value: "all", label: "All", match: () => true },
  { value: "unfulfilled", label: "Unfulfilled", match: (s) => s === "paid" || s === "confirmed" },
  { value: "pending", label: "Payment pending", match: (s) => s === "pending_payment" },
  { value: "shipped", label: "Shipped", match: (s) => s === "shipped" },
  { value: "delivered", label: "Delivered", match: (s) => s === "delivered" },
  { value: "cancelled", label: "Cancelled", match: (s) => s === "cancelled" || s === "expired" || s === "payment_failed" },
];

/** What staff can move an order to from the detail page. */
export const STATUS_OPTIONS = [
  { value: "pending_payment", label: "Payment pending" },
  { value: "paid", label: "Paid" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];
