export const STATUSES = ["New", "InProgress", "Blocked", "Done"] as const;
export type StatusValue = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<StatusValue, string> = {
  New: "New",
  InProgress: "In Progress",
  Blocked: "Blocked",
  Done: "Done",
};

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
