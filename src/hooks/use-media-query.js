"use client";

import { useSyncExternalStore } from "react";

/**
 * `useMediaQuery("(max-width: 639px)")`. False on the server and during
 * hydration, then the real answer — so markup that depends on it should be
 * something that can appear a frame late (a sheet instead of a popover).
 */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
