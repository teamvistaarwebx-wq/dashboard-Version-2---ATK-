"use client";

/**
 * Catches anything a dashboard page throws while rendering.
 *
 * This became necessary with streaming. Before, a page awaited all its data
 * before returning any markup, so a failed query meant no response had started
 * and Next could serve a whole error page. Now the header and frame are
 * already on their way to the browser by the time a query fails, and without a
 * boundary here that leaves a half-rendered screen with a skeleton that never
 * resolves.
 *
 * A client component because it has to be — `reset` re-runs the failed render,
 * and that needs a handler in the browser.
 */
export default function DashboardError({ error, reset }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="font-newsreader text-xl font-semibold text-brand">
        Something went wrong
      </h2>

      <p className="max-w-md font-nunito text-sm text-muted">
        This screen could not be loaded. It is usually a dropped database
        connection, and trying again is often enough.
      </p>

      {/* `digest` is the only part of a server error Next exposes to the
          browser — the message itself is withheld in production. It is what
          matches this failure to a line in the server logs, so it is worth
          showing to whoever is about to report the problem. */}
      {error?.digest ? (
        <p className="font-nunito text-xs text-muted">
          Reference: <code>{error.digest}</code>
        </p>
      ) : null}

      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand/90"
      >
        Try again
      </button>
    </div>
  );
}
