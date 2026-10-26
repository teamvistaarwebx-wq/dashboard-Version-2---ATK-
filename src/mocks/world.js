import { addDays, istClock, istDateKey } from "./calendar";
import { BASE_PRODUCTS } from "./catalog";
import { inquiriesForDay } from "./inquiries";
import { ordersForDay } from "./orders";

/**
 * Everything generated, as of one instant.
 *
 * ~25 months of history so "same period last year" works for any range up to
 * a year. Days before today never change once generated, so they are cached
 * per calendar day; only today's partial day is rebuilt for a new `now`.
 */
export const HISTORY_DAYS = 760;

let pastCache = { todayKey: null, value: null };
let worldCache = { nowIso: null, value: null };

function buildPast(todayKey) {
  const startKey = addDays(todayKey, -(HISTORY_DAYS - 1));
  const ordersByDay = new Map();
  const inquiriesByDay = new Map();

  for (let age = HISTORY_DAYS - 1; age >= 1; age -= 1) {
    const key = addDays(todayKey, -age);
    ordersByDay.set(key, ordersForDay(key, age));
    inquiriesByDay.set(key, inquiriesForDay(key, age));
  }

  return { startKey, ordersByDay, inquiriesByDay };
}

export function getWorld(nowIso) {
  if (worldCache.nowIso === nowIso) return worldCache.value;

  const now = new Date(nowIso);
  const todayKey = istDateKey(now);

  if (pastCache.todayKey !== todayKey) {
    pastCache = { todayKey, value: buildPast(todayKey) };
  }
  const past = pastCache.value;

  const ordersByDay = new Map(past.ordersByDay);
  ordersByDay.set(todayKey, ordersForDay(todayKey, 0, now));

  const inquiriesByDay = new Map(past.inquiriesByDay);
  inquiriesByDay.set(todayKey, inquiriesForDay(todayKey, 0, now));

  // Newest first — the order every list wants.
  const orders = [];
  const inquiries = [];
  for (let age = 0; age < HISTORY_DAYS; age += 1) {
    const key = addDays(todayKey, -age);
    const dayOrders = ordersByDay.get(key) ?? [];
    for (let i = dayOrders.length - 1; i >= 0; i -= 1) orders.push(dayOrders[i]);
    const dayInquiries = inquiriesByDay.get(key) ?? [];
    for (let i = dayInquiries.length - 1; i >= 0; i -= 1) inquiries.push(dayInquiries[i]);
  }

  // Units sitting in paid-but-unshipped orders, per SKU.
  const committedBySku = new Map();
  for (const order of orders) {
    if (order.status !== "paid" && order.status !== "confirmed") continue;
    for (const item of order.items) {
      committedBySku.set(item.sku, (committedBySku.get(item.sku) ?? 0) + item.quantity);
    }
  }

  const value = {
    nowIso,
    now,
    todayKey,
    clock: istClock(now),
    startKey: past.startKey,
    products: BASE_PRODUCTS,
    orders,
    ordersByDay,
    inquiries,
    inquiriesByDay,
    committedBySku,
  };

  worldCache = { nowIso, value };
  return value;
}
