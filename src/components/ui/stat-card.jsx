const NOTE_TONES = {
  muted: "text-muted",
  success: "text-success",
  danger: "text-danger",
};

/**
 * KPI tile: label and figure on the left, a brand block flush to the right
 * edge carrying the icon.
 *
 * The icon block is `absolute inset-y-0 right-0` rather than a flex sibling so
 * it spans the full card height regardless of whether `note` is present —
 * otherwise cards with and without a sub-line would disagree.
 */
export function StatCard({ label, value, note, noteTone = "muted", icon }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex min-h-24 flex-col justify-center gap-1 py-4 pl-5 pr-24">
        <p className="font-newsreader text-sm font-semibold text-brand">
          {label}
        </p>
        <p className="font-newsreader text-2xl font-semibold leading-tight text-foreground">
          {value}
        </p>
        {note ? (
          <p className={`text-xs ${NOTE_TONES[noteTone] ?? NOTE_TONES.muted}`}>
            {note}
          </p>
        ) : null}
      </div>

      <div
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-brand text-white"
        aria-hidden="true"
      >
        {icon}
      </div>
    </div>
  );
}
