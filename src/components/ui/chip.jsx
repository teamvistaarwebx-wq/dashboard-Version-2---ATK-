/**
 * The pill-shaped filter buttons above the product and inventory tables.
 *
 * One definition, because two lists that filter the same way should not drift
 * into looking different.
 */
const BASE = "rounded-full border px-4 py-2 font-nunito text-sm transition";
const ON = "border-brand bg-brand-tint font-semibold text-brand";
const OFF =
  "border-border bg-surface text-foreground hover:border-brand/40 hover:bg-brand-soft";

export function chipClass(active) {
  return `${BASE} ${active ? ON : OFF}`;
}
