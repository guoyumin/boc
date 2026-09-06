import type { Metadata } from "next";
import Link from "next/link";
import { PLAY_LINKS } from "@/lib/urls";

// 主页站（www.zurich-boca.party）的外壳。功能站的顶栏和底部 tab bar 不在这里出现。
export const metadata: Metadata = {
  title: "苏黎世血染钟楼 · Blood on the Clocktower Zurich",
  description:
    "苏黎世的《血染钟楼》据点。每周一次，ETH Hönggerberg，桌上说中文，新人友好，说书人带你入门。",
};

const SECTIONS = [
  { href: "/#about", label: "关于我们" },
  { href: "/#what", label: "这是什么游戏" },
  { href: "/#first", label: "第一次来" },
  { href: "/#faq", label: "常见问题" },
];

export default function WwwLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-5 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-1.5 font-semibold text-stone-800">
            <span className="text-brand">🩸</span> 苏黎世血染钟楼
          </Link>
          {/* 锚点导航在手机上会挤成一列，直接藏掉，页面本身就是从上往下读的 */}
          <nav className="hidden flex-1 items-center gap-4 text-sm text-stone-500 sm:flex">
            {SECTIONS.map((s) => (
              <a key={s.href} href={s.href} className="hover:text-brand">
                {s.label}
              </a>
            ))}
          </nav>
          <a href={PLAY_LINKS.events()} className="btn btn-primary btn-sm">
            活动报名
          </a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-12">{children}</main>
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-stone-500">
          <p className="font-medium text-stone-700">苏黎世《血染钟楼》 · Blood on the Clocktower Zurich</p>
          <p className="mt-1">
            活动报名与投票请到{" "}
            <a href={PLAY_LINKS.events()} className="link">
              play.zurich-boca.party
            </a>
          </p>
          <p className="mt-3 text-xs text-stone-400">
            《血染钟楼》是 The Pandemonium Institute 的作品，本站与其无隶属关系。
          </p>
        </div>
      </footer>
    </>
  );
}
