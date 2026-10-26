/**
 * Status pills. The three semantic tones are for status only; `neutral` for
 * states that need no attention; `gold` sparingly, for "New" / "Imported".
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
      className={`inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs font-medium ${
        TONES[tone] ?? TONES.neutral
      } ${className}`}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
