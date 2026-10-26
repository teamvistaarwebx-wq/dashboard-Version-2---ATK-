import { MOVEMENT_REASON, ORDER_STATUS } from "./enums";

/**
 * How long an unpaid order holds its stock.
 *
 * Fifteen minutes covers a UPI approval or a bank netbanking redirect — both
 * of which routinely take two or three minutes in India — with room left for
 * the payment webhook to arrive. Shorter and we release stock from under
 * someone who is mid-payment; longer and one abandoned checkout sits on a
 * saree for half an hour.
 */
export const STOCK_HOLD_MINUTES = 15;
export const STOCK_HOLD_MS = STOCK_HOLD_MINUTES * 60 * 1000;

/**
 * The reasons an admin can pick when correcting stock by hand.
 *
 * A deliberate subset of MOVEMENT_REASON: `sale` is written by the ledger when
 * an order is paid and must never be selectable, and `reservation`/`release`
 * are never written at all (see stock-ledger.js on why movements track onHand
 * only).
 */
export const ADJUST_REASONS = [
  { value: MOVEMENT_REASON.RESTOCK, label: "Restock — new stock arrived" },
  { value: MOVEMENT_REASON.RETURN, label: "Return — sent back by a customer" },
  { value: MOVEMENT_REASON.DAMAGE, label: "Damage — written off" },
  { value: MOVEMENT_REASON.ADJUSTMENT, label: "Correction — recount" },
];

export const ADJUST_REASON_VALUES = ADJUST_REASONS.map((row) => row.value);

/** Reasons that add stock. The rest take it away. */
export const POSITIVE_REASONS = [
  MOVEMENT_REASON.RESTOCK,
  MOVEMENT_REASON.RETURN,
];

/**
 * Which order statuses can follow which.
 *
 * Written down rather than left to the buttons on screen, because a server
 * action is a public endpoint: without this, `delivered → pending_payment` is
 * one crafted request away, and it would silently re-reserve stock for an
 * order that shipped last week.
 */
export const ORDER_TRANSITIONS = {
  [ORDER_STATUS.PENDING_PAYMENT]: [
    ORDER_STATUS.PAID,
    ORDER_STATUS.PAYMENT_FAILED,
    ORDER_STATUS.EXPIRED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  // Once it is with the courier, coming back is a return, not a cancellation.
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.PAYMENT_FAILED]: [],
  [ORDER_STATUS.EXPIRED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

/** Statuses where the money is in and the stock has already left. */
export const STOCK_CONSUMED_STATUSES = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
];

/** The filter chips above the inventory table. */
export const STOCK_VIEW = {
  ALL: "all",
  LOW: "low",
  OUT: "out",
  OVERSOLD: "oversold",
};

export const STOCK_VIEW_VALUES = Object.values(STOCK_VIEW);

export function normalizeStockView(value) {
  return STOCK_VIEW_VALUES.includes(value) ? value : STOCK_VIEW.ALL;
}

/** Used when a product carries no threshold of its own. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
