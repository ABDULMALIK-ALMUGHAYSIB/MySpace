// The default stages every new board starts with. Boards can rename these and append
// custom ones (see Board.stage_order/stage_labels), so a task's status is no longer a
// fixed enum — just a string key that must appear in its board's stage_order.
export const STATUSES: string[] = ["New", "InProgress", "Blocked", "Done"];
export type StatusValue = string;

export const STATUS_LABELS: Record<string, string> = {
  New: "New",
  InProgress: "In Progress",
  Blocked: "Blocked",
  Done: "Done",
};

// Palette for stage (Kanban column) header colors. New/InProgress/Blocked/Done keep their
// traditional colors by default; any custom stage a board adds gets a deterministic color
// from this same palette (see defaultStageColor), and either can be changed in board settings.
export const STAGE_COLORS = [
  "slate",
  "blue",
  "red",
  "emerald",
  "purple",
  "amber",
  "pink",
  "teal",
  "indigo",
  "cyan",
] as const;
export type StageColor = (typeof STAGE_COLORS)[number];

const DEFAULT_STAGE_COLORS: Partial<Record<string, StageColor>> = {
  New: "slate",
  InProgress: "blue",
  Blocked: "red",
  Done: "emerald",
};

export const STAGE_COLOR_BORDER_CLASS: Record<StageColor, string> = {
  slate: "border-t-slate-400",
  blue: "border-t-blue-500",
  red: "border-t-red-500",
  emerald: "border-t-emerald-500",
  purple: "border-t-purple-500",
  amber: "border-t-amber-500",
  pink: "border-t-pink-500",
  teal: "border-t-teal-500",
  indigo: "border-t-indigo-500",
  cyan: "border-t-cyan-500",
};

export const STAGE_COLOR_SWATCH_CLASS: Record<StageColor, string> = {
  slate: "bg-slate-400",
  blue: "bg-blue-500",
  red: "bg-red-500",
  emerald: "bg-emerald-500",
  purple: "bg-purple-500",
  amber: "bg-amber-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  cyan: "bg-cyan-500",
};

export function defaultStageColor(statusKey: string): StageColor {
  const known = DEFAULT_STAGE_COLORS[statusKey];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < statusKey.length; i++) hash = statusKey.charCodeAt(i) + ((hash << 5) - hash);
  return STAGE_COLORS[Math.abs(hash) % STAGE_COLORS.length];
}

export const PRIORITIES = ["High", "Medium", "Low"] as const;
export type PriorityValue = (typeof PRIORITIES)[number];

export const PRIORITY_STYLES: Record<PriorityValue, string> = {
  High: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  Medium:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
};

// Strips dark: variants from a class string, for elements that must stay
// on their light styling even when the app is in dark mode.
export function forceLight(className: string) {
  return className
    .split(" ")
    .filter((c) => !c.startsWith("dark:"))
    .join(" ");
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-cyan-600",
];

export function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Intentionally no dark: variants — these stay on their light pastel tint even when
// the app is in dark mode, so any text on top of them must be forced light too.
const CARD_TINTS = [
  "bg-blue-50 ring-blue-100 hover:ring-blue-300",
  "bg-purple-50 ring-purple-100 hover:ring-purple-300",
  "bg-pink-50 ring-pink-100 hover:ring-pink-300",
  "bg-amber-50 ring-amber-100 hover:ring-amber-300",
  "bg-teal-50 ring-teal-100 hover:ring-teal-300",
  "bg-indigo-50 ring-indigo-100 hover:ring-indigo-300",
];

export function cardTint(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_TINTS[Math.abs(hash) % CARD_TINTS.length];
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "Done") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function daysRemaining(dueDate: string | null, status: string) {
  if (!dueDate || status === "Done") return null;
  const today = new Date(new Date().toDateString());
  const due = new Date(new Date(dueDate).toDateString());
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return null;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}
