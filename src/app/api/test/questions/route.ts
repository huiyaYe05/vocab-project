import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/serverAuth";

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const words = (await prisma.word.findMany({
      where: { userId },
      take: 80,
      orderBy: { createdAt: "desc" },
    })) as Array<{ id: string; text: string; meaning: string }>;

    const pool = shuffle(words).slice(0, 20);
    const questions = pool.slice(0, 10).map((w) => {
      const distractors = shuffle(
        pool
          .filter((x) => x.id !== w.id)
          .slice(0, 12)
          .map((x) => x.text),
      ).slice(0, 3);
      const options = shuffle([w.text, ...distractors]).slice(0, 4);
      const answerIndex = options.indexOf(w.text);
      return {
        wordId: w.id,
        meaning: w.meaning,
        options,
        answerIndex,
      };
    });

    const spelling = pool.slice(0, 10).map((w) => ({
      wordId: w.id,
      meaning: w.meaning,
      answer: w.text,
    }));

    return NextResponse.json({ ok: true, questions, spelling });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
