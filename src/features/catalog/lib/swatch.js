import { hashString } from "@/mocks/rng";

/** Handloom colours for products added without a photo, picked from the title. */
const PALETTE = ["#7e0917", "#2e3a7a", "#1f5c3f", "#c99a2e", "#b7410e", "#5b2a6e", "#1f5f7a", "#8b2e2e", "#a67c2e", "#3a3a3a"];

export function swatchFor(title) {
  return PALETTE[hashString(String(title)) % PALETTE.length];
}
