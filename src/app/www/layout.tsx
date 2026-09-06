import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { WECHAT_ID, WECHAT_NOTE } from "@/lib/contact";
import { PLAY_LINKS } from "@/lib/urls";

// 主页站（www.zurich-boca.party）的外壳。功能站的顶栏和底部 tab bar 不在这里出现。
export const metadata: Metadata = {
  title: "苏黎世血染钟楼 · Blood on the Clocktower Zurich",
  description:
    "苏黎世的《血染钟楼》据点。每周一次，ETH Hönggerberg，桌上说中文，新人友好，说书人带你入门。",
};

const SECTIONS = [
  { href: "/#what", label: "这是什么游戏" },
  { href: "/#about", label: "关于我们" },
  { href: "/#first", label: "第一次来" },
  { href: "/#faq", label: "常见问题" },
];

export default function WwwLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <BrandMark className="size-6 text-brand" />
            <span className="leading-tight">
              <span className="display block text-base whitespace-nowrap">苏黎世血染钟楼</span>
              <span className="eyebrow hidden sm:block">blood on the clocktower</span>
            </span>
          </Link>
          {/* 锚点导航在手机上会挤成一列，直接藏掉，页面本身就是从上往下读的 */}
          <nav className="hidden flex-1 items-center gap-4 text-sm text-muted lg:flex">
            {SECTIONS.map((s) => (
              <a key={s.href} href={s.href} className="transition hover:text-brand-bright">
                {s.label}
              </a>
            ))}
          </nav>
          {/* 手机上用短标签，三个按钮才排得下一行 */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <a href={PLAY_LINKS.events()} className="btn btn-primary btn-sm">
              <span className="sm:hidden">报名</span>
              <span className="hidden sm:inline">活动报名</span>
            </a>
            <a href={PLAY_LINKS.polls()} className="btn btn-sm">
              <span className="sm:hidden">投票</span>
              <span className="hidden sm:inline">时间投票</span>
            </a>
            <a href={PLAY_LINKS.me()} className="btn btn-sm">
              <span className="sm:hidden">我的</span>
              <span className="hidden sm:inline">我的主页</span>
            </a>
          </div>
        </div>
      </header>
      <main className="w-full pb-16">{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted sm:px-6">
          <p className="display text-base">苏黎世《血染钟楼》</p>
          <p className="eyebrow mt-1">blood on the clocktower · zürich</p>
          <p className="mt-1">
            活动报名与投票请到{" "}
            <a href={PLAY_LINKS.events()} className="link">
              play.zurich-boca.party
            </a>
          </p>
          <p className="mt-1">
            想入群获取详细活动信息，加微信{" "}
            <span className="select-all text-ink-2">{WECHAT_ID}</span>，备注「{WECHAT_NOTE}」
          </p>
          <p className="mt-3 text-xs text-faint">
            《血染钟楼》是 The Pandemonium Institute 的作品，本站与其无隶属关系。
          </p>
        </div>
      </footer>
    </>
  );
}
