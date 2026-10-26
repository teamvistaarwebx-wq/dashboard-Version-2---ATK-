"use client";

import { useState, useTransition } from "react";
import {
  makeGiftOptionDefault,
  setGiftOptionActive,
} from "../actions/set-gift-option-state";

/**
 * Make default / show / hide, on one gift option row.
 *
 * One component so both share an error line beside the row that caused it —
 * the likely one being "make another option the default first".
 */
export function GiftOptionRowActions({ id, isActive, isDefault }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action) {
    setError("");

    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1">
        {isDefault ? null : (
          <button
            type="button"
            onClick={() => run(() => makeGiftOptionDefault(id))}
            disabled={isPending}
            className="rounded-md px-2.5 py-1.5 font-nunito text-xs font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-60"
          >
            Make default
          </button>
        )}

        <button
          type="button"
          onClick={() => run(() => setGiftOptionActive(id, !isActive))}
          disabled={isPending}
          className={
            isActive
              ? "rounded-md px-2.5 py-1.5 font-nunito text-xs font-semibold text-muted transition hover:bg-background disabled:opacity-60"
              : "rounded-md px-2.5 py-1.5 font-nunito text-xs font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-60"
          }
        >
          {isActive ? "Deactivate" : "Activate"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="max-w-56 text-right font-nunito text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
