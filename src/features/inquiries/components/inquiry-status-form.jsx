"use client";

import { useActionState } from "react";
import { Select } from "@/components/ui/select";
import { INQUIRY_STATUS_VALUES } from "@/constants/enums";
import { capitalize } from "@/lib/format";
import { updateInquiry } from "../actions/update-inquiry";

const STATUS_OPTIONS = INQUIRY_STATUS_VALUES.map((value) => ({
  value,
  label: capitalize(value),
}));

/**
 * Status + internal notes, saved together.
 *
 * One form rather than two: staff move an enquiry along *because* of what
 * they just learned on the call, so splitting them would mean two saves for
 * one thought.
 */
export function InquiryStatusForm({ id, status, internalNotes }) {
  const [state, formAction, pending] = useActionState(updateInquiry, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />

      <div className="flex flex-col gap-1.5">
        <label
          id="inquiry-status-label"
          htmlFor="inquiry-status"
          className="font-nunito text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Status
        </label>
        <Select
          id="inquiry-status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={status}
          aria-labelledby="inquiry-status-label"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="inquiry-notes"
          className="font-nunito text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Internal notes
        </label>
        <textarea
          id="inquiry-notes"
          name="internalNotes"
          rows={5}
          defaultValue={internalNotes}
          placeholder="What was agreed on the call, who is chasing it, what the quote was."
          className="resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand"
        />
        <p className="font-nunito text-xs text-muted">
          Only visible to the team — never shown to the enquirer.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand px-4 py-2.5 font-nunito text-sm text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>

      {/* aria-live so the outcome reaches a screen reader — the button label
          returning to "Save" is the only other signal anything happened. */}
      <p aria-live="polite" className="font-nunito text-xs">
        {state?.error ? (
          <span className="text-danger">{state.error}</span>
        ) : null}
        {state?.ok ? <span className="text-success">Saved.</span> : null}
      </p>
    </form>
  );
}
