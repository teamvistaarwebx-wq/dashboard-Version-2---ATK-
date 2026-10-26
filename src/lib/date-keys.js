import { IST_DATE } from "@/features/dashboard/lib/date-window";

/**
 * Arithmetic on IST calendar days, written as "2026-10-25" keys.
 *
 * Keys are anchored to UTC midnight for the arithmetic, so adding a day is
 * always exactly 24 hours, and only turned back into a real instant with the
 * fixed +05:30 offset at the edges — the same approach as date-window.js.
 * String keys also compare correctly with < and >.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;
const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value) {
  return typeof value === "string" && KEY_PATTERN.test(value) && !Number.isNaN(keyToUtc(value));
}

export function istDateKey(date) {
  return IST_DATE.format(date);
}

export function keyToUtc(key) {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
}

function utcToKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function makeKey(year, month, day) {
  return utcToKey(Date.UTC(year, month - 1, day));
}

export function keyParts(key) {
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), day: Number(key.slice(8, 10)) };
}

export function addDays(key, days) {
  return utcToKey(keyToUtc(key) + days * MS_PER_DAY);
}

/** Whole days from `a` to `b` (b − a). */
export function daysBetween(a, b) {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / MS_PER_DAY);
}

/** 0 = Sunday. */
export function dayOfWeek(key) {
  return new Date(keyToUtc(key)).getUTCDay();
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Same day `n` months away, clamped to the month's length (31 Mar − 1 → 28/29 Feb). */
export function addMonths(key, n) {
  const { year, month, day } = keyParts(key);
  const total = year * 12 + (month - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return makeKey(y, m, Math.min(day, daysInMonth(y, m)));
}

export function monthStart(key) {
  return `${key.slice(0, 7)}-01`;
}

export function monthEnd(key) {
  const { year, month } = keyParts(key);
  return makeKey(year, month, daysInMonth(year, month));
}

export function quarterStart(key) {
  const { year, month } = keyParts(key);
  return makeKey(year, Math.floor((month - 1) / 3) * 3 + 1, 1);
}

export function yearStart(key) {
  return `${key.slice(0, 4)}-01-01`;
}

/** The instant an IST day starts. */
export function dayStart(key) {
  return new Date(keyToUtc(key) - IST_OFFSET_MS);
}

/** Hours and minutes into the IST day for an instant. */
export function istClock(date) {
  const ms = date.getTime() + IST_OFFSET_MS;
  const minutesIntoDay = Math.floor((((ms % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY) / 60000);
  return { hour: Math.floor(minutesIntoDay / 60), minute: minutesIntoDay % 60 };
}

/** IST hour (0–23) of an ISO timestamp. */
export function istHour(iso) {
  return istClock(new Date(iso)).hour;
}

/** IST day key of an ISO timestamp. */
export function istKeyOf(iso) {
  return istDateKey(new Date(iso));
}

/** Inclusive list of keys from `from` to `to`. */
export function eachDay(from, to) {
  const keys = [];
  for (let key = from; key <= to; key = addDays(key, 1)) keys.push(key);
  return keys;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "25 Oct", or "25 Oct 2026" with `year`. */
export function formatKey(key, { year = false } = {}) {
  const { year: y, month, day } = keyParts(key);
  return `${day} ${MONTHS[month - 1]}${year ? ` ${y}` : ""}`;
}

export function monthLabel(year, month) {
  return `${MONTHS_LONG[month - 1]} ${year}`;
}

/**
 * Compact range label in the Indian day-month order:
 * "25 Oct 2026", "1–25 Oct 2026", "28 Sep – 4 Oct 2026", "1 Dec 2025 – 3 Jan 2026".
 */
export function formatKeyRange(from, to) {
  if (from === to) return formatKey(from, { year: true });

  const a = keyParts(from);
  const b = keyParts(to);
  if (a.year === b.year && a.month === b.month) return `${a.day}–${b.day} ${MONTHS[b.month - 1]} ${b.year}`;
  if (a.year === b.year) return `${formatKey(from)} – ${formatKey(to, { year: true })}`;
  return `${formatKey(from, { year: true })} – ${formatKey(to, { year: true })}`;
}
