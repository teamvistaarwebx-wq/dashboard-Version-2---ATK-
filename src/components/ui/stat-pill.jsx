import { Badge } from "./badge";

/** Older name for Badge, kept for screens not yet redesigned. */
const TONE_MAP = { success: "success", gold: "gold", muted: "neutral", danger: "critical" };

export function StatPill({ children, tone = "muted" }) {
  return <Badge tone={TONE_MAP[tone] ?? "neutral"}>{children}</Badge>;
}
