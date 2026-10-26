"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

/**
 * The spec rows the storefront renders under the description — "Fabric Care /
 * Dry clean only", "Saree Length / 5.50 meter".
 *
 * Label and value only. `key` and `position` are derived: the model slugifies
 * the label into a key on validate, and position is list order.
 *
 * Rows carry a client-side id rather than keying on the label, so typing into
 * a fresh row does not remount it on every keystroke and lose focus.
 */
let nextRowId = 0;

function toRows(details) {
  return details.map((row) => ({ ...row, id: (nextRowId += 1) }));
}

export function DetailRowsField({ defaultValue = [], disabled = false }) {
  // Lazy init — the map runs once, not on every render.
  const [rows, setRows] = useState(() => toRows(defaultValue));

  function update(id, field, value) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-nunito text-xs font-semibold text-foreground">
        Specification rows
      </p>

      {/* Stripped of the client-side id before it goes anywhere near the
          action, which expects label/value pairs. */}
      <input
        type="hidden"
        name="details"
        value={JSON.stringify(
          rows.map((row) => ({ label: row.label, value: row.value }))
        )}
      />

      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <input
            type="text"
            value={row.label}
            disabled={disabled}
            onChange={(event) => update(row.id, "label", event.target.value)}
            placeholder="Fabric Care"
            aria-label="Specification label"
            className="font-nunito h-10 w-40 shrink-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-brand/50"
          />

          <input
            type="text"
            value={row.value}
            disabled={disabled}
            onChange={(event) => update(row.id, "value", event.target.value)}
            placeholder="Dry clean only"
            aria-label="Specification value"
            className="font-nunito h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-brand/50"
          />

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              setRows((current) => current.filter((item) => item.id !== row.id))
            }
            aria-label={`Remove ${row.label || "this row"}`}
            className="shrink-0 rounded-md p-2 text-muted transition hover:bg-background hover:text-danger"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          setRows((current) => [
            ...current,
            { id: (nextRowId += 1), label: "", value: "" },
          ])
        }
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 font-nunito text-xs font-semibold text-muted transition hover:border-brand/50 hover:text-brand"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        Add row
      </button>
    </div>
  );
}
