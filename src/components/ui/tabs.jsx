"use client";

import { useRef } from "react";

/**
 * The view tabs across the top of a table card: All / Unfulfilled / …
 *
 * ARIA tabs with roving focus: ←/→ move between tabs, Home/End jump. They act
 * as filters on one shared table rather than switching panels, so each tab
 * points `aria-controls` at the same region.
 */
export function Tabs({ tabs, value, onChange, label, controls, className = "" }) {
  const listRef = useRef(null);

  function handleKeyDown(event) {
    const index = tabs.findIndex((tab) => tab.value === value);
    let next = null;

    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;

    event.preventDefault();
    onChange(tabs[next].value);
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={`scrollbar-subtle relative flex items-center gap-1 overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={controls}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-13 font-medium transition-colors ${
              selected
                ? "bg-neutral-bg text-foreground"
                : "text-muted hover:bg-neutral-bg/60 hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="font-mono text-xs text-muted">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
