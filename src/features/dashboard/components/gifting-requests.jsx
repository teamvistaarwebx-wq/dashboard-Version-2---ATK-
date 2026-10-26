import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCompactPrice } from "@/lib/format";
import { getOpenInquiries } from "../queries/get-open-inquiries";

export async function GiftingRequests() {
  const { items, pipeline } = await getOpenInquiries();

  return (
    <Card
      title="Gifting requests"
      subtitle={`${formatCompactPrice(pipeline)} in open pipeline`}
      action={
        <Link
          href="/inquiries"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:gap-2.5"
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="px-5 pb-5 pt-3 text-sm text-muted">
          No open enquiries.
        </p>
      ) : (
        <ul className="flex flex-col gap-3.5 px-5 pb-5 pt-4">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {item.contactName}
                </p>
                <p className="truncate text-xs text-muted">
                  {item.madeToOrder
                    ? [item.companyName, `Made to order · ${item.units} units`]
                        .filter(Boolean)
                        .join(" · ")
                    : `${item.companyName}${
                        item.headcount > 0 ? ` · ${item.headcount} people` : ""
                      }`}
                </p>
              </div>

              <p className="shrink-0 text-sm font-bold text-brand">
                {formatCompactPrice(item.budget)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
