"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteProduct } from "../actions/delete-product";

/**
 * The trash icon on a product row, behind a confirmation.
 *
 * Only `id` and `title` cross the server/client boundary — the row it belongs
 * to has the rest, and every field passed here would be serialised into the
 * payload twenty times over.
 *
 * The icon arrives as an already-rendered element so `lucide-react` stays in
 * the server bundle, the same trick SidebarLink uses.
 */
export function DeleteProductButton({ id, title, icon }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError("");

    startTransition(async () => {
      const result = await deleteProduct(id);

      // Left open on failure, so the message has somewhere to land and the
      // person can retry without hunting for the row again.
      if (result?.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
    });
  }

  function handleCancel() {
    // The action is already in flight; closing now would hide its outcome.
    if (isPending) return;

    setError("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${title}`}
        className="rounded-md p-2 text-danger transition hover:bg-danger/10"
      >
        {icon}
      </button>

      {/* Mounted only while open — twenty rows would otherwise mean twenty
          dialogs sitting in the DOM. */}
      {open ? (
        <ConfirmDialog
          title="Delete this product?"
          description={`“${title}” comes off the storefront and out of this list. Orders and enquiries that already reference it keep their own copy.`}
          confirmLabel="Delete product"
          pending={isPending}
          error={error}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null}
    </>
  );
}
