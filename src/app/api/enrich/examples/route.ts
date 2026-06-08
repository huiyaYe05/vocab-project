import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/serverAuth";

const schema = z.object({
  cursor: z.string().optional().nullable(),
  batchSize: z.number().int().min(1).max(50).default(20),
  mode: z.enum(["all", "missing"]).default("all"),
});

type DictResp = Array<{
  meanings?: Array<{
    definitions?: Array<{
      example?: string;
    }>;
  }>;
}>;

function pickExample(json: unknown): string | null {
  const data = json as DictResp;
  for (const entry of data ?? []) {
    for (const meaning of entry.meanings ?? []) {
      for (const def of meaning.definitions ?? []) {
        const ex = (def.example ?? "").trim();
        if (ex) return ex;
      }
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "参数错误" }, { status: 400 });
    }

    const { cursor, batchSize, mode } = parsed.data;

    const where =
      mode === "missing"
        ? { userId, OR: [{ example: null }, { example: "" }] }
        : { userId };

    const words = await prisma.word.findMany({
      where,
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, text: true, example: true },
    });

    let updated = 0;
    let processed = 0;
    const errors: Array<{ word: string; reason: string }> = [];

    for (const w of words) {
      processed += 1;

      // missing 模式：已有例句则跳过
      if (mode === "missing" && (w.example ?? "").trim()) continue;

      try {
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
          w.text,
        )}`;
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) {
          errors.push({ word: w.text, reason: `HTTP ${r.status}` });
          continue;
        }
        const data = await r.json();
        const ex = pickExample(data);
        if (!ex) continue;

        await prisma.word.update({
          where: { id: w.id },
          data: { example: ex },
        });
        updated += 1;
      } catch (e: any) {
        errors.push({ word: w.text, reason: e?.message ?? "UNKNOWN" });
      }
    }

    const nextCursor = words.length ? words[words.length - 1].id : null;

    return NextResponse.json({
      ok: true,
      processed,
      updated,
      nextCursor,
      done: words.length < batchSize,
      errors: errors.slice(0, 10),
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

