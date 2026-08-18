import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requesters = await prisma.requester.findMany({
    where: { ownerUserId: session.user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return NextResponse.json(requesters);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, team, notes } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const requester = await prisma.requester.create({
    data: { name, team: team || null, notes: notes || null, ownerUserId: session.user.id },
  });

  return NextResponse.json(requester);
}
