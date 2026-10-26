const RUPEES = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const RUPEES_WITH_PAISE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

/** Money is stored as integer paise everywhere. */
export function formatPrice(paise) {
  const value = Number(paise);
  if (!Number.isFinite(value)) return "—";

  const rupees = value / 100;
  // Only show paise when there are any — ₹14,559 reads better than ₹14,559.00
  return value % 100 === 0
    ? RUPEES.format(rupees)
    : RUPEES_WITH_PAISE.format(rupees);
}

const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date);
}

/**
 * "pending_payment" → "Pending payment". Status enums are stored as
 * snake_case keys; dropdowns and labels show them as words.
 */
export function capitalize(value) {
  const text = String(value ?? "").replace(/_/g, " ");
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

const DATE_ONLY = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

/** "3 Dec 2026" — a day, where the time would be noise. */
export function formatDate(value) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_ONLY.format(date);
}

const TIME_ONLY = new Intl.DateTimeFormat("en-IN", { timeStyle: "short" });
const DAY_MONTH = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Activity-feed timestamps: "Today, 10:14 am" for the last two days, then a
 * day count, then a date.
 *
 * Counted in calendar days rather than elapsed hours — something from 11pm
 * last night is "Yesterday", not "9 hours ago".
 */
export function formatActivityTime(value) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfThatDay = new Date(date);
  startOfThatDay.setHours(0, 0, 0, 0);

  const daysAgo = Math.round(
    (startOfToday.getTime() - startOfThatDay.getTime()) / MS_PER_DAY
  );

  if (daysAgo <= 0) return `Today, ${TIME_ONLY.format(date)}`;
  if (daysAgo === 1) return `Yesterday, ${TIME_ONLY.format(date)}`;
  if (daysAgo < 7) return `${daysAgo} days ago`;

  return DAY_MONTH.format(date);
}

/** "₹5,90,500" without the paise, for compact figures. */
export function formatCompactPrice(paise) {
  const value = Number(paise);
  if (!Number.isFinite(value)) return "—";

  return RUPEES.format(Math.round(value / 100));
}

const INR_GROUPING = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** "₹1,24,500" from paise — Indian grouping, no paise. */
export function formatINR(paise) {
  const value = Number(paise);
  if (!Number.isFinite(value)) return "—";

  const rupees = Math.round(value / 100);
  return `${rupees < 0 ? "−" : ""}₹${INR_GROUPING.format(Math.abs(rupees))}`;
}

/**
 * Axis labels and tight spaces: "₹1.2L", "₹45K", "₹2.3Cr", "₹900".
 *
 * Lakh and crore rather than M and B — the way everyone in the business
 * actually reads money.
 */
export function formatINRCompact(paise) {
  const value = Number(paise);
  if (!Number.isFinite(value)) return "—";

  const rupees = Math.abs(value / 100);
  const sign = value < 0 ? "−" : "";

  if (rupees >= 1e7) return `${sign}₹${trimDecimal(rupees / 1e7)}Cr`;
  if (rupees >= 1e5) return `${sign}₹${trimDecimal(rupees / 1e5)}L`;
  if (rupees >= 1e3) return `${sign}₹${trimDecimal(rupees / 1e3)}K`;
  return `${sign}₹${Math.round(rupees)}`;
}

/** 1.0 → "1", 1.25 → "1.3", 12.4 → "12" — one decimal only below ten. */
function trimDecimal(value) {
  return value >= 10
    ? String(Math.round(value))
    : String(Math.round(value * 10) / 10);
}

/** Counts with Indian grouping: 1,24,500. */
export function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? INR_GROUPING.format(number) : "—";
}

/**
 * Percentage change between two values, or null when there is no baseline to
 * compare against (dividing by zero would print "Infinity%").
 */
export function percentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** "12%" / "0.4%" — the magnitude only; direction is shown with an arrow. */
export function formatPercent(value, { decimals } = {}) {
  if (value === null || !Number.isFinite(value)) return "—";

  const magnitude = Math.abs(value);
  const places = decimals ?? (magnitude < 10 ? 1 : 0);
  return `${magnitude.toFixed(places).replace(/\.0$/, "")}%`;
}

/**
 * Explicitly IST, so a server render (UTC on Vercel) and the browser agree
 * and hydration does not flip "25 Oct" to "24 Oct" around midnight.
 */
const IST_DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const IST_DATE_TIME_YEAR = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const IST_DATE_ONLY = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const IST_TIME_ONLY = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
});

/** "25 Oct, 1:40 pm" — with the year too when `withYear`. */
export function formatIstDateTime(value, { withYear = false } = {}) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return (withYear ? IST_DATE_TIME_YEAR : IST_DATE_TIME).format(date);
}

/** "25 Oct 2026" from an instant or a YYYY-MM-DD key. */
export function formatIstDate(value) {
  if (!value) return "—";
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00+05:30`)
      : value instanceof Date
        ? value
        : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : IST_DATE_ONLY.format(date);
}

export function formatIstTime(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : IST_TIME_ONLY.format(date);
}
