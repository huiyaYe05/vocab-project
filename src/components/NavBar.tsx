import Link from "next/link";

export function NavBar() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          背单词
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/study" className="hover:underline">
            学习
          </Link>
          <Link href="/test" className="hover:underline">
            测试
          </Link>
          <Link href="/library" className="hover:underline">
            词库
          </Link>
        </nav>
      </div>
    </header>
  );
}
