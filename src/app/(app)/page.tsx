import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Flame } from "lucide-react";
import {
  PRIORITY_STYLES,
  STATUS_LABELS,
  avatarColor,
  formatDate,
  initials,
  isOverdue,
} from "@/lib/task-meta";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const tasks = await prisma.task.findMany({
    where: { ownerUserId: userId },
    include: { requester: true },
    orderBy: { createdAt: "desc" },
  });

  const open = tasks.filter((t) => t.status !== "Done");
  const highPriority = open.filter((t) => t.priority === "High");
  const overdue = open.filter((t) => isOverdue(t.dueDate, t.status));
  const doneCount = tasks.filter((t) => t.status === "Done").length;

  const upcoming = [...open]
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 6);

  const tiles = [
    { label: "Open Tasks", value: open.length, icon: Clock, color: "text-blue-600 bg-blue-100" },
    {
      label: "High Priority",
      value: highPriority.length,
      icon: Flame,
      color: "text-red-600 bg-red-100",
    },
    {
      label: "Overdue",
      value: overdue.length,
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-100",
    },
    {
      label: "Completed",
      value: doneCount,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-100",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s on your plate.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className={`mb-3 inline-flex rounded-lg p-2 ${tile.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-semibold text-slate-900">{tile.value}</p>
              <p className="text-sm text-slate-500">{tile.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Tasks</h2>
          <Link href="/board" className="text-sm font-medium text-blue-600 hover:underline">
            View board
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No open tasks yet. Add one from the board.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {upcoming.map((task) => {
              const overdueFlag = isOverdue(task.dueDate, task.status);
              return (
                <li key={task.id} className="flex items-center gap-4 py-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(
                      task.requester.name
                    )}`}
                  >
                    {initials(task.requester.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {task.requester.name} · {STATUS_LABELS[task.status]}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                  {task.dueDate && (
                    <span
                      className={`shrink-0 text-xs font-medium ${overdueFlag ? "text-red-600" : "text-slate-500"}`}
                    >
                      {overdueFlag ? "Overdue · " : ""}
                      {formatDate(task.dueDate)}
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
