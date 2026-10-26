import { StatPill } from "@/components/ui/stat-pill";
import { formatDateTime } from "@/lib/format";
import { ADMIN_STATUS } from "@/constants/enums";

const STATUS_TONES = {
  [ADMIN_STATUS.ACTIVE]: "success",
  [ADMIN_STATUS.INVITED]: "gold",
  [ADMIN_STATUS.DISABLED]: "muted",
};

export function TeamList({ users }) {
  if (users.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted">
        No team members yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {users.map((user) => (
        <li
          key={user.id}
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.fullName || user.email}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs capitalize text-muted">
              {user.role.replace(/_/g, " ")}
            </span>
            <StatPill tone={STATUS_TONES[user.status] ?? "muted"}>
              {user.status}
            </StatPill>
            <span className="hidden w-40 text-right text-xs text-muted sm:block">
              {user.lastLoginAt
                ? formatDateTime(user.lastLoginAt)
                : "Never signed in"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
