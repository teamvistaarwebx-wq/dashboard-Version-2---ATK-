"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Drawer } from "@/components/ui/drawer";
import { AdjustStockForm } from "./adjust-stock-form";

/**
 * The adjust panel, opened by `?adjust=<inventory row id>`.
 *
 * URL-driven for the same reasons as the product drawer: Back closes it, the
 * row's current figures are server-rendered rather than fetched from here, and
 * one drawer is mounted rather than one per table row.
 */
export function AdjustStockDrawer({ row }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const listUrl = buildListUrl(pathname, searchParams);

  function close() {
    // replace, not push: opening and closing this five times should not put
    // five entries between the user and where they came from.
    startTransition(() => router.replace(listUrl, { scroll: false }));
  }

  return (
    <Drawer title="Adjust stock" onClose={close}>
      <AdjustStockForm row={row} returnTo={listUrl} onCancel={close} />
    </Drawer>
  );
}

function buildListUrl(pathname, searchParams) {
  const params = new URLSearchParams(searchParams);
  params.delete("adjust");

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
