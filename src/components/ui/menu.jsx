"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

/**
 * A button that opens a short list of actions (the account menu, row "…"
 * menus). ARIA menu-button pattern: Enter/Space/↓ open and focus the first
 * item, ↑/↓ move, Escape closes and returns focus to the button, Tab leaves.
 *
 * `items`: { label, href } | { label, onSelect } | { label, action } (a
 * server action, posted from a form) | { separator: true }. `header` renders
 * above the items, unfocusable. An item with `checked` (true or false) is a
 * radio option — the theme switch uses that.
 */
const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemradio"]';
export function Menu({
  label,
  buttonContent,
  buttonClassName = "",
  items,
  header,
  align = "end",
  placement = "bottom",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const items = rootRef.current?.querySelectorAll(ITEM_SELECTOR);
    // Land on the checked option when there is one, like a native select.
    (rootRef.current?.querySelector('[aria-checked="true"]') ?? items?.[0])?.focus();

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close({ refocus = true } = {}) {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }

  function handleMenuKeyDown(event) {
    const entries = [...rootRef.current.querySelectorAll(ITEM_SELECTOR)];
    const index = entries.indexOf(document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      entries[(index + 1) % entries.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      entries[(index - 1 + entries.length) % entries.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      entries[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      entries.at(-1)?.focus();
    } else if (event.key === "Tab") {
      close({ refocus: false });
    }
  }

  function handleButtonKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  }

  const itemClass =
    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-foreground outline-none transition-colors hover:bg-neutral-bg focus-visible:bg-neutral-bg focus-visible:outline-none [&_svg]:size-4 [&_svg]:text-muted";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleButtonKeyDown}
        className={buttonClassName}
      >
        {buttonContent}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={`absolute z-40 min-w-56 rounded-xl bg-surface p-1 shadow-popover ${
            align === "end" ? "right-0" : "left-0"
          } ${placement === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          {header ? <div className="px-2.5 pb-2 pt-1.5">{header}</div> : null}

          {items.map((item, index) => {
            if (item.separator) {
              return <div key={`sep-${index}`} role="separator" className="my-1 h-px bg-border" />;
            }

            const content = (
              <>
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.hint ? <span className="text-xs text-muted">{item.hint}</span> : null}
                {item.checked ? <Check className="text-brand-text!" aria-hidden="true" /> : null}
              </>
            );

            if (item.href) {
              return (
                <Link key={item.label} href={item.href} role="menuitem" tabIndex={-1} className={itemClass} onClick={() => close({ refocus: false })}>
                  {content}
                </Link>
              );
            }

            if (item.action) {
              return (
                <form key={item.label} action={item.action}>
                  <button type="submit" role="menuitem" tabIndex={-1} className={itemClass}>
                    {content}
                  </button>
                </form>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                role={item.checked === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={item.checked}
                tabIndex={-1}
                disabled={item.disabled}
                className={`${itemClass} disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => {
                  close();
                  item.onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
