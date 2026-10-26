"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Mail, Phone } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatINR, formatIstDate, formatIstDateTime, formatNumber } from "@/lib/format";
import { setMockInquiryStatus, useMockStore } from "@/mocks/store";
import { INQUIRY_BADGE, INQUIRY_STATUS_OPTIONS } from "../lib/inquiry-status";

export function InquiryDetailScreen({ inquiryId }) {
  const store = useMockStore();
  const toast = useToast();
  const inquiry = store.inquiries.find((i) => i.id === inquiryId);
  const [status, setStatus] = useState(inquiry?.status ?? "new");

  if (!inquiry) {
    return (
      <Page title="Inquiry not found" backHref="/inquiries" backLabel="Back to inquiries">
        <Card>
          <p className="px-4 py-12 text-center text-13 text-muted">There is no inquiry {inquiryId} in the prototype data.</p>
        </Card>
      </Page>
    );
  }

  const badge = INQUIRY_BADGE[inquiry.status];
  const madeToOrder = inquiry.source === "made_to_order";
  const details = [
    ["Type", inquiry.type],
    ["Occasion", inquiry.occasion],
    [madeToOrder ? "Pieces" : "Headcount", formatNumber(inquiry.headcount)],
    ["Budget", formatINR(inquiry.budget)],
    [madeToOrder ? "Per piece" : "Per person", formatINR(Math.round(inquiry.budget / Math.max(1, inquiry.headcount)))],
    ["Needed by", formatIstDate(inquiry.neededBy)],
    ["Region", inquiry.state],
  ];

  return (
    <Page
      title={inquiry.companyName}
      backHref="/inquiries"
      backLabel="Back to inquiries"
      titleMeta={<Badge tone={badge.tone}>{badge.label}</Badge>}
      actions={<span className="font-mono text-xs text-muted">{inquiry.inquiryNumber}</span>}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title="Message">
            <p className="p-4 pt-2 text-sm leading-relaxed">{inquiry.message}</p>
          </Card>

          <Card title="Request">
            <dl className="grid gap-x-6 gap-y-3 p-4 pt-3 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-border pb-2 text-13 sm:block sm:border-0 sm:pb-0">
                  <dt className="text-muted">{label}</dt>
                  <dd className={/₹|\d/.test(value) ? "font-mono" : ""}>{value}</dd>
                </div>
              ))}
            </dl>
            {inquiry.product ? (
              <div className="border-t border-border px-4 py-3 text-13">
                Product:{" "}
                <Link href={`/products/${inquiry.product.id}`} className="font-medium text-brand-text hover:underline">
                  {inquiry.product.title}
                </Link>{" "}
                <span className="font-mono text-xs text-muted">{inquiry.product.sku}</span>
              </div>
            ) : null}
          </Card>

          <Card title="Activity">
            <ol className="flex flex-col gap-3 p-4 pt-3 text-13">
              {inquiry.status !== "new" ? (
                <li>
                  Moved to <Badge tone={badge.tone}>{badge.label}</Badge>
                </li>
              ) : null}
              <li>
                Received via {madeToOrder ? "made-to-order quote form" : "corporate gifting form"}
                <span className="block text-xs text-muted">{formatIstDateTime(inquiry.createdAt, { withYear: true })}</span>
              </li>
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Status">
            <div className="flex flex-col gap-2 p-4 pt-3">
              <span id="inquiry-status-label" className="sr-only">Inquiry status</span>
              <Select id="inquiry-status" aria-labelledby="inquiry-status-label" value={status} onValueChange={setStatus} options={INQUIRY_STATUS_OPTIONS} />
              <Button
                disabled={status === inquiry.status}
                onClick={() => {
                  setMockInquiryStatus(inquiry.id, status);
                  toast(`Inquiry marked ${INQUIRY_BADGE[status].label.toLowerCase()}`);
                }}
              >
                Update status
              </Button>
            </div>
          </Card>

          <Card title="Contact">
            <ul className="flex flex-col gap-2 p-4 pt-3 text-13">
              <li className="flex items-center gap-2">
                <Building2 className="size-4 text-muted" aria-hidden="true" />
                {inquiry.contactName}, {inquiry.companyName}
              </li>
              <li className="flex items-center gap-2 break-all">
                <Mail className="size-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="text-brand-text">{inquiry.email}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-muted" aria-hidden="true" />
                <span className="font-mono">{inquiry.phone}</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </Page>
  );
}
