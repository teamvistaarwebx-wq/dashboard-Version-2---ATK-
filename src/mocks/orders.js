import { PAID_ORDER_STATUS_VALUES } from "@/constants/enums";
import { dayStart, daysBetween, festiveLift } from "./calendar";
import { ORDERABLE_PRODUCTS } from "./catalog";
import { makeAddress, makePerson, pickState } from "./people";
import { pickWeighted, randFloat, randInt, rngFor } from "./rng";
import { dailyVisitors, HOURLY_CURVE } from "./traffic";

/**
 * Orders, generated one IST day at a time from that day's visitors at a
 * 1.6–2.6% conversion rate. Same shape as the Order model (contact, address,
 * items, amounts, status, payment), money in paise.
 */

const EPOCH = "2024-09-01";
const HOUR_WEIGHTS = HOURLY_CURVE.map((share, hour) => [hour, share]);
const PRODUCT_WEIGHTS = ORDERABLE_PRODUCTS.map((p) => [p, p.popularity]);

const PACKAGING = [
  { name: "Handwoven jute box", price: 25000 },
  { name: "Silk-lined keepsake box", price: 45000 },
];
const CARD = { name: "Printed greeting card", price: 15000 };
const FREE_SHIPPING_FROM = 200000;
const SHIPPING_FEE = 12000;

/** Revenue counts these and nothing else — same as the real dashboard. */
export const PAID_STATUSES = new Set(PAID_ORDER_STATUS_VALUES);

export function conversionRate(key) {
  const rng = rngFor("conversion", key);
  const festive = (festiveLift(key) - 1) / 0.75;
  return Math.min(0.026, randFloat(rng, 0.016, 0.024) + festive * 0.004);
}

export function orderCountForDay(key) {
  return Math.round(dailyVisitors(key) * conversionRate(key));
}

/**
 * Status by age: today's orders are still being paid for and packed, last
 * week's are on a truck, anything older has arrived (or fell through).
 */
function statusForAge(rng, age) {
  if (age <= 0) {
    return pickWeighted(rng, [["pending_payment", 16], ["payment_failed", 4], ["paid", 58], ["confirmed", 22]]);
  }
  if (age <= 2) {
    return pickWeighted(rng, [["expired", 5], ["payment_failed", 3], ["paid", 22], ["confirmed", 40], ["shipped", 30]]);
  }
  if (age <= 6) {
    return pickWeighted(rng, [["expired", 5], ["cancelled", 3], ["confirmed", 8], ["shipped", 50], ["delivered", 34]]);
  }
  return pickWeighted(rng, [["expired", 5], ["payment_failed", 2], ["cancelled", 3], ["delivered", 90]]);
}

function makeItems(rng) {
  const lineCount = pickWeighted(rng, [[1, 62], [2, 28], [3, 10]]);
  const chosen = new Map();

  while (chosen.size < lineCount) {
    const product = pickWeighted(rng, PRODUCT_WEIGHTS);
    if (chosen.has(product.id)) continue;

    chosen.set(product.id, {
      productId: product.id,
      sku: product.sku,
      title: product.title,
      swatch: product.swatch,
      subcategory: product.subcategory,
      price: product.price,
      quantity: pickWeighted(rng, [[1, 80], [2, 15], [3, 5]]),
    });
  }

  return [...chosen.values()];
}

function makeOrder(key, index, age) {
  const rng = rngFor("order", key, index);
  const hour = pickWeighted(rng, HOUR_WEIGHTS);
  const minute = randInt(rng, 0, 59);
  const createdAt = new Date(dayStart(key).getTime() + (hour * 60 + minute) * 60000 + randInt(rng, 0, 59) * 1000);

  const state = pickState(rng);
  const contact = makePerson(rng);
  const items = makeItems(rng);
  const packaging = rng() < 0.4 ? PACKAGING[rng() < 0.7 ? 0 : 1] : null;
  const card = rng() < 0.3 ? CARD : null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  const amounts = {
    subtotal,
    packaging: packaging?.price ?? 0,
    card: card?.price ?? 0,
    shipping,
    total: subtotal + (packaging?.price ?? 0) + (card?.price ?? 0) + shipping,
  };

  const status = statusForAge(rng, age);
  const year = key.slice(0, 4);
  const sequence = 100000 + daysBetween(EPOCH, key) * 40 + index;

  return {
    id: `AKT-${year}-${sequence}`,
    orderNumber: `AKT-${year}-${sequence}`,
    dayKey: key,
    createdAt: createdAt.toISOString(),
    contact,
    address: makeAddress(rng, state),
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    packaging,
    card,
    cardMessage: card ? "With warm wishes this festive season." : "",
    amounts,
    total: amounts.total,
    currency: "INR",
    status,
    payment: {
      provider: "razorpay",
      method: pickWeighted(rng, [["UPI", 62], ["Card", 24], ["Netbanking", 10], ["Wallet", 4]]),
      razorpayPaymentId:
        status === "pending_payment" || status === "expired"
          ? null
          : `pay_${Math.floor(rng() * 36 ** 7).toString(36).padStart(7, "0")}${Math.floor(rng() * 36 ** 7).toString(36).padStart(7, "0")}`,
    },
  };
}

/**
 * Every order placed on `key`, oldest first. `age` is days before today, so
 * status is relative to now. Pass `until` (an instant) for a day still in
 * progress — orders timed after it have not happened yet.
 */
export function ordersForDay(key, age, until) {
  const count = orderCountForDay(key);
  const orders = [];

  for (let index = 0; index < count; index += 1) {
    const order = makeOrder(key, index, age);
    if (until && new Date(order.createdAt) > until) continue;
    orders.push(order);
  }

  return orders.toSorted((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** Payment pill: what happened to the money. */
export function paymentStatus(status) {
  if (PAID_STATUSES.has(status)) return "paid";
  if (status === "pending_payment") return "pending";
  if (status === "payment_failed") return "failed";
  if (status === "cancelled") return "refunded";
  return "expired";
}

/** Fulfilment pill: where the parcel is. */
export function fulfillmentStatus(status) {
  if (status === "paid" || status === "confirmed") return "unfulfilled";
  if (status === "shipped") return "shipped";
  if (status === "delivered") return "delivered";
  if (status === "pending_payment") return "on_hold";
  return "cancelled";
}
