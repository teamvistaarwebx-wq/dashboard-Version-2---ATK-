"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatINRCompact, formatNumber } from "@/lib/format";
import { INQUIRY_BADGE } from "@/features/inquiries/lib/inquiry-status";

/** The latest corporate gifting enquiries in the range, as an activity list. */
export function RecentInquiriesCard({ inquiries, from, to }) {
  const rows = inquiries.filter((inquiry) => inquiry.dayKey >= from && inquiry.dayKey <= to).slice(0, 6);

  return (
    <Card
      title="Recent inquiries"
      subtitle="Latest corporate gifting requests"
      action={
        <Link href="/inquiries" className="text-13 font-medium text-brand-text hover:underline">
          View all
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="px-4 pb-6 pt-4 text-13 text-muted">No inquiries in this range.</p>
      ) : (
        <ul className="mt-2 px-2 pb-2">
          {rows.map((inquiry) => {
            const badge = INQUIRY_BADGE[inquiry.status];
            return (
              <li key={inquiry.id}>
                <Link
                  href={`/inquiries/${inquiry.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-muted"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface-muted text-muted"
                  >
                    <Building2 className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{inquiry.companyName}</span>
                    <span className="block truncate text-xs text-muted">
                      {inquiry.type} · {formatNumber(inquiry.headcount)} people · {inquiry.state}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{formatINRCompact(inquiry.budget)}</span>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
