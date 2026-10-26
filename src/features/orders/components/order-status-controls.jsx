"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ORDER_STATUS } from "@/constants/enums";
import { updateOrderStatus } from "../actions/update-order-status";

/**
 * Moves an order along.
 *
 * Only the transitions that are legal from where the order actually is are
 * offered — the same table the action enforces, so the buttons and the server
 * can never disagree about what is possible.
 *
 * The two that move stock ask first. Marking an order paid takes sarees off
 * the shelf and cancelling a paid one puts them back; neither is something to
 * do by misclick.
 */
const INITIAL_STATE = {};

const ACTIONS = {
  [ORDER_STATUS.PAID]: {
    label: "Mark paid",
    tone: "primary",
    confirm: {
      title: "Mark this order paid?",
      description:
        "The stock held for this order comes off the shelf and a sale is recorded against each item. Use this when the money has actually arrived.",
      confirmLabel: "Mark paid",
    },
  },
  [ORDER_STATUS.CONFIRMED]: { label: "Confirm", tone: "primary" },
  [ORDER_STATUS.SHIPPED]: { label: "Mark shipped", tone: "primary" },
  [ORDER_STATUS.DELIVERED]: { label: "Mark delivered", tone: "primary" },
  [ORDER_STATUS.CANCELLED]: {
    label: "Cancel order",
    tone: "danger",
    confirm: {
      title: "Cancel this order?",
      description:
        "Any stock held for it goes back on the shelf. If the order was already paid, the items are returned to stock and logged as a return.",
      confirmLabel: "Cancel order",
    },
  },
};

const TONES = {
  primary:
    "bg-brand text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60",
  danger:
    "border border-danger/30 bg-surface text-danger hover:bg-danger/8 disabled:cursor-not-allowed disabled:opacity-60",
};

export function OrderStatusControls({ orderId, allowed }) {
  const [state, formAction, isPending] = useActionState(
    updateOrderStatus,
    INITIAL_STATE
  );

  const [pendingStatus, setPendingStatus] = useState("");
  const [confirming, setConfirming] = useState(null);

  const options = allowed.filter((status) => ACTIONS[status]);
  if (options.length === 0 && !state?.error) return null;

  function submit(status) {
    setPendingStatus(status);
    setConfirming(null);

    const formData = new FormData();
    formData.set("id", orderId);
    formData.set("status", status);
    formAction(formData);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {options.map((status) => {
          const action = ACTIONS[status];

          return (
            <button
              key={status}
              type="button"
              disabled={isPending}
              onClick={() =>
                action.confirm ? setConfirming(status) : submit(status)
              }
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 font-nunito text-sm font-semibold transition ${TONES[action.tone]}`}
            >
              {isPending && pendingStatus === status ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving
                </>
              ) : (
                action.label
              )}
            </button>
          );
        })}
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg bg-danger/8 px-3 py-2.5 font-nunito text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          {...ACTIONS[confirming].confirm}
          pending={isPending}
          onConfirm={() => submit(confirming)}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </div>
  );
}
