"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Screen state that belongs in the address bar — the date range, the tab,
 * the search, the page — so a refresh or a shared link lands in the same
 * place. `set({ q: "silk", page: null })` merges; null or "" removes a key.
 * `replace`, not push: changing a filter should not add a Back step.
 */
export function useUrlState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const set = useCallback(
    (patch) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, router, pathname]
  );

  return [params, set];
}
