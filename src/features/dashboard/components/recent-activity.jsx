import { Card } from "@/components/ui/card";
import { formatActivityTime } from "@/lib/format";
import { getRecentActivity } from "../queries/get-recent-activity";

export async function RecentActivity() {
  const events = await getRecentActivity();

  return (
    <Card title="Recent activity" className="pb-1">
      {events.length === 0 ? (
        <p className="px-5 pb-5 pt-3 text-sm text-muted">
          Nothing has happened yet. Restocks, banners, orders and enquiries
          will show up here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-baseline justify-between gap-4 px-5 py-3"
            >
              <span className="min-w-0 text-sm text-foreground">
                {event.description}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {formatActivityTime(event.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
