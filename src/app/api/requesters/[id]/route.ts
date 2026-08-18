import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.requester.findUnique({ where: { id } });
  if (!existing || existing.ownerUserId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { name, team, notes } = await request.json();
  const requester = await prisma.requester.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(team !== undefined && { team: team || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });

  return NextResponse.json(requester);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.requester.findUnique({ where: { id } });
  if (!existing || existing.ownerUserId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.requester.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
