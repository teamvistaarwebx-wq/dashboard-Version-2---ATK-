/**
 * Header bar for the screens not yet moved onto `Page` (layout/page.jsx).
 *
 * Sticky: the scroll container is <main> in the admin shell, so `top-0` pins
 * this above long tables. Subtitles are no longer shown — the title and the
 * actions carry the page.
 */
export function PageHeader({ title, children }) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-4 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>

      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}
