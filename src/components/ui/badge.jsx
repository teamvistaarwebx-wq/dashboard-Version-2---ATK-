/**
 * Status pills: fully rounded, tinted fill with a hairline ring in the same
 * hue. The three semantic tones are for status only; `neutral` for states
 * that need no attention; `gold` sparingly, for "New" / "Imported".
 */
const TONES = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  critical: "bg-critical-bg text-critical",
  neutral: "bg-neutral-bg text-muted",
  gold: "bg-gold text-gold-foreground",
  brand: "bg-brand-tint text-brand-text",
};

export function Badge({ tone = "neutral", dot = false, className = "", children }) {
  return (
    <span
      className={`inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium ring-1 ring-inset ring-current/15 ${
        TONES[tone] ?? TONES.neutral
      } ${className}`}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
