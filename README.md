# 背单词网页（MVP）

Next.js 全栈 + SQLite + Prisma（匿名访客模式：无需登录）。

## 已实现功能

- **学习页**：卡片翻转（释义/例句）、掌握度标记（不认识/模糊/认识/收藏）、支持设置“每日新词数量”
- **测试页**：选择题 + 拼写测试，自动回写正确/错误次数
- **词库页**：
  - 手动新增/删除
  - CSV/JSON 导入（基础版：同单词会覆盖更新释义/例句）

> 默认使用“访客词库”（所有数据写入同一个 guest 用户）。
>
> 另外：项目内置了一份默认词库（`src/lib/builtin_wordlist.csv`）。当数据库为空时，首次访问会自动把它导入到词库里。

## 本地启动

```bash
npm install

# 初始化/更新数据库（首次必跑）
npx prisma migrate dev

npm run dev
```

打开：http://localhost:3000

## 环境变量

项目默认使用 `.env`：

- `DATABASE_URL="file:./dev.db"`

## 导入格式

### CSV（推荐）

表头支持：

- `text, meaning, example, phonetic, tags`
- 或别名：`word`（等价 text）、`translation`（等价 meaning）

### JSON

支持两种结构：

- `[{ text, meaning, example? ... }, ...]`
- `{ "words": [ ... ] }`

同样支持别名：`word` / `translation`
