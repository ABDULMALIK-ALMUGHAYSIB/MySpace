import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Flame, PartyPopper } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import type { Task } from "@/lib/types";
import {
  PRIORITY_STYLES,
  STATUS_LABELS,
  avatarColor,
  formatDate,
  initials,
  isOverdue,
} from "@/lib/task-meta";

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) {
          setTasks(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const open = tasks.filter((t) => t.status !== "Done");
  const highPriority = open.filter((t) => t.priority === "High");
  const overdue = open.filter((t) => isOverdue(t.due_date, t.status));
  const doneCount = tasks.filter((t) => t.status === "Done").length;

  const upcoming = [...open]
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 6);

  const tiles = [
    {
      label: "Open Tasks",
      value: open.length,
      icon: Clock,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-500/15 dark:text-blue-400",
    },
    {
      label: "High Priority",
      value: highPriority.length,
      icon: Flame,
      color: "text-red-600 bg-red-100 dark:bg-red-500/15 dark:text-red-400",
    },
    {
      label: "Overdue",
      value: overdue.length,
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400",
    },
    {
      label: "Completed",
      value: doneCount,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400",
    },
  ];

  const firstName = (user?.user_metadata?.name as string | undefined)?.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Here&apos;s what&apos;s on your plate.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800"
              >
                <div className="mb-3 h-8 w-8 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="mb-2 h-7 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-700/60" />
              </div>
            ))
          : tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <div
                  key={tile.label}
                  className="rounded-2xl bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 dark:bg-slate-800"
                >
                  <div className={`mb-3 inline-flex rounded-lg p-2 ${tile.color}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {tile.value}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{tile.label}</p>
                </div>
              );
            })}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming Tasks</h2>
          <Link to="/board" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            View board
          </Link>
        </div>

        {loading ? (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 py-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-700/60" />
                </div>
              </li>
            ))}
          </ul>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <PartyPopper className="text-slate-300 dark:text-slate-600" size={28} />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No open tasks yet. Add one from the board.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {upcoming.map((task) => {
              const overdueFlag = isOverdue(task.due_date, task.status);
              return (
                <li key={task.id} className="flex items-center gap-4 py-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(
                      task.requester_name ?? "?"
                    )}`}
                  >
                    {task.requester_name ? initials(task.requester_name) : "–"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {task.title}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {task.requester_name ? task.requester_name : "No requester"} ·{" "}
                      {STATUS_LABELS[task.status]}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span
                      className={`shrink-0 text-xs font-medium ${overdueFlag ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      {overdueFlag ? "Overdue · " : ""}
                      {formatDate(task.due_date)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
