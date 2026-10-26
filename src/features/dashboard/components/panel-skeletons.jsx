/**
 * Suspense fallbacks, sized to roughly match what replaces them so the page
 * does not jump as each panel resolves.
 */
function Block({ className = "" }) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface ${className}`}
      aria-hidden="true"
    />
  );
}

export function PanelSkeleton({ height = "h-64" }) {
  return <Block className={`animate-pulse ${height}`} />;
}
