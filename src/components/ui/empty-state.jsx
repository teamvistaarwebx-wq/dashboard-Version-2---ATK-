/** Placeholder body for the sections that are not built yet. */
export function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
      <p className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}
