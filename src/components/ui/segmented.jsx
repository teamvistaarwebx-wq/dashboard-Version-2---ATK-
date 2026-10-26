/**
 * A row of mutually exclusive buttons in one rounded track: 7D / 30D / 90D,
 * Visitors / Inquiries. Each option is an `aria-pressed` toggle — they switch
 * a view, they do not submit anything.
 *
 * `value` may match none of the options (a custom date range), in which case
 * nothing is lit.
 */
export function Segmented({ options, value, onChange, label, size = "md", className = "" }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-[10px] border border-border bg-surface-muted p-0.5 ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={`${size === "sm" ? "h-7 px-2.5" : "h-8 px-3"} rounded-lg text-13 font-medium transition-colors ${
              selected ? "bg-surface text-foreground shadow-raised" : "text-muted hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
