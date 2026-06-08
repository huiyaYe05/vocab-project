import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/serverAuth";
import { beijingDayString } from "@/lib/day";

const masteryEnum = z.enum(["UNKNOWN", "FUZZY", "KNOWN", "FAVORITE"]);

const updateSchema = z.object({
  wordId: z.string().min(1),
  mastery: masteryEnum.optional(),
  correct: z.boolean().optional(),
  mode: z.enum(["study", "test"]).default("study"),
});

function nextReviewDate(mastery: z.infer<typeof masteryEnum>) {
  const days =
    mastery === "UNKNOWN"
      ? 1
      : mastery === "FUZZY"
        ? 2
        : mastery === "KNOWN"
          ? 4
          : 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
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

    const { wordId, mastery, correct, mode } = parsed.data;
    const now = new Date();

    // 确保这个词属于当前用户
    const word = await prisma.word.findFirst({ where: { id: wordId, userId } });
    if (!word) return NextResponse.json({ ok: false }, { status: 404 });

    let finalMastery = mastery;
    if (mode === "test" && typeof correct === "boolean") {
      if (!correct) finalMastery = "UNKNOWN";
    }

    const progress = await prisma.wordProgress.upsert({
      where: { userId_wordId: { userId, wordId } },
      update: {
        mastery: finalMastery,
        correctCount: typeof correct === "boolean" && correct ? { increment: 1 } : undefined,
        wrongCount: typeof correct === "boolean" && !correct ? { increment: 1 } : undefined,
        lastStudiedAt: now,
        nextReviewAt: finalMastery ? nextReviewDate(finalMastery) : undefined,
      },
      create: {
        userId,
        wordId,
        mastery: finalMastery ?? "UNKNOWN",
        correctCount: typeof correct === "boolean" && correct ? 1 : 0,
        wrongCount: typeof correct === "boolean" && !correct ? 1 : 0,
        lastStudiedAt: now,
        nextReviewAt: nextReviewDate(finalMastery ?? "UNKNOWN"),
      },
    });

    const day = beijingDayString(now);
    await prisma.studyDayStat.upsert({
      where: { userId_day: { userId, day } },
      update: {
        correct: typeof correct === "boolean" && correct ? { increment: 1 } : undefined,
        wrong: typeof correct === "boolean" && !correct ? { increment: 1 } : undefined,
      },
      create: {
        userId,
        day,
        correct: typeof correct === "boolean" && correct ? 1 : 0,
        wrong: typeof correct === "boolean" && !correct ? 1 : 0,
      },
    });

    return NextResponse.json({ ok: true, progress });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

