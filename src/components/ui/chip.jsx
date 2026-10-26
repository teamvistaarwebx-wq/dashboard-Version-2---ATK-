/**
 * The pill-shaped filter buttons above the product and inventory tables.
 *
 * One definition, because two lists that filter the same way should not drift
 * into looking different.
 */
const BASE = "inline-flex h-8 items-center rounded-full border px-3.5 text-13 font-medium transition";
const ON = "border-brand bg-brand text-white shadow-card";
const OFF =
  "border-border bg-surface text-muted shadow-card hover:border-border-strong hover:text-foreground";

export function chipClass(active) {
  return `${BASE} ${active ? ON : OFF}`;
}
