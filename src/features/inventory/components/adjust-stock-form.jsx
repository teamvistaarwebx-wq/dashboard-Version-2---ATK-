"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { ADJUST_REASONS, POSITIVE_REASONS } from "@/constants/inventory";
import { MOVEMENT_REASON } from "@/constants/enums";
import { adjustStockAction } from "../actions/adjust-stock";

/**
 * Corrects one SKU's stock.
 *
 * The person types a positive quantity and picks a reason; the sign comes from
 * the reason. Asking somebody to type "-3" to record breakage is how you
 * eventually get "+3" recorded instead, and a stock ledger that quietly gains
 * three sarees is worse than one that is obviously wrong.
 *
 * The running total under the field is the point of the whole form: it says
 * what the shelf will read after saving, before anyone commits to it.
 */
const INITIAL_STATE = { errors: {} };
const EMPTY = {};

export function AdjustStockForm({ row, returnTo, onCancel }) {
  const [state, formAction, isPending] = useActionState(
    adjustStockAction,
    INITIAL_STATE
  );

  const errors = state?.errors ?? EMPTY;

  const [reason, setReason] = useState(MOVEMENT_REASON.RESTOCK);
  const [quantity, setQuantity] = useState("");

  const parsed = Number.parseInt(quantity, 10);
  const size = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const delta = POSITIVE_REASONS.includes(reason) ? size : -size;
  const after = row.onHand + delta;

  return (
    <form action={formAction} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
        <input type="hidden" name="productId" value={row.productId} />
        <input type="hidden" name="sku" value={row.sku} />
        <input type="hidden" name="warehouse" value={row.warehouseId} />
        <input type="hidden" name="returnTo" value={returnTo} />

        <div className="rounded-lg border border-border bg-background p-4">
          <p className="font-semibold text-foreground">{row.title}</p>
          <p className="font-nunito text-xs text-muted">{row.sku}</p>

          <dl className="mt-3 grid grid-cols-3 gap-2 font-nunito text-xs">
            <Figure label="On hand" value={row.onHand} />
            <Figure label="Held" value={row.reserved} />
            <Figure label="Available" value={row.available} danger={row.available < 0} />
          </dl>
        </div>

        <SelectField
          id="adjust-reason"
          name="reason"
          label="Reason"
          options={ADJUST_REASONS}
          value={reason}
          onValueChange={setReason}
          error={errors.reason}
          required
          disabled={isPending}
        />

        <TextField
          id="adjust-quantity"
          name="quantity"
          label="Quantity"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="0"
          hint={
            POSITIVE_REASONS.includes(reason)
              ? "Added to what is on the shelf."
              : "Taken off what is on the shelf."
          }
          error={errors.quantity}
          required
          disabled={isPending}
        />

        {/* Shown only once there is something to preview, and in red when the
            result would be impossible — the action refuses it, but nobody
            should have to press Save to find that out. */}
        {size > 0 ? (
          <p
            className={`rounded-lg px-3 py-2.5 font-nunito text-sm ${
              after < 0
                ? "bg-danger/8 text-danger"
                : "bg-brand-tint text-brand"
            }`}
          >
            {after < 0 ? (
              <>Only {row.onHand} on hand — this would take it below zero.</>
            ) : (
              <>
                On hand {row.onHand} → <strong>{after}</strong>
                {row.reserved > 0
                  ? `, available ${row.available} → ${after - row.reserved}`
                  : null}
              </>
            )}
          </p>
        ) : null}

        <TextareaField
          id="adjust-note"
          name="note"
          label="Note"
          rows={3}
          placeholder="Invoice number, who counted it, what broke…"
          hint="Kept on the movement forever. Worth a line."
          disabled={isPending}
        />
      </div>

      <footer className="shrink-0 border-t border-border px-6 py-4">
        {errors._form ? (
          <p
            role="alert"
            className="mb-3 rounded-lg bg-danger/8 px-3 py-2.5 font-nunito text-sm text-danger"
          >
            {errors._form}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 font-nunito text-sm font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isPending || size === 0 || after < 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 font-nunito text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving
              </>
            ) : (
              "Save adjustment"
            )}
          </button>
        </div>
      </footer>
    </form>
  );
}

function Figure({ label, value, danger }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd
        className={`text-lg font-semibold tabular-nums ${
          danger ? "text-danger" : "text-foreground"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
