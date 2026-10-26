import Link from "next/link";

/**
 * Buttons. One primary per screen; secondary for everything else in a page
 * header; tertiary for quiet inline actions; critical for destructive ones.
 *
 * `outline` and `ghost` are the names the older screens use — they map onto
 * secondary and tertiary.
 */
const BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const VARIANTS = {
  primary:
    "bg-brand text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.2)] hover:bg-brand-hover",
  secondary:
    "border border-border bg-surface text-foreground shadow-card hover:bg-surface-muted",
  tertiary: "text-foreground hover:bg-neutral-bg",
  critical: "bg-critical text-white hover:opacity-90",
  plain: "text-brand-text hover:underline underline-offset-2 px-0!",
};
VARIANTS.outline = VARIANTS.secondary;
VARIANTS.ghost = VARIANTS.tertiary;

const SIZES = {
  sm: "h-8 px-2.5 text-13",
  md: "h-9 px-3 text-sm",
  icon: "size-8 text-sm",
};

export function buttonClass({ variant = "primary", size = "md", className = "" } = {}) {
  return `${BASE} ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${className}`;
}

export function Button({ variant, size, className, type = "button", ...props }) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

/** A link that looks like a button — navigation, not an action. */
export function ButtonLink({ variant, size, className, ...props }) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
