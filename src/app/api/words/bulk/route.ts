import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/serverAuth";

const bulkSchema = z.object({
  words: z
    .array(
      z.object({
        text: z.string().min(1).max(100),
        pos: z.string().max(30).optional(),
        meaning: z.string().min(1).max(300),
        phonetic: z.string().max(100).optional(),
        example: z.string().max(500).optional(),
        tags: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(5000),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const json = await req.json().catch(() => null);
    const parsed = bulkSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "参数错误" },
        { status: 400 },
      );
    }

    // SQLite 下 createMany 的 skipDuplicates 类型可能不可用；
    // 这里用 upsert 来实现“存在则更新，不存在则创建”（MVP 足够）。
    let upserted = 0;
    for (const w of parsed.data.words) {
      await prisma.word.upsert({
        where: { userId_text: { userId, text: w.text } },
        update: {
          pos: w.pos,
          meaning: w.meaning,
          phonetic: w.phonetic,
          example: w.example,
          tags: w.tags,
        },
        create: { ...w, userId },
      });
      upserted += 1;
    }
    return NextResponse.json({ ok: true, upserted });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
