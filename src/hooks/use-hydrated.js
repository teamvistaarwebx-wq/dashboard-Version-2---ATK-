"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False during the server render and hydration, true after. Screens that
 * read the prototype's saved edits (localStorage) wait for it, so a product
 * added a minute ago is not reported "not found" for one frame.
 */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
