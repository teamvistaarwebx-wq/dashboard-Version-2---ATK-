const NOTE_TONES = {
  muted: "text-muted",
  success: "text-success",
  danger: "text-danger",
};

/**
 * KPI tile: label over the figure, the icon in a small bordered square in the
 * top-right corner, and the note on a hairline-divided foot.
 */
export function StatCard({ label, value, note, noteTone = "muted", icon }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-13 text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">
            {value}
          </p>
        </div>

        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface-muted text-brand-text [&_svg]:size-[18px]"
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      {note ? (
        <p className={`mt-auto border-t border-border px-4 py-2.5 text-xs ${NOTE_TONES[noteTone] ?? NOTE_TONES.muted}`}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
