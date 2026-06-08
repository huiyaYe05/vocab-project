import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/serverAuth";

const updateSchema = z.object({
  dailyNewCount: z.number().int().min(1).max(200),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const settings = await prisma.studySettings.upsert({
      where: { userId },
      update: {},
      create: { userId, dailyNewCount: 20 },
    });
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const json = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "参数错误" },
        { status: 400 },
      );
    }

    const settings = await prisma.studySettings.upsert({
      where: { userId },
      update: { dailyNewCount: parsed.data.dailyNewCount },
      create: { userId, dailyNewCount: parsed.data.dailyNewCount },
    });
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

