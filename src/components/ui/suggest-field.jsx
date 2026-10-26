"use client";

import { useEffect, useId, useRef, useState } from "react";
import { POPOVER_LIST_CLASS, popoverPosition } from "./popover-position";

/**
 * Free-text field with themed suggestions — a replacement for
 * <input list> + <datalist>, whose popup the browser draws in its own style.
 *
 * Still a plain text input that posts under `name`: the suggestions only
 * help, they never restrict. A fabric missing from the list can be typed and
 * saved, exactly as before.
 *
 * Matches are case-insensitive and ranked prefix-first, so typing "si" offers
 * "Silk" before "Tussar Silk". The typed part is bolded in each suggestion.
 *
 * The list is a top-layer popover for the same reason as Select's: these
 * fields sit inside the product drawer, a modal <dialog>. Keyboard follows
 * the ARIA combobox pattern — ↑/↓ move, Enter picks, Esc closes the list
 * (and only the list, not the drawer).
 */
const BASE =
  "font-nunito h-11 w-full rounded-lg border bg-surface px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:ring-2 disabled:bg-background";
const NEUTRAL = "border-border focus:border-brand/50 focus:ring-brand/10";
const INVALID = "border-danger focus:border-danger focus:ring-danger/10";

export function SuggestField({
  id,
  name,
  label,
  hint,
  error,
  required,
  suggestions,
  defaultValue = "",
  placeholder,
  disabled,
  className = "",
}) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const listId = `${inputId}-suggestions`;
  const messageId = error ? `${inputId}-error` : undefined;

  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState(null);

  const matches = rank(suggestions, value);
  const visible = open && matches.length > 0;

  // State only — the effect on `visible` below is the one place the popover
  // enters or leaves the top layer, so it can never be shown twice.
  function show() {
    if (disabled) return;
    setPosition(popoverPosition(inputRef.current));
    setOpen(true);
  }

  function hide() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function choose(index) {
    const match = matches[index];
    if (!match) return;
    setValue(match);
    hide();
  }

  function handleChange(event) {
    setValue(event.target.value);
    setActiveIndex(-1);
    if (!open) show();
  }

  function handleKeyDown(event) {
    if (!open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        show();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      case "Enter":
        // Only swallow Enter when it is picking something — otherwise it
        // keeps doing what Enter does in a form.
        if (activeIndex >= 0 && matches[activeIndex]) {
          event.preventDefault();
          choose(activeIndex);
        }
        return;
      case "Escape":
        // preventDefault as well: Esc is also the drawer's close request.
        event.preventDefault();
        event.stopPropagation();
        hide();
        return;
      case "Tab":
        hide();
        return;
      default:
    }
  }

  // A scroll or resize would leave the list floating away from the field.
  useEffect(() => {
    if (!open) return;

    function close() {
      setOpen(false);
      setActiveIndex(-1);
    }

    function handleScroll(event) {
      if (listRef.current?.contains(event.target)) return;
      close();
    }

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Open with no matches counts as closed — otherwise an empty bordered box
  // would hang under the field while someone types a new fabric.
  useEffect(() => {
    const list = listRef.current;
    if (!list?.hidePopover) return;

    const showing = list.matches(":popover-open");
    if (visible && !showing) list.showPopover();
    if (!visible && showing) list.hidePopover();
  }, [visible]);

  useEffect(() => {
    if (!visible || activeIndex < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [visible, activeIndex]);

  const activeId = visible && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={inputId}
        className="font-nunito text-xs font-semibold text-foreground"
      >
        {label}
        {required ? (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        required={required}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onFocus={show}
        onClick={() => {
          // Reopens after Esc without having to leave the field and come back.
          if (!open) show();
        }}
        onBlur={hide}
        onKeyDown={handleKeyDown}
        className={`${BASE} ${error ? INVALID : NEUTRAL}`}
      />

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        popover="manual"
        aria-label={`${label} suggestions`}
        style={position ?? undefined}
        className={POPOVER_LIST_CLASS}
      >
        {matches.map((match, index) => (
          <li
            key={match}
            id={`${listId}-${index}`}
            data-index={index}
            role="option"
            aria-selected={index === activeIndex}
            // mousedown, not click: keeps focus in the input, so its blur
            // never closes the list before the choice lands.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(index)}
            onPointerMove={() => setActiveIndex(index)}
            className={`cursor-pointer rounded-md px-3 py-2 transition-colors ${
              index === activeIndex ? "bg-brand-soft text-brand" : "text-foreground"
            }`}
          >
            <Highlighted text={match} query={value} />
          </li>
        ))}
      </ul>

      {error ? (
        <p id={messageId} role="alert" className="font-nunito text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Suggestions containing the typed text, prefix matches first, the exact
 * value itself left out (it is already in the box). Empty input shows all.
 */
function rank(suggestions, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return suggestions;

  const starts = [];
  const contains = [];

  for (const suggestion of suggestions) {
    const hay = suggestion.toLowerCase();
    if (hay === needle) continue;
    if (hay.startsWith(needle)) starts.push(suggestion);
    else if (hay.includes(needle)) contains.push(suggestion);
  }

  return [...starts, ...contains];
}

/** The typed part in bold, so it is obvious why each suggestion matched. */
function Highlighted({ text, query }) {
  const needle = query.trim();
  const at = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;

  if (at < 0) return text;

  return (
    <>
      {text.slice(0, at)}
      <strong className="font-semibold">{text.slice(at, at + needle.length)}</strong>
      {text.slice(at + needle.length)}
    </>
  );
}
