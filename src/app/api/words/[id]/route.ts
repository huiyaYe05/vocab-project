import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/serverAuth";

const updateSchema = z.object({
  text: z.string().min(1).max(100).optional(),
  pos: z.string().max(30).optional().nullable(),
  meaning: z.string().min(1).max(300).optional(),
  phonetic: z.string().max(100).optional().nullable(),
  example: z.string().max(500).optional().nullable(),
  tags: z.string().max(300).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const json = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "参数错误" },
        { status: 400 },
      );
    }

    const existing = await prisma.word.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

    const word = await prisma.word.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ ok: true, word });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.word.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ ok: false }, { status: 404 });
    await prisma.word.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
