import { daysBetween } from "@/lib/date-keys";

export {
  addDays,
  dayOfWeek,
  dayStart,
  daysBetween,
  eachDay,
  istClock,
  istDateKey,
} from "@/lib/date-keys";

/**
 * Gifting peaks. The bump ramps up over the weeks before — corporate Diwali
 * orders are placed well ahead — and falls away quickly after.
 */
export const FESTIVALS = [
  { name: "Raksha Bandhan", date: "2024-08-19", lift: 0.35, lead: 12 },
  { name: "Diwali", date: "2024-11-01", lift: 0.75, lead: 24 },
  { name: "Raksha Bandhan", date: "2025-08-09", lift: 0.35, lead: 12 },
  { name: "Diwali", date: "2025-10-21", lift: 0.75, lead: 24 },
  { name: "Raksha Bandhan", date: "2026-08-28", lift: 0.35, lead: 12 },
  { name: "Diwali", date: "2026-11-08", lift: 0.75, lead: 24 },
];

/** Multiplier ≥ 1 for how festive a day is. */
export function festiveLift(key) {
  let lift = 0;

  for (const festival of FESTIVALS) {
    const until = daysBetween(key, festival.date);

    if (until >= 0 && until <= festival.lead) {
      // Rising towards the day.
      const progress = 1 - until / festival.lead;
      lift = Math.max(lift, festival.lift * progress * progress);
    } else if (until < 0 && until >= -4) {
      // A few days of tail after.
      lift = Math.max(lift, festival.lift * (1 + until / 5) * 0.5);
    }
  }

  return 1 + lift;
}
