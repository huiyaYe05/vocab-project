import Link from "next/link";

export default function Home() {
  return (
    <section className="rounded-2xl border bg-white p-8">
      <h1 className="text-2xl font-semibold">每日打卡背单词</h1>
      <p className="mt-2 text-sm text-zinc-600">
        学习卡片翻转 + 掌握度标记 + 选择题/拼写测试。无需登录即可使用。
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/study"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-zinc-800"
        >
          开始学习
        </Link>
        <Link href="/library" className="rounded-md border px-4 py-2 hover:bg-zinc-50">
          管理词库
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="font-medium">学习</div>
          <div className="mt-1 text-sm text-zinc-600">
            卡片翻转，例句辅助记忆，标记掌握程度。
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="font-medium">测试</div>
          <div className="mt-1 text-sm text-zinc-600">
            选择题 + 拼写，记录对错并回写进度。
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="font-medium">词库</div>
          <div className="mt-1 text-sm text-zinc-600">
            支持手动新增/编辑，以及 CSV/JSON 导入（基础版）。
          </div>
        </div>
      </div>
    </section>
  );
}
