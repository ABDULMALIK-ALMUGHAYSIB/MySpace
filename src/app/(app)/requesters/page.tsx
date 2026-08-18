import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import RequestersClient from "./requesters-client";

export default async function RequestersPage() {
  const session = await auth();
  const userId = session!.user.id;

  const requesters = await prisma.requester.findMany({
    where: { ownerUserId: userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Requesters</h1>
        <p className="mt-1 text-sm text-slate-500">
          People who send you tasks. Reuse them instead of retyping names.
        </p>
      </div>

      <RequestersClient
        initialRequesters={requesters.map((r) => ({
          id: r.id,
          name: r.name,
          team: r.team,
          notes: r.notes,
          taskCount: r._count.tasks,
        }))}
      />
    </div>
  );
}
