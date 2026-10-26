/** Pill wording and tone for an inquiry's stage. */
export const INQUIRY_BADGE = {
  new: { label: "New", tone: "gold" },
  contacted: { label: "Contacted", tone: "neutral" },
  quoted: { label: "Quoted", tone: "warning" },
  won: { label: "Won", tone: "success" },
  lost: { label: "Lost", tone: "critical" },
};

export const INQUIRY_TABS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const INQUIRY_STATUS_OPTIONS = INQUIRY_TABS.slice(1).map(({ value, label }) => ({ value, label }));
