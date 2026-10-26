"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  addDays,
  addMonths,
  dayOfWeek,
  daysInMonth,
  formatKey,
  isDateKey,
  keyParts,
  makeKey,
  monthLabel,
} from "@/lib/date-keys";
import { PRESETS, detectPreset, rangeButtonLabel, resolvePreset } from "@/features/dashboard/lib/date-range";
import { Button } from "./button";
import { Drawer } from "./drawer";

/**
 * Date range picker: presets on the left, a two-month calendar on the right,
 * typed start/end dates, Cancel / Apply. Nothing changes until Apply.
 *
 * Desktop opens a popover under the button; below 640px the same content is
 * a bottom sheet. Future days (and days before the data starts) are disabled.
 *
 * Calendar keyboard: the grid is one tab stop; ←/→ move a day, ↑/↓ a week,
 * PageUp/PageDown a month, Enter picks. First pick sets the start, second the
 * end.
 */
export function DateRangePicker({ from, to, today, min, presetIds, onApply, label = "Date range", align = "end" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const isPhone = useMediaQuery("(max-width: 639px)");
  const isWide = useMediaQuery("(min-width: 800px)");
  const panelId = useId();

  const presets = presetIds ? PRESETS.filter((p) => presetIds.includes(p.id)) : PRESETS;

  useEffect(() => {
    if (!open || isPhone) return undefined;
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, isPhone]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  const panel = open ? (
    <RangePanel
      from={from}
      to={to}
      today={today}
      min={min}
      presets={presets}
      months={isWide ? 2 : 1}
      onCancel={close}
      onApply={(range) => {
        onApply(range);
        close();
      }}
    />
  ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${label}: ${rangeButtonLabel(from, to, today, presetIds)}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-border bg-surface px-3 text-13 font-medium text-foreground shadow-card transition-colors hover:border-border-strong hover:bg-surface-muted"
      >
        <CalendarDays className="size-4 text-muted" aria-hidden="true" />
        {rangeButtonLabel(from, to, today, presetIds)}
      </button>

      {open && isPhone ? (
        <Drawer side="bottom" title={label} onClose={close}>
          <div id={panelId} className="min-h-0 flex-1 overflow-y-auto">
            {panel}
          </div>
        </Drawer>
      ) : null}

      {open && !isPhone ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
          className={`absolute top-full z-40 mt-2 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-popover ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {panel}
        </div>
      ) : null}
    </div>
  );
}

function RangePanel({ from, to, today, min, presets, months, onCancel, onApply }) {
  const [draft, setDraft] = useState({ from, to });
  const [anchor, setAnchor] = useState(null);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState(() => {
    const { year, month } = keyParts(to);
    return { year, month };
  });

  const activePreset = detectPreset(draft.from, draft.to, today, presets.map((p) => p.id));

  function showMonthOf(key) {
    const { year, month } = keyParts(key);
    setView((current) => {
      const visibleStart = addMonths(makeKey(current.year, current.month, 1), -(months - 1));
      const visibleEnd = makeKey(current.year, current.month, daysInMonth(current.year, current.month));
      return key >= visibleStart && key <= visibleEnd ? current : { year, month };
    });
  }

  function pick(key) {
    if (!anchor) {
      setAnchor(key);
      setDraft({ from: key, to: key });
    } else {
      setDraft(key < anchor ? { from: key, to: anchor } : { from: anchor, to: key });
      setAnchor(null);
      setHover(null);
    }
  }

  function choosePreset(id) {
    const range = resolvePreset(id, today);
    setDraft({ from: min && range.from < min ? min : range.from, to: range.to });
    setAnchor(null);
    const { year, month } = keyParts(range.to);
    setView({ year, month });
  }

  function setTyped(field, value) {
    if (!isDateKey(value) || value > today || (min && value < min)) return;
    setAnchor(null);
    setDraft((current) => {
      const next = { ...current, [field]: value };
      return next.from > next.to ? { from: value, to: value } : next;
    });
    showMonthOf(value);
  }

  const monthList = Array.from({ length: months }, (_, index) => {
    const key = addMonths(makeKey(view.year, view.month, 1), index - (months - 1));
    return keyParts(key);
  });

  const preview = anchor && hover ? (hover < anchor ? { from: hover, to: anchor } : { from: anchor, to: hover }) : draft;
  const canGoForward = makeKey(view.year, view.month, 1) < makeKey(keyParts(today).year, keyParts(today).month, 1);

  return (
    <div className="flex flex-col sm:flex-row">
      <div
        role="group"
        aria-label="Presets"
        className="scrollbar-subtle relative flex gap-1 overflow-x-auto border-b border-border p-2 sm:w-40 sm:shrink-0 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r"
      >
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={activePreset === preset.id}
            onClick={() => choosePreset(preset.id)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-13 transition-colors ${
              activePreset === preset.id ? "bg-brand-tint font-medium text-brand-text" : "text-foreground hover:bg-neutral-bg"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <span
          className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-13 ${
            activePreset === "custom" ? "bg-brand-tint font-medium text-brand-text" : "text-muted"
          }`}
        >
          Custom
        </span>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setView((v) => keyParts(addMonths(makeKey(v.year, v.month, 1), -1)))}
            className="rounded-lg p-1.5 text-muted hover:bg-neutral-bg hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={!canGoForward}
            onClick={() => setView((v) => keyParts(addMonths(makeKey(v.year, v.month, 1), 1)))}
            className="rounded-lg p-1.5 text-muted hover:bg-neutral-bg hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex gap-6">
          {monthList.map(({ year, month }) => (
            <MonthGrid
              key={`${year}-${month}`}
              year={year}
              month={month}
              range={preview}
              today={today}
              min={min}
              onPick={pick}
              onHover={(key) => anchor && setHover(key)}
              onNavigate={showMonthOf}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <DateInput label="Start" value={draft.from} min={min} max={today} onChange={(value) => setTyped("from", value)} />
          <DateInput label="End" value={draft.to} min={min} max={today} onChange={(value) => setTyped("to", value)} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={Boolean(anchor)} onClick={() => onApply(draft)}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function DateInput({ label, value, min, max, onChange }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-lg border border-border-strong bg-surface px-2 font-mono text-13 text-foreground outline-none focus-visible:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
    </div>
  );
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function MonthGrid({ year, month, range, today, min, onPick, onHover, onNavigate }) {
  const gridRef = useRef(null);
  const first = makeKey(year, month, 1);
  const length = daysInMonth(year, month);
  const lead = dayOfWeek(first);
  const days = Array.from({ length }, (_, index) => makeKey(year, month, index + 1));

  const inMonth = (key) => key >= first && key <= days[length - 1];
  const focusable = inMonth(range.to) ? range.to : inMonth(range.from) ? range.from : inMonth(today) ? today : first;
  const [focusKey, setFocusKey] = useState(focusable);
  const current = inMonth(focusKey) ? focusKey : focusable;

  function disabled(key) {
    return key > today || (min && key < min);
  }

  function handleKeyDown(event) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next = null;
    if (event.key in moves) next = addDays(current, moves[event.key]);
    if (event.key === "PageUp") next = addMonths(current, -1);
    if (event.key === "PageDown") next = addMonths(current, 1);
    if (!next) return;

    event.preventDefault();
    if (next > today) return;
    setFocusKey(next);
    if (inMonth(next)) {
      requestAnimationFrame(() => gridRef.current?.querySelector(`[data-key="${next}"]`)?.focus());
    } else {
      onNavigate(next);
    }
  }

  return (
    <div className="w-full sm:w-[15.5rem]">
      <p className="mb-2 text-center text-13 font-medium" id={`month-${first}`}>
        {monthLabel(year, month)}
      </p>
      <div
        ref={gridRef}
        role="grid"
        aria-labelledby={`month-${first}`}
        onKeyDown={handleKeyDown}
        onPointerLeave={() => onHover(null)}
        className="grid grid-cols-7 gap-y-0.5"
      >
        {WEEKDAYS.map((day) => (
          <span key={day} role="columnheader" className="flex h-7 items-center justify-center text-xs text-muted">
            {day}
          </span>
        ))}
        {Array.from({ length: lead }, (_, index) => (
          <span key={`lead-${index}`} role="presentation" />
        ))}
        {days.map((key) => {
          const isStart = key === range.from;
          const isEnd = key === range.to;
          const within = key > range.from && key < range.to;
          const off = disabled(key);

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              data-key={key}
              tabIndex={key === current ? 0 : -1}
              disabled={off}
              aria-selected={isStart || isEnd || within}
              aria-label={formatKey(key, { year: true })}
              aria-current={key === today ? "date" : undefined}
              onClick={() => onPick(key)}
              onPointerEnter={() => onHover(key)}
              onFocus={() => setFocusKey(key)}
              className={`relative flex h-8 items-center justify-center font-mono text-13 transition-colors disabled:cursor-not-allowed disabled:text-subtle/60 ${
                isStart || isEnd
                  ? "rounded-lg bg-brand font-medium text-white"
                  : within
                    ? "bg-brand-tint text-brand-text"
                    : "rounded-lg text-foreground hover:bg-neutral-bg"
              } ${key === today && !isStart && !isEnd ? "underline decoration-2 underline-offset-4" : ""}`}
            >
              {keyParts(key).day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
