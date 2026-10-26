import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Page frame for the redesigned screens: content centred at 1280px, the title
 * on the left (24px / 600) with an optional one-line description under it,
 * and actions on the right — secondary buttons first, then at most one
 * primary.
 */
export function Page({ title, titleMeta, description, backHref, backLabel = "Back", actions, narrow = false, children }) {
  return (
    <div className={`mx-auto w-full px-4 pb-16 pt-6 sm:px-6 sm:pt-7 lg:px-8 ${narrow ? "max-w-[1000px]" : "max-w-[1280px]"}`}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          {backHref ? (
            <Link
              href={backHref}
              aria-label={backLabel}
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-muted shadow-card transition hover:border-border-strong hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              {titleMeta}
            </div>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      {children}
    </div>
  );
}
