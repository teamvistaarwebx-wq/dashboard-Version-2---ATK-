"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * The contextual save bar: while a form has unsaved changes the top bar turns
 * into "Unsaved changes · Discard · Save".
 *
 * A form calls `useSaveBar({ dirty, onSave, onDiscard, saving })`; the top
 * bar reads the active registration with `useSaveBarState()`. It is a small
 * external store rather than context so that registering — which happens in
 * an effect — never sets React state mid-render.
 */

let active = null;
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return active;
}

function getServerSnapshot() {
  return null;
}

export function useSaveBarState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useSaveBar({ dirty, onSave, onDiscard, saving = false, saveLabel = "Save" }) {
  // Latest callbacks without re-registering on every keystroke.
  const handlers = useRef({ onSave, onDiscard });
  useEffect(() => {
    handlers.current = { onSave, onDiscard };
  });

  useEffect(() => {
    if (!dirty) return undefined;

    const entry = {
      saving,
      saveLabel,
      save: () => handlers.current.onSave?.(),
      discard: () => handlers.current.onDiscard?.(),
    };
    active = entry;
    emit();

    return () => {
      if (active === entry) {
        active = null;
        emit();
      }
    };
  }, [dirty, saving, saveLabel]);
}
