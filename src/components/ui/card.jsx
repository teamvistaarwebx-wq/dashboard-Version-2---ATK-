/**
 * The white panel every section sits in: 12px radius, 1px border, a hairline
 * shadow. No coloured backgrounds, no gradients.
 *
 * `title` / `subtitle` / `action` are optional so the same component covers
 * both a titled panel and a bare container. The body is never wrapped in
 * padding — full-bleed tables and dividers are common enough that callers own
 * their spacing (CardSection gives the standard 16px).
 */
export function Card({ title, subtitle, action, className = "", children, as: Tag = "section", ...props }) {
  const hasHeader = Boolean(title || action);

  return (
    <Tag
      className={`min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-card ${className}`}
      {...props}
    >
      {hasHeader ? (
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-13 text-muted">{subtitle}</p> : null}
          </div>

          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      ) : null}

      {children}
    </Tag>
  );
}

export function CardSection({ className = "", children }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
