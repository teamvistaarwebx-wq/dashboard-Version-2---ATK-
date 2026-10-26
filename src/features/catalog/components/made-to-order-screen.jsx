"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyTable, ROW_LINK, TableScroll, TBODY, TD, TH, THEAD } from "@/components/ui/data-table";
import { Tabs } from "@/components/ui/tabs";
import { useUrlState } from "@/hooks/use-url-state";
import { formatINR, formatINRCompact, formatIstDate } from "@/lib/format";
import { subcategoryLabel } from "@/mocks/catalog";
import { useMockStore } from "@/mocks/store";
import { INQUIRY_BADGE } from "@/features/inquiries/lib/inquiry-status";
import { ProductThumb } from "./product-thumb";
import { STATUS_BADGE } from "./products-screen";

const OPEN = new Set(["new", "contacted", "quoted"]);
const TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

/**
 * The made-to-order catalogue: pieces with no stock that are only ever
 * quoted. Each row shows how many quote requests are open for it, and the
 * latest requests sit underneath.
 */
export function MadeToOrderScreen() {
  const store = useMockStore();
  const router = useRouter();
  const [params, setParams] = useUrlState();
  const tab = TABS.find((t) => t.value === params.get("status"))?.value ?? "all";

  const products = store.products.filter((p) => p.fulfillment === "made_to_order");
  const requests = store.inquiries.filter((inquiry) => inquiry.source === "made_to_order");
  const openByProduct = new Map();
  for (const inquiry of requests) {
    if (!OPEN.has(inquiry.status) || !inquiry.product) continue;
    openByProduct.set(inquiry.product.id, (openByProduct.get(inquiry.product.id) ?? 0) + 1);
  }

  const tabs = TABS.map((t) => ({ ...t, count: t.value === "all" ? products.length : products.filter((p) => p.status === t.value).length }));
  const rows = tab === "all" ? products : products.filter((p) => p.status === tab);

  return (
    <Page
      title="Made to order"
      actions={
        <ButtonLink href="/products/new?fulfillment=made_to_order">
          <Plus aria-hidden="true" />
          Add made-to-order piece
        </ButtonLink>
      }
    >
      <div className="flex flex-col gap-4">
        <Card>
          <div className="border-b border-border p-2">
            <Tabs label="Status" tabs={tabs} value={tab} controls="mto-table" onChange={(value) => setParams({ status: value === "all" ? null : value })} />
          </div>
          <div id="mto-table">
            {rows.length === 0 ? (
              <EmptyTable title="No made-to-order pieces here" />
            ) : (
              <TableScroll minWidth="48rem">
                <thead className={THEAD}>
                  <tr>
                    <th scope="col" className={TH}>Piece</th>
                    <th scope="col" className={TH}>Status</th>
                    <th scope="col" className={TH}>Category</th>
                    <th scope="col" className={`${TH} text-right`}>Lead time</th>
                    <th scope="col" className={`${TH} text-right`}>Open requests</th>
                    <th scope="col" className={`${TH} text-right`}>Price from</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {rows.map((product) => {
                    const badge = STATUS_BADGE[product.status];
                    const open = openByProduct.get(product.id) ?? 0;
                    return (
                      <tr key={product.id} onClick={() => router.push(`/products/${product.id}`)} className={ROW_LINK}>
                        <td className={TD}>
                          <div className="flex items-center gap-3">
                            <ProductThumb product={product} />
                            <div className="min-w-0">
                              <Link href={`/products/${product.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium hover:underline">
                                {product.title}
                              </Link>
                              <span className="font-mono text-xs text-muted">{product.sku}</span>
                            </div>
                          </div>
                        </td>
                        <td className={TD}>
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        </td>
                        <td className={`${TD} text-muted`}>{subcategoryLabel(product.subcategory)}</td>
                        <td className={`${TD} text-right font-mono tabular-nums`}>{product.leadTimeDays ?? "—"} days</td>
                        <td className={`${TD} text-right`}>
                          {open ? <Badge tone="gold">{open} open</Badge> : <span className="text-muted">—</span>}
                        </td>
                        <td className={`${TD} text-right font-mono tabular-nums`}>{formatINR(product.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableScroll>
            )}
          </div>
        </Card>

        <Card
          title="Latest quote requests"
          action={
            <Link href="/inquiries?type=made_to_order" className="text-13 font-medium text-brand-text hover:underline">
              View all
            </Link>
          }
        >
          <ul className="mt-2 divide-y divide-border">
            {requests.slice(0, 6).map((inquiry) => {
              const badge = INQUIRY_BADGE[inquiry.status];
              return (
                <li key={inquiry.id}>
                  <Link href={`/inquiries/${inquiry.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-13 transition-colors hover:bg-surface-muted">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{inquiry.companyName}</span>
                      <span className="block truncate text-xs text-muted">
                        {inquiry.headcount} × {inquiry.product?.title} · {formatIstDate(inquiry.createdAt)}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">{formatINRCompact(inquiry.budget)}</span>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
