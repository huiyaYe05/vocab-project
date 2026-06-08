"use client";

import { useMemo, useState } from "react";
import { speakEnglish } from "@/lib/tts";

type QueueItem = {
  id: string;
  text: string;
  meaning: string;
  phonetic?: string | null;
  example?: string | null;
  kind: "new" | "review";
};

const masteryButtons: { label: string; value: "UNKNOWN" | "FUZZY" | "KNOWN" | "FAVORITE" }[] =
  [
    { label: "不认识", value: "UNKNOWN" },
    { label: "模糊", value: "FUZZY" },
    { label: "认识", value: "KNOWN" },
    { label: "收藏", value: "FAVORITE" },
  ];

export function StudyQueue({
  queue,
  initialDailyNewCount,
}: {
  queue: QueueItem[];
  initialDailyNewCount: number;
}) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dailyNewCount, setDailyNewCount] = useState(initialDailyNewCount);

  const current = queue[idx];
  const progressText = useMemo(() => {
    if (queue.length === 0) return "今天暂无可学内容";
    return `${idx + 1} / ${queue.length}`;
  }, [idx, queue.length]);

  async function saveMastery(mastery: "UNKNOWN" | "FUZZY" | "KNOWN" | "FAVORITE") {
    if (!current) return;
    setSaving(true);
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: current.id, mastery, mode: "study" }),
      });
      setFlipped(false);
      setIdx((v) => Math.min(v + 1, queue.length));
    } finally {
      setSaving(false);
    }
  }

  async function updateDailyNewCount() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyNewCount }),
    });
    // 简化：提示用户刷新页面以重新计算队列
    alert("已保存。刷新页面后会按新计划重新计算今日新词数量。");
  }

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-600">{progressText}</div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-zinc-600">每日新词</div>
          <input
            className="w-20 rounded-md border px-2 py-1 text-sm"
            type="number"
            min={1}
            max={200}
            value={dailyNewCount}
            onChange={(e) => setDailyNewCount(Number(e.target.value))}
          />
          <button
            className="rounded-md border px-3 py-1 text-sm hover:bg-zinc-50"
            onClick={updateDailyNewCount}
          >
            保存
          </button>
        </div>
      </div>

      {current ? (
        <>
          <button
            className="mt-6 w-full rounded-2xl border bg-zinc-50 p-6 text-left hover:bg-zinc-100"
            onClick={() => setFlipped((v) => !v)}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-2xl font-semibold">{current.text}</div>
                  <button
                    type="button"
                    className="rounded-md border bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      speakEnglish(current.text);
                    }}
                    aria-label="朗读单词"
                    title="朗读"
                  >
                    朗读
                  </button>
                </div>
                {current.phonetic ? (
                  <div className="mt-1 text-sm text-zinc-600">
                    /{current.phonetic}/
                  </div>
                ) : null}
              </div>
              <div className="rounded-full border bg-white px-3 py-1 text-xs text-zinc-600">
                {current.kind === "new" ? "新词" : "复习"}
              </div>
            </div>

            <div className="mt-4 text-sm text-zinc-700">
              {flipped ? (
                <>
                  <div className="font-medium">释义</div>
                  <div className="mt-1 whitespace-pre-wrap">{current.meaning}</div>
                  {current.example ? (
                    <>
                      <div className="mt-4 font-medium">例句</div>
                      <div className="mt-1 whitespace-pre-wrap">{current.example}</div>
                    </>
                  ) : null}
                </>
              ) : (
                <div className="text-zinc-500">点击翻面查看释义 / 例句</div>
              )}
            </div>
          </button>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {masteryButtons.map((b) => (
              <button
                key={b.value}
                className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                disabled={saving}
                onClick={() => saveMastery(b.value)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-xl border bg-zinc-50 p-6 text-sm text-zinc-600">
          今天已完成啦。你可以去「测试」巩固一下，或者去「词库」导入/新增更多单词。
        </div>
      )}
    </div>
  );
}
