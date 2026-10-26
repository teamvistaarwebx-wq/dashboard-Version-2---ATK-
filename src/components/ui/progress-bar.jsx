/**
 * Stock fill for one category row. `role="progressbar"` with the aria-value*
 * trio so the ratio is available without reading the sibling text.
 */
export function ProgressBar({ value, max, label }) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-2.5 w-full overflow-hidden rounded-full bg-track"
    >
      <div
        className="h-full rounded-full bg-success transition-[width]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
