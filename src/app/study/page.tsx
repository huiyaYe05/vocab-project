import { prisma } from "@/lib/prisma";
import { StudyQueue } from "@/components/StudyQueue";
import { requireUserId } from "@/lib/serverAuth";

export default async function StudyPage() {
  const userId = await requireUserId();

  const settings = await prisma.studySettings.upsert({
    where: { userId },
    update: {},
    create: { userId, dailyNewCount: 20 },
  });

  const now = new Date();
  const due = await prisma.wordProgress.findMany({
    where: { userId, nextReviewAt: { lte: now } },
    include: { word: true },
    orderBy: { nextReviewAt: "asc" },
    take: 50,
  });
  const typedDue = due as Array<{
    word: {
      id: string;
      text: string;
      meaning: string;
      phonetic: string | null;
      example: string | null;
    };
  }>;

  const newWords = await prisma.word.findMany({
    where: { userId, progress: { none: {} } },
    orderBy: { createdAt: "desc" },
    take: settings.dailyNewCount,
  });
  const typedNewWords = newWords as Array<{
    id: string;
    text: string;
    meaning: string;
    phonetic: string | null;
    example: string | null;
  }>;

  const queue = [
    ...typedDue.map((p: (typeof typedDue)[number]) => ({
      id: p.word.id,
      text: p.word.text,
      meaning: p.word.meaning,
      phonetic: p.word.phonetic,
      example: p.word.example,
      kind: "review" as const,
    })),
    ...typedNewWords.map((w: (typeof typedNewWords)[number]) => ({
      id: w.id,
      text: w.text,
      meaning: w.meaning,
      phonetic: w.phonetic,
      example: w.example,
      kind: "new" as const,
    })),
  ];

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">学习</h1>
            <div className="mt-1 text-sm text-zinc-600">
              今日计划：新词 {settings.dailyNewCount} 个；待复习 {due.length} 个
            </div>
          </div>
        </div>
      </div>

      <StudyQueue initialDailyNewCount={settings.dailyNewCount} queue={queue} />
    </section>
  );
}
