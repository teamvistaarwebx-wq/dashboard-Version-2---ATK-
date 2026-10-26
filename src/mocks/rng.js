/**
 * Deterministic randomness for the mock data.
 *
 * Every generator seeds from a stable key — a date, an SKU, an order index —
 * rather than from one global stream. That way the numbers for 3 March never
 * change when the range on screen changes, a refresh shows the same orders,
 * and adding a product to the catalogue does not reshuffle every order after it.
 */

/** mulberry32: tiny, fast, and good enough for dummy data. Returns [0, 1). */
export function mulberry32(seed) {
  let state = seed >>> 0;

  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, to turn a string key into a 32-bit seed. */
export function hashString(text) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/** A fresh stream for one key: `rngFor("orders", "2026-10-25")`. */
export function rngFor(...keys) {
  return mulberry32(hashString(keys.join("|")));
}

/** Integer in [min, max], inclusive. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function randFloat(rng, min, max) {
  return min + rng() * (max - min);
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** `entries` is [[value, weight], …]. Weights need not sum to 1. */
export function pickWeighted(rng, entries) {
  let total = 0;
  for (const [, weight] of entries) total += weight;

  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }

  return entries[entries.length - 1][0];
}

/** Rounds to the nearest `step` — prices land on ₹50 or ₹100 like real ones. */
export function roundTo(value, step) {
  return Math.round(value / step) * step;
}
