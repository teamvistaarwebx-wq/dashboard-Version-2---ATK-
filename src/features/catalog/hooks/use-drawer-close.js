"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildListHref } from "@/features/catalog/lib/product-list-url";

/**
 * Closing the product drawer, from either half of it.
 *
 * The panel and the form used to be one client component, so the close
 * callback was simply a prop. They are no longer: the panel now mounts with the
 * page shell while the form streams in behind a Suspense boundary, which puts a
 * *server* component between them — and a function cannot cross that boundary.
 * Both halves reach for this instead of passing one down.
 *
 * `replace`, not `push`: opening and closing the drawer five times should not
 * put five entries between the user and the page they came from.
 */
export function useDrawerClose() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const listHref = buildListHref(pathname, searchParams);

  function close() {
    startTransition(() => router.replace(listHref, { scroll: false }));
  }

  // `listHref` as well as `close`, because the form posts it as `returnTo` —
  // recomputing it there would be the same two hooks and the same helper.
  return { listHref, close };
}
