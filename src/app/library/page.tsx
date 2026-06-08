"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { speakEnglish } from "@/lib/tts";

type Word = {
  id: string;
  text: string;
  pos?: string | null;
  meaning: string;
  phonetic?: string | null;
  example?: string | null;
  tags?: string | null;
};

export default function LibraryPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [pos, setPos] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{
    processed: number;
    updated: number;
  }>({ processed: 0, updated: 0 });
  const [enrichAbort, setEnrichAbort] = useState<AbortController | null>(null);

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/words");
    const data = await res.json();
    setWords(data.words ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const countText = useMemo(() => `${words.length} 个单词`, [words.length]);

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.trim(),
        pos: pos.trim() || undefined,
        meaning: meaning.trim(),
        example: example.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data?.error ?? "新增失败");
      return;
    }
    setText("");
    setPos("");
    setMeaning("");
    setExample("");
    await refresh();
    setMsg("已新增");
  }

  async function del(id: string) {
    await fetch(`/api/words/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function importWords(file: File) {
    setMsg(null);
    const name = file.name.toLowerCase();
    if (name.endsWith(".json")) {
      const text = await file.text();
      const json = JSON.parse(text);
      const arr: any[] = Array.isArray(json) ? json : json?.words;
      if (!Array.isArray(arr)) {
        setMsg("JSON格式不对：需要数组，或 { words: [...] }");
        return;
      }
      const payload = arr
        .map((x) => ({
          text: String(x.text ?? x.word ?? x["英文单词"] ?? "").trim(),
          pos: x.pos ?? x["词性"] ? String(x.pos ?? x["词性"]).trim() : undefined,
          meaning: String(x.meaning ?? x.translation ?? x["中文释义"] ?? "").trim(),
          phonetic: x.phonetic ? String(x.phonetic) : undefined,
          example: x.example ? String(x.example) : undefined,
          tags: x.tags ? String(x.tags) : undefined,
        }))
        .filter((x) => x.text && x.meaning);
      const res = await fetch("/api/words/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(data?.error ?? "导入失败");
      else
        setMsg(
          `导入完成：处理 ${data.upserted ?? 0} 条（同单词会覆盖更新释义/例句）`,
        );
      await refresh();
      return;
    }

    if (name.endsWith(".csv")) {
      const csvText = await file.text();
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const rows = (parsed.data as any[]) ?? [];
      const payload = rows
        .map((r) => ({
          text: String(r.text ?? r.word ?? r["英文单词"] ?? "").trim(),
          pos: r.pos ?? r["词性"] ? String(r.pos ?? r["词性"]).trim() : undefined,
          meaning: String(r.meaning ?? r.translation ?? r["中文释义"] ?? "").trim(),
          phonetic: r.phonetic ? String(r.phonetic) : undefined,
          example: r.example ? String(r.example) : undefined,
          tags: r.tags ? String(r.tags) : undefined,
        }))
        .filter((x) => x.text && x.meaning);
      const res = await fetch("/api/words/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(data?.error ?? "导入失败");
      else
        setMsg(
          `导入完成：处理 ${data.upserted ?? 0} 条（同单词会覆盖更新释义/例句）`,
        );
      await refresh();
      return;
    }

    setMsg("只支持 .csv 或 .json");
  }

  async function enrichAllExamples() {
    if (enriching) return;
    setMsg(null);
    setEnriching(true);
    setEnrichProgress({ processed: 0, updated: 0 });
    const controller = new AbortController();
    setEnrichAbort(controller);
    try {
      let cursor: string | null = null;
      // 全量：可能较多，分批处理
      // 每批 20 个，避免单次请求太久
      for (let round = 0; round < 9999; round += 1) {
        const resp: Response = await fetch("/api/enrich/examples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cursor, batchSize: 20, mode: "all" }),
          signal: controller.signal,
        });
        const data: any = await resp.json().catch(() => ({}));
        if (!resp.ok || !data?.ok) {
          setMsg(data?.error ?? "补全失败");
          break;
        }
        setEnrichProgress((p) => ({
          processed: p.processed + (data.processed ?? 0),
          updated: p.updated + (data.updated ?? 0),
        }));
        cursor = data.nextCursor ?? null;
        if (data.done) {
          setMsg(
            `补全完成：处理 ${data.processed ?? 0}，更新 ${data.updated ?? 0}（本次批次）。`,
          );
          break;
        }
      }
      await refresh();
    } catch (e: any) {
      if (e?.name === "AbortError") setMsg("已取消补全");
      else setMsg("补全失败");
    } finally {
      setEnriching(false);
      setEnrichAbort(null);
    }
  }

  function cancelEnrich() {
    enrichAbort?.abort();
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">词库</h1>
            <div className="mt-1 text-sm text-zinc-600">{countText}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
              onClick={enrichAllExamples}
              disabled={enriching}
              title="从在线词典批量抓取例句并写回词库（全量覆盖）"
            >
              {enriching ? "补全例句中..." : "一键补全例句"}
            </button>
            {enriching ? (
              <button
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
                onClick={cancelEnrich}
              >
                取消
              </button>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-zinc-50">
              <input
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importWords(f);
                  e.currentTarget.value = "";
                }}
              />
              导入 CSV/JSON
            </label>
          </div>
        </div>
        {enriching ? (
          <div className="mt-3 text-sm text-zinc-600">
            已处理 {enrichProgress.processed}，更新 {enrichProgress.updated}（累计）
          </div>
        ) : null}
        {msg ? (
          <div className="mt-3 rounded-md border bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            {msg}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <div className="font-medium">手动新增</div>
        <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={addWord}>
          <input
            className="rounded-md border px-3 py-2"
            placeholder="word / 单词"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="pos / 词性（可选，如 n. / vt.）"
            value={pos}
            onChange={(e) => setPos(e.target.value)}
          />
          <input
            className="md:col-span-2 rounded-md border px-3 py-2"
            placeholder="meaning / 释义"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            required
          />
          <input
            className="md:col-span-2 rounded-md border px-3 py-2"
            placeholder="example / 例句（可选）"
            value={example}
            onChange={(e) => setExample(e.target.value)}
          />
          <button className="md:col-span-2 rounded-md bg-black px-4 py-2 text-white hover:bg-zinc-800">
            新增
          </button>
        </form>
        <div className="mt-3 text-xs text-zinc-500">
          CSV表头建议：text, meaning, example, phonetic, tags（也支持 word/translation
          别名；也支持：英文单词/词性/中文释义）。
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <div className="font-medium">我的单词</div>
        {loading ? (
          <div className="mt-3 text-sm text-zinc-600">加载中...</div>
        ) : words.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-600">
            还没有单词，先导入或手动新增。
          </div>
        ) : (
          <ul className="mt-3 divide-y">
            {words.map((w) => (
              <li key={w.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">
                    {w.text}
                    {w.pos ? (
                      <span className="ml-2 text-xs font-normal text-zinc-500">
                        {w.pos}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm text-zinc-600 whitespace-pre-wrap">
                    {w.meaning}
                  </div>
                  {w.example ? (
                    <div className="mt-1 text-xs text-zinc-500 whitespace-pre-wrap">
                      {w.example}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 flex flex-col gap-2">
                  <button
                    className="rounded-md border px-3 py-1 text-sm hover:bg-zinc-50"
                    onClick={() => speakEnglish(w.text)}
                  >
                    朗读
                  </button>
                  <button
                    className="rounded-md border px-3 py-1 text-sm hover:bg-zinc-50"
                    onClick={() => del(w.id)}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
