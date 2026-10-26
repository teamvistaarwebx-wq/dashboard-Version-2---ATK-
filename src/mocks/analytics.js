import { addDays, daysBetween, eachDay, istHour } from "@/lib/date-keys";
import { PAID_STATUSES } from "./orders";
import { STATES } from "./people";
import { dailyVisitors, hourlyVisitors, visitorsByState, visitorsUntil } from "./traffic";

/**
 * Read-side numbers for Home: totals, chart series and tables for any range.
 *
 * Revenue and orders count paid, confirmed, shipped and delivered orders only
 * (PAID_ORDER_STATUS_VALUES), like the real dashboard. Conversion is paid
 * orders over visitors. Per-day figures are cached per world, so switching
 * metric tabs or ranges does not re-walk every order.
 */

export const METRICS = [
  { id: "sales", label: "Total sales", kind: "inr" },
  { id: "orders", label: "Orders", kind: "number" },
  { id: "aov", label: "Average order value", kind: "inr" },
  { id: "visitors", label: "Visitors", kind: "number" },
  { id: "conversion", label: "Conversion rate", kind: "percent" },
];

const caches = new WeakMap();

function cacheFor(world) {
  let cache = caches.get(world);
  if (!cache) {
    cache = { days: new Map() };
    caches.set(world, cache);
  }
  return cache;
}

function emptyAgg() {
  return { visitors: 0, orders: 0, revenue: 0, placed: 0 };
}

function addAgg(target, source) {
  target.visitors += source.visitors;
  target.orders += source.orders;
  target.revenue += source.revenue;
  target.placed += source.placed;
  return target;
}

function visitorsOn(world, key) {
  if (key > world.todayKey || key < world.startKey) return 0;
  if (key === world.todayKey) return visitorsUntil(key, world.clock.hour, world.clock.minute);
  return dailyVisitors(key);
}

export function dayStats(world, key) {
  const cache = cacheFor(world).days;
  const hit = cache.get(key);
  if (hit) return hit;

  const agg = emptyAgg();
  agg.visitors = visitorsOn(world, key);
  for (const order of world.ordersByDay.get(key) ?? []) {
    agg.placed += 1;
    if (!PAID_STATUSES.has(order.status)) continue;
    agg.orders += 1;
    agg.revenue += order.total;
  }

  cache.set(key, agg);
  return agg;
}

export function rangeTotals(world, from, to) {
  const agg = emptyAgg();
  for (const key of eachDay(from, to)) addAgg(agg, dayStats(world, key));
  return agg;
}

export function metricValue(metric, agg) {
  switch (metric) {
    case "sales":
      return agg.revenue;
    case "orders":
      return agg.orders;
    case "aov":
      return agg.orders ? Math.round(agg.revenue / agg.orders) : 0;
    case "visitors":
      return agg.visitors;
    case "conversion":
      return agg.visitors ? (agg.orders / agg.visitors) * 100 : 0;
    default:
      return 0;
  }
}

/** Hourly for a single day, daily up to 92 days, weekly beyond. */
export function granularityFor(from, to) {
  if (from === to) return "hour";
  return daysBetween(from, to) + 1 <= 92 ? "day" : "week";
}

/**
 * The range cut into chart buckets, each with its aggregate. Today's hours
 * after the current one come back `future: true` so the line can stop there.
 */
export function buckets(world, from, to, granularity = granularityFor(from, to)) {
  if (granularity === "hour") {
    const key = from;
    const isToday = key === world.todayKey;
    const hours = key >= world.startKey ? hourlyVisitors(key) : new Array(24).fill(0);
    const perHour = Array.from({ length: 24 }, () => emptyAgg());

    for (const order of world.ordersByDay.get(key) ?? []) {
      const bucket = perHour[istHour(order.createdAt)];
      bucket.placed += 1;
      if (!PAID_STATUSES.has(order.status)) continue;
      bucket.orders += 1;
      bucket.revenue += order.total;
    }

    return perHour.map((agg, hour) => {
      const future = isToday && hour > world.clock.hour;
      agg.visitors =
        isToday && hour === world.clock.hour
          ? Math.round((hours[hour] * world.clock.minute) / 60)
          : future
            ? 0
            : hours[hour];
      return { start: key, end: key, hour, agg, future };
    });
  }

  const step = granularity === "week" ? 7 : 1;
  const result = [];
  for (let start = from; start <= to; start = addDays(start, step)) {
    const end = step === 1 ? start : addDays(start, step - 1) > to ? to : addDays(start, step - 1);
    result.push({ start, end, agg: rangeTotals(world, start, end), future: false });
  }
  return result;
}

export function metricSeries(world, metric, from, to, granularity) {
  return buckets(world, from, to, granularity).map((bucket) => ({
    ...bucket,
    value: bucket.future ? null : metricValue(metric, bucket.agg),
  }));
}

/**
 * Visitors and inquiries per state for a range, with the comparison range's
 * figures alongside for the % change column.
 */
export function regionTable(world, from, to, compare) {
  const rows = new Map(STATES.map((state) => [state, { state, visitors: 0, inquiries: 0, visitorsPrev: 0, inquiriesPrev: 0 }]));

  function collect(rangeFrom, rangeTo, visitorsKey, inquiriesKey) {
    for (const key of eachDay(rangeFrom, rangeTo)) {
      if (key < world.startKey || key > world.todayKey) continue;
      for (const [state, count] of visitorsByState(key, visitorsOn(world, key))) {
        rows.get(state)[visitorsKey] += count;
      }
      for (const inquiry of world.inquiriesByDay.get(key) ?? []) {
        const row = rows.get(inquiry.state);
        if (row) row[inquiriesKey] += 1;
      }
    }
  }

  collect(from, to, "visitors", "inquiries");
  if (compare) collect(compare.from, compare.to, "visitorsPrev", "inquiriesPrev");
  return [...rows.values()];
}

/** Best sellers by revenue over a range: units and revenue per product. */
export function topProducts(world, from, to, limit = 5) {
  const byProduct = new Map();

  for (const key of eachDay(from, to)) {
    for (const order of world.ordersByDay.get(key) ?? []) {
      if (!PAID_STATUSES.has(order.status)) continue;
      for (const item of order.items) {
        const row = byProduct.get(item.productId) ?? { productId: item.productId, title: item.title, sku: item.sku, swatch: item.swatch, units: 0, revenue: 0 };
        row.units += item.quantity;
        row.revenue += item.price * item.quantity;
        byProduct.set(item.productId, row);
      }
    }
  }

  return [...byProduct.values()].toSorted((a, b) => b.revenue - a.revenue).slice(0, limit);
}
