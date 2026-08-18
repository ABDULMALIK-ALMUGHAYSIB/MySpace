import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { ownerUserId: session.user.id },
    include: { requester: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, requesterId, priority, status, dueDate } = await request.json();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (requesterId) {
    const requester = await prisma.requester.findUnique({ where: { id: requesterId } });
    if (!requester || requester.ownerUserId !== session.user.id) {
      return NextResponse.json({ error: "Invalid requester" }, { status: 400 });
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      ...(requesterId && { requesterId }),
      priority: priority || "Medium",
      status: status || "New",
      dueDate: dueDate ? new Date(dueDate) : null,
      ownerUserId: session.user.id,
    },
    include: { requester: true },
  });

  return NextResponse.json(task);
}
