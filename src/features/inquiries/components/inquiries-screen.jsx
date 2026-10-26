"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Page } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ClientPagination,
  EmptyTable,
  ROW_LINK,
  SearchInput,
  TableScroll,
  TBODY,
  TD,
  TH,
  THEAD,
  pageParam,
} from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { useUrlState } from "@/hooks/use-url-state";
import { formatINRCompact, formatIstDate, formatNumber } from "@/lib/format";
import { useMockStore } from "@/mocks/store";
import { INQUIRY_BADGE, INQUIRY_TABS } from "../lib/inquiry-status";

const PAGE_SIZE = 25;

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "corporate_form", label: "Corporate box" },
  { value: "made_to_order", label: "Made to order" },
];

export function InquiriesScreen() {
  const store = useMockStore();
  const router = useRouter();
  const [params, setParams] = useUrlState();

  const tab = INQUIRY_TABS.find((t) => t.value === params.get("status"))?.value ?? "all";
  const type = params.get("type") ?? "";
  const query = (params.get("q") ?? "").toLowerCase();
  const page = pageParam(params.get("page"));

  const base = store.inquiries.filter(
    (inquiry) =>
      (!type || inquiry.source === type) &&
      (!query ||
        inquiry.companyName.toLowerCase().includes(query) ||
        inquiry.contactName.toLowerCase().includes(query) ||
        inquiry.inquiryNumber.toLowerCase().includes(query))
  );
  const tabs = INQUIRY_TABS.map((t) => ({ ...t, count: t.value === "all" ? base.length : base.filter((i) => i.status === t.value).length }));
  const filtered = tab === "all" ? base : base.filter((inquiry) => inquiry.status === tab);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Page title="Inquiries">
      <Card>
        <div className="flex flex-col gap-2 border-b border-border p-2 lg:flex-row lg:items-center lg:justify-between">
          <Tabs label="Inquiry status" tabs={tabs} value={tab} controls="inquiries-table" onChange={(value) => setParams({ status: value === "all" ? null : value, page: null })} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput label="Search inquiries" placeholder="Company, contact or number" defaultValue={params.get("q") ?? ""} onSearch={(value) => setParams({ q: value, page: null })} className="sm:w-64" />
            <span id="type-filter-label" className="sr-only">Type</span>
            <div className="sm:w-44">
              <Select id="type-filter" size="sm" aria-labelledby="type-filter-label" value={type} onValueChange={(value) => setParams({ type: value, page: null })} options={TYPE_OPTIONS} />
            </div>
          </div>
        </div>

        <div id="inquiries-table">
          {rows.length === 0 ? (
            <EmptyTable title="No inquiries match">Try another tab or search.</EmptyTable>
          ) : (
            <TableScroll minWidth="64rem">
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={TH}>Number</th>
                  <th scope="col" className={TH}>Company</th>
                  <th scope="col" className={TH}>Type</th>
                  <th scope="col" className={`${TH} text-right`}>Headcount</th>
                  <th scope="col" className={`${TH} text-right`}>Budget</th>
                  <th scope="col" className={TH}>Region</th>
                  <th scope="col" className={TH}>Needed by</th>
                  <th scope="col" className={TH}>Status</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {rows.map((inquiry) => {
                  const badge = INQUIRY_BADGE[inquiry.status];
                  return (
                    <tr key={inquiry.id} onClick={() => router.push(`/inquiries/${inquiry.id}`)} className={ROW_LINK}>
                      <td className={`${TD} whitespace-nowrap`}>
                        <Link href={`/inquiries/${inquiry.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs font-medium hover:underline">
                          {inquiry.inquiryNumber}
                        </Link>
                        <span className="block text-xs text-muted">{formatIstDate(inquiry.createdAt)}</span>
                      </td>
                      <td className={TD}>
                        <span className="block truncate font-medium">{inquiry.companyName}</span>
                        <span className="block truncate text-xs text-muted">{inquiry.contactName}</span>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>{inquiry.type}</td>
                      <td className={`${TD} text-right font-mono tabular-nums`}>{formatNumber(inquiry.headcount)}</td>
                      <td className={`${TD} text-right font-mono tabular-nums`}>{formatINRCompact(inquiry.budget)}</td>
                      <td className={`${TD} text-muted`}>{inquiry.state}</td>
                      <td className={`${TD} whitespace-nowrap text-muted`}>{formatIstDate(inquiry.neededBy)}</td>
                      <td className={TD}>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableScroll>
          )}
        </div>
        {filtered.length > 0 ? (
          <ClientPagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPage={(next) => setParams({ page: next === 1 ? null : next })} />
        ) : null}
      </Card>
    </Page>
  );
}
