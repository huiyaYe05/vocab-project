import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/serverAuth";

const createSchema = z.object({
  text: z.string().min(1).max(100),
  pos: z.string().max(30).optional(),
  meaning: z.string().min(1).max(300),
  phonetic: z.string().max(100).optional(),
  example: z.string().max(500).optional(),
  tags: z.string().max(300).optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const words = await prisma.word.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, words });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const json = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "参数错误" },
        { status: 400 },
      );
    }

    const word = await prisma.word.create({
      data: { ...parsed.data, userId },
    });
    return NextResponse.json({ ok: true, word });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "创建失败（可能重复）" },
      { status: 400 },
    );
  }
}
