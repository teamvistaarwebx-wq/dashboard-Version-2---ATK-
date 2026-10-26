"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";

/**
 * Editor for the schema's plain string arrays — tags, suggestedOccasions,
 * suggestedRecipient.
 *
 * Type and press Enter (or comma) to add, click × or press Backspace on an
 * empty box to remove. The value reaches the server as one hidden input
 * carrying a JSON array, so the action parses arrays the same way everywhere
 * rather than juggling repeated field names.
 */
export function ChipsInput({
  name,
  label,
  hint,
  placeholder,
  defaultValue = [],
  disabled = false,
}) {
  const inputId = useId();
  const [items, setItems] = useState(defaultValue);
  const [draft, setDraft] = useState("");

  function add(raw) {
    const value = raw.trim();
    if (!value) return;

    setItems((current) =>
      // Case-insensitive: "Wedding" and "wedding" are one tag, and the first
      // spelling entered is the one that sticks.
      current.some((item) => item.toLowerCase() === value.toLowerCase())
        ? current
        : [...current, value]
    );
    setDraft("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      // Enter inside a form would submit it, and a comma is a separator here,
      // not a character.
      event.preventDefault();
      add(draft);
      return;
    }

    if (event.key === "Backspace" && draft === "") {
      setItems((current) => current.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="font-nunito text-xs font-semibold text-foreground">
        {label}
      </label>

      <input type="hidden" name={name} value={JSON.stringify(items)} />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-2 py-2 transition focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-1 font-nunito text-xs font-medium text-brand"
          >
            {item}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setItems((current) => current.filter((v) => v !== item))}
              aria-label={`Remove ${item}`}
              className="transition hover:opacity-70"
            >
              <X className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </span>
        ))}

        <input
          id={inputId}
          type="text"
          value={draft}
          disabled={disabled}
          placeholder={items.length === 0 ? placeholder : ""}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          // Losing focus with something half-typed should keep it, not bin it.
          onBlur={() => add(draft)}
          className="font-nunito min-w-24 flex-1 bg-transparent px-1.5 py-1 text-sm text-foreground outline-none placeholder:text-muted/70"
        />
      </div>

      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
