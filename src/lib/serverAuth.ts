import { prisma } from "@/lib/prisma";
import fs from "node:fs";
import path from "node:path";

type BuiltinWord = { text: string; pos?: string; meaning: string };

function loadBuiltinWords(): BuiltinWord[] {
  // 注意：这是“内置词库”，会随项目一起分发到每台电脑
  const csvPath = path.join(process.cwd(), "src", "lib", "builtin_wordlist.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const dataLines = lines.slice(1); // skip header

  const words: BuiltinWord[] = [];
  for (const line of dataLines) {
    // 源 CSV 为 4 列：序号,英文单词,词性,中文释义
    // 中文释义里可能包含逗号，所以只切前三个逗号，剩余都算释义
    const parts = line.split(",", 4);
    if (parts.length < 4) continue;
    const [, text, pos, meaning] = parts;
    const w = (text ?? "").trim();
    const m = (meaning ?? "").trim();
    if (!w || !m) continue;
    words.push({
      text: w,
      pos: (pos ?? "").trim() || undefined,
      meaning: m,
    });
  }
  return words;
}

export async function requireUserId() {
  // 匿名访客模式：所有请求都落到同一个“guest”用户
  const GUEST_EMAIL = "guest@local";
  const user = await prisma.user.upsert({
    where: { email: GUEST_EMAIL },
    update: {},
    create: {
      email: GUEST_EMAIL,
      // 不再使用登录，因此给一个占位 hash 即可
      passwordHash: "DISABLED",
      name: "GUEST",
      settings: { create: { dailyNewCount: 20 } },
    },
    select: { id: true },
  });

  // 如果该用户词库为空，则自动导入“内置词库”
  const count = await prisma.word.count({ where: { userId: user.id } });
  if (count === 0) {
    const builtin = loadBuiltinWords();
    for (const w of builtin) {
      await prisma.word.upsert({
        where: { userId_text: { userId: user.id, text: w.text } },
        update: { meaning: w.meaning, pos: w.pos },
        create: { userId: user.id, text: w.text, meaning: w.meaning, pos: w.pos },
      });
    }
  }

  return user.id;
}
