import { dayOfWeek, daysBetween, festiveLift } from "./calendar";
import { STATE_WEIGHTS } from "./people";
import { randFloat, rngFor } from "./rng";

/**
 * Storefront visitors.
 *
 * ~400–700 a day: a slow climb over the two years, a weekend lift, a festive
 * bump before Diwali and Raksha Bandhan, and ±10% day-to-day noise. Growth is
 * counted from a fixed epoch, not from "today", so a given date always has
 * the same number no matter when the page is opened.
 */
const EPOCH = "2024-09-01";

/**
 * Share of a day's visitors in each IST hour. Quiet overnight, a lunchtime
 * shoulder, and the evening peak when people shop from the sofa.
 */
export const HOURLY_CURVE = (() => {
  const raw = [
    0.7, 0.45, 0.28, 0.2, 0.2, 0.32, 0.6, 1.1, 1.8, 2.4, 2.9, 3.2,
    3.4, 3.3, 3.1, 3.0, 3.1, 3.4, 3.8, 4.3, 4.8, 4.9, 3.9, 2.1,
  ];
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map((value) => value / total);
})();

/** Visitors for a whole IST day. */
export function dailyVisitors(key) {
  const rng = rngFor("visitors", key);
  const growth = 390 + Math.max(0, daysBetween(EPOCH, key)) * 0.3;
  const weekday = dayOfWeek(key);
  const weekend = weekday === 0 || weekday === 6 ? 1.15 : weekday === 5 ? 1.05 : 1;

  return Math.round(growth * weekend * festiveLift(key) * randFloat(rng, 0.9, 1.1));
}

/** The day's visitors split across 24 hours (sums to dailyVisitors). */
export function hourlyVisitors(key) {
  const rng = rngFor("visitors-hourly", key);
  const total = dailyVisitors(key);
  const weights = HOURLY_CURVE.map((share) => share * randFloat(rng, 0.8, 1.2));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);

  const hours = weights.map((weight) => Math.floor((total * weight) / weightSum));
  // Hand the rounding remainder to the evening peak so the day still sums.
  hours[20] += total - hours.reduce((sum, value) => sum + value, 0);
  return hours;
}

/**
 * Visitors so far on a day that is still running: full hours, plus the
 * current hour pro-rated by the minute.
 */
export function visitorsUntil(key, hour, minute) {
  const hours = hourlyVisitors(key);
  let total = 0;

  for (let h = 0; h < hour; h += 1) total += hours[h];
  total += Math.round((hours[hour] * minute) / 60);
  return total;
}

const STATE_SHARES = (() => {
  const total = STATE_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  return STATE_WEIGHTS.map(([state, weight]) => [state, weight / total]);
})();

/**
 * One day's visitors by state, as [[state, count], …]. Each state's share
 * wobbles a little day to day so the % changes in the region table move.
 */
export function visitorsByState(key, total = dailyVisitors(key)) {
  const rng = rngFor("visitors-state", key);
  return STATE_SHARES.map(([state, share]) => [
    state,
    Math.round(total * share * randFloat(rng, 0.8, 1.2)),
  ]);
}
