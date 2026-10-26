"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { POPOVER_LIST_CLASS, popoverPosition } from "./popover-position";

/**
 * The admin's dropdown — a themed replacement for the native <select>.
 *
 * Why not <select>: the open list is drawn by the OS, so it ignores the theme
 * entirely (system blue highlight, system font, square corners) and cannot be
 * styled in any browser we support.
 *
 * Why the Popover API rather than a portal: the drawers are modal <dialog>s,
 * which live in the browser's top layer. Anything portalled into <body> —
 * whatever its z-index — renders *underneath* an open dialog. A popover joins
 * the top layer itself, above the dialog that opened it, and is positioned
 * against the viewport, so a scroll container cannot clip it either.
 *
 * Forms keep working exactly as before: the value posts through a hidden
 * input under `name`, so GET filter forms and server actions need no changes.
 *
 * Keyboard follows the ARIA combobox/listbox pattern — focus stays on the
 * trigger and `aria-activedescendant` points at the highlighted option:
 * ↑/↓ move, Home/End jump, Enter/Space choose, Esc closes, typing a letter
 * jumps to the next option starting with it.
 *
 * `options` is a flat list of { value, label }, or groups of
 * { label, options: [...] } — the shape <optgroup> used to give.
 *
 * `size` is "md" (44px, the form fields) or "sm" (38px, the compact filter
 * bars).
 *
 * Label it with <label htmlFor={id}>, never by wrapping it in a <label>: the
 * list is rendered inside this component, and a click on an option inside a
 * wrapping label would be forwarded to the trigger and reopen it.
 */

export function Select({
  id,
  name,
  options,
  value,
  defaultValue = "",
  onValueChange,
  placeholder = "Select…",
  disabled = false,
  invalid = false,
  size = "md",
  className = "",
  "aria-describedby": describedBy,
  "aria-labelledby": labelledBy,
}) {
  const fallbackId = useId();
  const triggerId = id ?? fallbackId;
  const listId = `${triggerId}-listbox`;

  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = controlled ? value : internal;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState(null);

  const items = flatten(options);
  const selectedIndex = items.findIndex((item) => item.value === current);
  const selected = items[selectedIndex];

  function show(index) {
    if (disabled) return;

    setPosition(popoverPosition(triggerRef.current));
    setActiveIndex(index ?? (selectedIndex >= 0 ? selectedIndex : 0));
    setOpen(true);
    listRef.current?.showPopover?.();
  }

  function hide() {
    setOpen(false);
    listRef.current?.hidePopover?.();
  }

  function choose(index) {
    const item = items[index];
    if (!item) return;

    if (!controlled) setInternal(item.value);
    if (item.value !== current) onValueChange?.(item.value);

    hide();
    triggerRef.current?.focus();
  }

  // While open: a press anywhere else closes it, and so does a scroll or a
  // resize that would leave it floating away from its trigger. Scrolling the
  // list itself is fine.
  useEffect(() => {
    if (!open) return;

    // Local rather than `hide`, so the effect depends on `open` alone and the
    // listeners are bound once per opening, not once per render.
    function close() {
      setOpen(false);
      listRef.current?.hidePopover?.();
    }

    function handlePointerDown(event) {
      if (
        triggerRef.current?.contains(event.target) ||
        listRef.current?.contains(event.target)
      ) {
        return;
      }
      close();
    }

    function handleScroll(event) {
      if (listRef.current?.contains(event.target)) return;
      close();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", close);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Keeps the highlighted option in view as the keyboard walks the list.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function handleKeyDown(event) {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, items.length - 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        return;
      case "End":
        event.preventDefault();
        setActiveIndex(items.length - 1);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        return;
      case "Escape":
        // preventDefault, not just stopPropagation: Esc is also the drawer
        // dialog's close request, and only the list should close.
        event.preventDefault();
        event.stopPropagation();
        hide();
        return;
      case "Tab":
        hide();
        return;
      default:
        typeahead(event.key);
    }
  }

  /** One printable key jumps to the next option starting with it. */
  function typeahead(key) {
    if (key.length !== 1) return;

    const letter = key.toLowerCase();
    const start = activeIndex + 1;
    for (let offset = 0; offset < items.length; offset += 1) {
      const index = (start + offset) % items.length;
      if (items[index].label.toLowerCase().startsWith(letter)) {
        setActiveIndex(index);
        return;
      }
    }
  }

  const activeId = open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;

  return (
    <>
      {name ? <input type="hidden" name={name} value={current ?? ""} /> : null}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? hide() : show())}
        onKeyDown={handleKeyDown}
        className={`group inline-flex ${size === "sm" ? "h-8 text-13" : "h-9 text-sm"} w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 text-left outline-none transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 ${
          invalid
            ? "border-critical focus-visible:border-critical focus-visible:ring-critical/15"
            : open
              ? "border-brand ring-2 ring-brand/15"
              : "border-border-strong focus-visible:border-brand focus-visible:ring-brand/15"
        } ${className}`}
      >
        <span className={`truncate ${selected ? "text-foreground" : "text-muted"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        popover="manual"
        aria-labelledby={labelledBy ?? triggerId}
        style={position ?? undefined}
        className={POPOVER_LIST_CLASS}
      >
        <OptionList
          options={options}
          listId={listId}
          current={current}
          activeIndex={activeIndex}
          onHover={setActiveIndex}
          onChoose={choose}
        />
      </ul>
    </>
  );
}

/** Groups and flat options in one list, in display order. */
function flatten(options) {
  const items = [];
  for (const entry of options) {
    if (Array.isArray(entry.options)) items.push(...entry.options);
    else items.push(entry);
  }
  return items;
}

/**
 * Groups and options in display order. `index` counts across groups, so it
 * lines up with the flattened list the keyboard walks.
 */
function OptionList({ options, ...context }) {
  let index = -1;

  return options.map((entry) => {
    if (Array.isArray(entry.options)) {
      return (
        <li key={`group-${entry.label}`} role="presentation">
          <p
            role="presentation"
            className="px-3 pb-1 pt-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted"
          >
            {entry.label}
          </p>
          <ul role="group" aria-label={entry.label}>
            {entry.options.map((option) => {
              index += 1;
              return <Option key={option.value} option={option} index={index} {...context} />;
            })}
          </ul>
        </li>
      );
    }

    index += 1;
    return <Option key={entry.value} option={entry} index={index} {...context} />;
  });
}

function Option({ option, index, listId, current, activeIndex, onHover, onChoose }) {
  const isSelected = option.value === current;
  const isActive = index === activeIndex;

  return (
    <li
      id={`${listId}-${index}`}
      data-index={index}
      role="option"
      aria-selected={isSelected}
      // mousedown, not click: keeps focus on the trigger, so the outside-press
      // check and the trigger's blur never race the choice.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onChoose(index)}
      onPointerMove={() => onHover(index)}
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 transition-colors ${
        isActive ? "bg-neutral-bg" : ""
      } ${isSelected ? "font-medium" : ""} text-foreground`}
    >
      <span>{option.label}</span>
      {isSelected ? (
        <Check className="h-4 w-4 shrink-0 text-brand-text" strokeWidth={2} aria-hidden="true" />
      ) : null}
    </li>
  );
}
