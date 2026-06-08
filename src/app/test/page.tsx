"use client";

import { useEffect, useMemo, useState } from "react";
import { speakEnglish } from "@/lib/tts";

type MCQ = {
  wordId: string;
  meaning: string;
  options: string[];
  answerIndex: number;
};

type SpellingQ = {
  wordId: string;
  meaning: string;
  answer: string;
};

export default function TestPage() {
  const [tab, setTab] = useState<"mcq" | "spelling">("mcq");
  const [mcq, setMcq] = useState<MCQ[]>([]);
  const [spelling, setSpelling] = useState<SpellingQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/test/questions");
      const data = await res.json();
      setMcq(data.questions ?? []);
      setSpelling(data.spelling ?? []);
      setIdx(0);
      setScore({ correct: 0, wrong: 0 });
      setInput("");
      setLoading(false);
    })();
  }, []);

  const list = tab === "mcq" ? mcq : spelling;
  const current = list[idx] as MCQ | SpellingQ | undefined;
  const done = idx >= list.length;

  const progressText = useMemo(() => {
    if (loading) return "加载中...";
    if (!list.length) return "词库为空，先去「词库」导入/新增一些单词吧。";
    return `${Math.min(idx + 1, list.length)} / ${list.length}`;
  }, [idx, list.length, loading]);

  async function report(wordId: string, correct: boolean) {
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId, correct, mode: "test" }),
    });
  }

  async function answerMcq(choiceIndex: number) {
    const q = current as MCQ | undefined;
    if (!q) return;
    const correct = choiceIndex === q.answerIndex;
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    await report(q.wordId, correct);
    setIdx((v) => v + 1);
  }

  async function submitSpelling() {
    const q = current as SpellingQ | undefined;
    if (!q) return;
    const correct = input.trim().toLowerCase() === q.answer.trim().toLowerCase();
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    await report(q.wordId, correct);
    setInput("");
    setIdx((v) => v + 1);
  }

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/test/questions");
    const data = await res.json();
    setMcq(data.questions ?? []);
    setSpelling(data.spelling ?? []);
    setIdx(0);
    setScore({ correct: 0, wrong: 0 });
    setInput("");
    setLoading(false);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">测试</h1>
            <div className="mt-1 text-sm text-zinc-600">
              {progressText} · 正确 {score.correct} / 错误 {score.wrong}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`rounded-md border px-3 py-1 text-sm ${tab === "mcq" ? "bg-black text-white" : "hover:bg-zinc-50"}`}
              onClick={() => {
                setTab("mcq");
                setIdx(0);
                setScore({ correct: 0, wrong: 0 });
              }}
            >
              选择题
            </button>
            <button
              className={`rounded-md border px-3 py-1 text-sm ${tab === "spelling" ? "bg-black text-white" : "hover:bg-zinc-50"}`}
              onClick={() => {
                setTab("spelling");
                setIdx(0);
                setScore({ correct: 0, wrong: 0 });
              }}
            >
              拼写
            </button>
            <button
              className="rounded-md border px-3 py-1 text-sm hover:bg-zinc-50"
              onClick={reload}
            >
              换一组
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        {loading ? (
          <div className="text-sm text-zinc-600">加载中...</div>
        ) : !list.length ? (
          <div className="text-sm text-zinc-600">
            词库为空，先去「词库」导入/新增一些单词吧。
          </div>
        ) : done ? (
          <div className="space-y-3">
            <div className="text-lg font-semibold">完成！</div>
            <div className="text-sm text-zinc-600">
              本次正确 {score.correct}，错误 {score.wrong}。
            </div>
            <button
              className="rounded-md bg-black px-4 py-2 text-white hover:bg-zinc-800"
              onClick={reload}
            >
              再来一组
            </button>
          </div>
        ) : tab === "mcq" ? (
          <div className="space-y-4">
            <div className="text-sm text-zinc-600">根据释义选择单词：</div>
            <div className="rounded-xl border bg-zinc-50 p-4 text-lg font-medium">
              {(current as MCQ).meaning}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {(current as MCQ).options.map((opt, i) => (
                <div
                  key={opt + i}
                  className="flex items-stretch gap-2 rounded-md border bg-white p-2"
                >
                  <button
                    className="flex-1 rounded-md px-2 py-2 text-left hover:bg-zinc-50"
                    onClick={() => answerMcq(i)}
                  >
                    {opt}
                  </button>
                  <button
                    className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
                    onClick={() => speakEnglish(opt)}
                    title="朗读"
                    aria-label="朗读选项"
                  >
                    朗读
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-zinc-600">根据释义输入单词：</div>
            <div className="rounded-xl border bg-zinc-50 p-4 text-lg font-medium">
              {(current as SpellingQ).meaning}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border px-3 py-2"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitSpelling();
                }}
                placeholder="输入单词..."
              />
              <button
                className="rounded-md border px-4 py-2 text-sm hover:bg-zinc-50"
                onClick={() => speakEnglish((current as SpellingQ).answer)}
                title="朗读答案（练拼写可用）"
              >
                朗读
              </button>
              <button
                className="rounded-md bg-black px-4 py-2 text-white hover:bg-zinc-800"
                onClick={submitSpelling}
              >
                提交
              </button>
            </div>
            <div className="text-xs text-zinc-500">
              提示：大小写不敏感，去除首尾空格后判断。
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
