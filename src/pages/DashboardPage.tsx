import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Flame, PartyPopper } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { useBoards } from "@/context/BoardsProvider";
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
  const { boards, loading: boardsLoading } = useBoards();
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

  const tasksByBoard = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const list = map.get(t.board_id);
      if (list) list.push(t);
      else map.set(t.board_id, [t]);
    }
    return map;
  }, [tasks]);

  function upcomingFor(boardTasks: Task[]) {
    return [...boardTasks]
      .filter((t) => t.status !== "Done")
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 5);
  }

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

      <div className="flex flex-col gap-6">
        {loading || boardsLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
                <div className="mb-4 h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <li key={j} className="flex items-center gap-4 py-3">
                      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-700/60" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          : boards.map((board) => {
              const boardTasks = tasksByBoard.get(board.id) ?? [];
              const boardOpen = boardTasks.filter((t) => t.status !== "Done");
              const boardOverdue = boardOpen.filter((t) => isOverdue(t.due_date, t.status));
              const boardUpcoming = upcomingFor(boardTasks);

              return (
                <div key={board.id} className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {board.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {boardOpen.length} open
                        {boardOverdue.length > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {" "}
                            · {boardOverdue.length} overdue
                          </span>
                        )}
                      </p>
                    </div>
                    <Link
                      to={`/board/${board.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View board
                    </Link>
                  </div>

                  {boardUpcoming.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <PartyPopper className="text-slate-300 dark:text-slate-600" size={26} />
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        No open tasks on this board.
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
                      {boardUpcoming.map((task) => {
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
              );
            })}
      </div>
    </div>
  );
}
