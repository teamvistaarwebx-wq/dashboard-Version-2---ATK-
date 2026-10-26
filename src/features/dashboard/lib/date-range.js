import {
  addDays,
  addMonths,
  daysBetween,
  formatKeyRange,
  isDateKey,
  keyParts,
  makeKey,
  monthEnd,
  monthStart,
  quarterStart,
  yearStart,
} from "@/lib/date-keys";

/**
 * Date ranges for Home and Orders, all in IST calendar days.
 *
 * A range is { from, to } as YYYY-MM-DD keys, inclusive. It lives in the URL
 * (`?from=2026-10-01&to=2026-10-25&compare=previous`) so it survives a refresh
 * and can be sent as a link; the preset is worked out from the dates rather
 * than stored, so a link to "1–25 Oct" opened on 25 Oct still reads "This
 * month".
 */

export const PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "last90", label: "Last 90 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "thisQuarter", label: "This quarter" },
  { id: "lastQuarter", label: "Last quarter" },
  { id: "thisYear", label: "This year" },
];

export const ORDER_PRESET_IDS = ["today", "yesterday", "last7", "last30", "last90"];

export const COMPARE_OPTIONS = [
  { value: "previous", label: "Previous period" },
  { value: "year", label: "Same period last year" },
  { value: "none", label: "No comparison" },
];

export function resolvePreset(id, today) {
  switch (id) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const day = addDays(today, -1);
      return { from: day, to: day };
    }
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "last90":
      return { from: addDays(today, -89), to: today };
    case "thisMonth":
      return { from: monthStart(today), to: today };
    case "lastMonth": {
      const start = addMonths(monthStart(today), -1);
      return { from: start, to: monthEnd(start) };
    }
    case "thisQuarter":
      return { from: quarterStart(today), to: today };
    case "lastQuarter": {
      const start = addMonths(quarterStart(today), -3);
      return { from: start, to: addDays(addMonths(start, 3), -1) };
    }
    case "thisYear":
      return { from: yearStart(today), to: today };
    default:
      return null;
  }
}

export function detectPreset(from, to, today, ids = PRESETS.map((p) => p.id)) {
  for (const id of ids) {
    const range = resolvePreset(id, today);
    if (range && range.from === from && range.to === to) return id;
  }
  return "custom";
}

export function presetLabel(id) {
  return PRESETS.find((preset) => preset.id === id)?.label ?? "Custom";
}

/** What the picker button says: the preset's name, or the dates. */
export function rangeButtonLabel(from, to, today, ids) {
  const preset = detectPreset(from, to, today, ids);
  return preset === "custom" ? formatKeyRange(from, to) : presetLabel(preset);
}

/**
 * The range to compare against.
 *
 * "Previous period" is the same number of days immediately before, except for
 * the calendar-to-date presets, which compare like with like: This month
 * (1–25 Oct) against the same days of last month (1–25 Sep), This quarter
 * against the same stretch of last quarter, This year against the same days
 * of last year.
 */
export function comparisonRange(from, to, mode, today) {
  if (mode === "none") return null;

  if (mode === "year") {
    return { from: addMonths(from, -12), to: addMonths(to, -12) };
  }

  const preset = detectPreset(from, to, today);
  if (preset === "thisMonth") {
    const start = addMonths(from, -1);
    const day = Math.min(keyParts(to).day, keyParts(monthEnd(start)).day);
    return { from: start, to: makeKey(keyParts(start).year, keyParts(start).month, day) };
  }
  if (preset === "thisQuarter") {
    const start = addMonths(from, -3);
    return { from: start, to: addDays(start, daysBetween(from, to)) };
  }
  if (preset === "thisYear") {
    return { from: addMonths(from, -12), to: addMonths(to, -12) };
  }
  if (preset === "lastMonth") {
    const start = addMonths(from, -1);
    return { from: start, to: monthEnd(start) };
  }
  if (preset === "lastQuarter") {
    const start = addMonths(from, -3);
    return { from: start, to: addDays(addMonths(start, 3), -1) };
  }

  const length = daysBetween(from, to) + 1;
  return { from: addDays(from, -length), to: addDays(from, -1) };
}

/**
 * Reads the range from URL params, falling back to `fallback` (a preset id)
 * for anything missing or invalid, and clamping to [min, today] — no future
 * days, nothing before the data starts.
 */
export function parseRange(params, { today, min, fallback = "last30", compareFallback = "previous" }) {
  let from = params.get("from");
  let to = params.get("to");

  if (!isDateKey(from) || !isDateKey(to) || from > to) {
    ({ from, to } = resolvePreset(fallback, today));
  }
  if (to > today) to = today;
  if (min && from < min) from = min;
  if (from > to) from = to;

  const compareParam = params.get("compare");
  const compare = COMPARE_OPTIONS.some((option) => option.value === compareParam)
    ? compareParam
    : compareFallback;

  return { from, to, compare };
}
