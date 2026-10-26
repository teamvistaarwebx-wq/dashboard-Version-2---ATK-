"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteBanner } from "../actions/delete-banner";
import { publishBanner } from "../actions/publish-banner";

/**
 * Publish / unpublish and delete, on one banner row.
 *
 * Both live here rather than in two components because they share an error
 * line: a failed publish and a refused delete are answered in the same place,
 * beside the row that caused them.
 *
 * Only `id`, `name` and `isActive` cross the boundary — the row already has
 * the rest, and passing the images would serialise two URLs per row for
 * nothing.
 */
export function BannerRowActions({ id, name, isActive, canDelete, deleteIcon }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function togglePublished() {
    setError("");

    startTransition(async () => {
      const result = await publishBanner(id, !isActive);
      if (result?.error) setError(result.error);
    });
  }

  function handleDelete() {
    setError("");

    startTransition(async () => {
      const result = await deleteBanner(id);

      // Left open on failure so the message has somewhere to land — the most
      // likely one is "unpublish this first", which is actionable right here.
      if (result?.error) {
        setError(result.error);
        return;
      }

      setConfirming(false);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={togglePublished}
          disabled={isPending}
          className={
            isActive
              ? "rounded-md px-2.5 py-1.5 font-nunito text-xs font-semibold text-muted transition hover:bg-background disabled:opacity-60"
              : "rounded-md px-2.5 py-1.5 font-nunito text-xs font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-60"
          }
        >
          {isActive ? "Unpublish" : "Publish"}
        </button>

        {/* Hidden for staff, and refused inside the action too — the hidden
            button is a courtesy, the check is the boundary. */}
        {canDelete ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={isPending}
            aria-label={`Delete ${name}`}
            className="rounded-md p-2 text-danger transition hover:bg-danger/10 disabled:opacity-60"
          >
            {deleteIcon}
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="font-nunito text-xs text-danger">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title="Delete this banner?"
          description={`“${name}” and its artwork reference are removed for good. The uploaded files stay in storage.`}
          confirmLabel="Delete banner"
          pending={isPending}
          error={error}
          onConfirm={handleDelete}
          onCancel={() => {
            if (isPending) return;
            setError("");
            setConfirming(false);
          }}
        />
      ) : null}
    </div>
  );
}
