import Link from "next/link";

/**
 * Buttons. One primary per screen; secondary for everything else in a page
 * header; tertiary for quiet inline actions; critical for destructive ones.
 *
 * `outline` and `ghost` are the names the older screens use — they map onto
 * secondary and tertiary.
 */
const BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] font-medium transition-[background-color,border-color,color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const VARIANTS = {
  primary: "bg-brand text-white shadow-card hover:bg-brand-hover",
  secondary:
    "border border-border bg-surface text-foreground shadow-card hover:border-border-strong hover:bg-surface-muted",
  tertiary: "text-muted hover:bg-neutral-bg hover:text-foreground",
  critical: "bg-critical text-white shadow-card hover:opacity-90",
  plain: "text-brand-text hover:underline underline-offset-2 px-0!",
};
VARIANTS.outline = VARIANTS.secondary;
VARIANTS.ghost = VARIANTS.tertiary;

const SIZES = {
  sm: "h-8 px-3 text-13",
  md: "h-9 px-3.5 text-13",
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
