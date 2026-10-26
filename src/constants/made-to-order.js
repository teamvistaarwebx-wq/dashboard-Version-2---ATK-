/**
 * Lead times for made-to-order pieces, by quantity.
 *
 * Mirrored in the storefront's constants/made-to-order.js, which shows the
 * same estimate on the cards and in the quote popup. This copy is the one
 * saved on the enquiry, so sales sees what the customer was told — the browser
 * never sends the estimate, it is worked out here from the quantity.
 *
 * Above the last tier there is no estimate: the team confirms the date on the
 * call. Every size is still a quote request; the tiers only change the text.
 */
export const MADE_TO_ORDER_LEAD_TIMES = [
  { maxUnits: 20, days: 45 },
  { maxUnits: 50, days: 75 },
];

/**
 * Fewest units of one piece worth setting up a loom for. Mirrored by the
 * storefront's MIN_QUOTE_UNITS, which holds the button back below it.
 */
export const MIN_MADE_TO_ORDER_UNITS = 5;

/** A ceiling, so a typo or a tampered request cannot ask for a million. */
export const MAX_MADE_TO_ORDER_UNITS = 10000;

/** Pieces in one quote request. Mirrored by the storefront's quote box. */
export const MAX_MADE_TO_ORDER_LINES = 20;

/** Days to delivery for a quantity, or null when the team sets the date. */
export function madeToOrderLeadDays(quantity) {
  const tier = MADE_TO_ORDER_LEAD_TIMES.find((row) => quantity <= row.maxUnits);
  return tier ? tier.days : null;
}
