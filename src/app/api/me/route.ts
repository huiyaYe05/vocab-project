import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

