import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Page frame for the redesigned screens: content centred at 1200px, the title
 * on the left (20px / 600) and actions on the right — secondary buttons first,
 * then at most one primary. No subtitles.
 */
export function Page({ title, titleMeta, backHref, backLabel = "Back", actions, narrow = false, children }) {
  return (
    <div className={`mx-auto w-full px-4 pb-16 pt-5 sm:px-6 sm:pt-6 ${narrow ? "max-w-[960px]" : "max-w-[1200px]"}`}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              aria-label={backLabel}
              className="-ml-1 rounded-lg p-1.5 text-muted transition hover:bg-neutral-bg hover:text-foreground"
            >
              <ArrowLeft className="size-[18px]" aria-hidden="true" />
            </Link>
          ) : null}
          <h1 className="truncate text-xl font-semibold text-foreground">{title}</h1>
          {titleMeta}
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      {children}
    </div>
  );
}
