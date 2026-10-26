"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

/**
 * Light / dark / system theme, chosen from the top bar.
 *
 * "system" removes the attribute so prefers-color-scheme decides; "light"
 * and "dark" set data-theme on <html>, which globals.css honours over the
 * system setting. The choice lives in localStorage, and THEME_SCRIPT applies
 * it before first paint so a dark-mode user never sees a white flash.
 */
const THEMES = ["light", "dark", "system"];
const EVENT = "atk-theme-change";

function read() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function setTheme(theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;

  try {
    if (theme === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies until the tab closes.
  }

  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The saved choice: "light", "dark" or "system". */
export function useThemeChoice() {
  return useSyncExternalStore(subscribe, read, () => "system");
}

/**
 * Calls `onChange` whenever the effective theme may have changed: the user
 * picked one, or the system flipped while on "system". For code that reads
 * CSS tokens directly, like the canvas chart.
 */
export function subscribeEffectiveTheme(onChange) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    media.removeEventListener("change", onChange);
    observer.disconnect();
  };
}
