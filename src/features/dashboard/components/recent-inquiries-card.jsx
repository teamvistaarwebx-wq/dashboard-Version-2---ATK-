"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatINRCompact, formatNumber } from "@/lib/format";
import { INQUIRY_BADGE } from "@/features/inquiries/lib/inquiry-status";

export function RecentInquiriesCard({ inquiries, from, to }) {
  const router = useRouter();
  const rows = inquiries.filter((inquiry) => inquiry.dayKey >= from && inquiry.dayKey <= to).slice(0, 6);

  return (
    <Card
      title="Recent inquiries"
      action={
        <Link href="/inquiries" className="text-13 font-medium text-brand-text hover:underline">
          View all
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="px-4 pb-6 pt-4 text-13 text-muted">No inquiries in this range.</p>
      ) : (
        <div className="relative mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-13">
            <thead className="border-y border-border bg-surface-muted text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Company</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Headcount</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Budget</th>
                <th scope="col" className="px-4 py-2 font-medium">Status</th>
                <th scope="col" className="px-4 py-2 font-medium">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((inquiry) => {
                const badge = INQUIRY_BADGE[inquiry.status];
                return (
                  <tr
                    key={inquiry.id}
                    onClick={() => router.push(`/inquiries/${inquiry.id}`)}
                    className="cursor-pointer transition-colors hover:bg-surface-muted"
                  >
                    <td className="px-4 py-2.5">
                      <Link href={`/inquiries/${inquiry.id}`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                        {inquiry.companyName}
                      </Link>
                      <span className="block truncate text-xs text-muted">{inquiry.type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatNumber(inquiry.headcount)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatINRCompact(inquiry.budget)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{inquiry.state}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
