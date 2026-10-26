/**
 * Header bar for the screens not yet moved onto `Page` (layout/page.jsx).
 *
 * Sticky: the scroll container is <main> in the admin shell, so `top-0` pins
 * this above long tables. Same type scale as `Page`, on a frosted strip so
 * rows sliding underneath stay legible.
 */
export function PageHeader({ title, description, children }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>

        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </header>
  );
}
