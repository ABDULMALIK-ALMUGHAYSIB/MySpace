import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BoardClient from "./board-client";

export default async function BoardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [tasks, requesters] = await Promise.all([
    prisma.task.findMany({
      where: { ownerUserId: userId },
      include: { requester: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.requester.findMany({
      where: { ownerUserId: userId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Board</h1>
        <p className="mt-1 text-sm text-slate-500">Track every task from request to done.</p>
      </div>

      <BoardClient
        initialTasks={tasks.map((t) => ({
          ...t,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        }))}
        requesters={requesters}
      />
    </div>
  );
}
