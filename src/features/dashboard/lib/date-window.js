/**
 * The dashboard's "last 7 days" has to mean seven Indian days.
 *
 * Left to the server's clock, an order placed at 9pm IST lands on the next
 * UTC date and would move to the following bar in the chart — and on a
 * Vercel box the server clock is UTC, so this is the normal case, not an
 * edge one.
 */
const TIMEZONE = "Asia/Kolkata";

/** en-CA is the shortest route to a YYYY-MM-DD string in a given zone. */
const IST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export { TIMEZONE, IST_DATE };

/**
 * Returns the window as both an instant to filter on and the ordered list of
 * day keys to zero-fill against.
 *
 * `days` counts back inclusive of today: 7 gives today plus the six before it.
 *
 * The arithmetic runs on UTC-anchored midnights so adding a day is always
 * exactly 24 hours — no DST, no host timezone in the mix. Only the final
 * `start` is converted back to a real instant, using the fixed +05:30 offset
 * India has never changed.
 */
export function getIstDayWindow(days) {
  const todayKey = IST_DATE.format(new Date());
  const today = new Date(`${todayKey}T00:00:00Z`);

  const window = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);

    window.push({
      key: date.toISOString().slice(0, 10),
      label: DAY_LABELS[date.getUTCDay()],
    });
  }

  return {
    start: new Date(`${window[0].key}T00:00:00+05:30`),
    days: window,
  };
}
