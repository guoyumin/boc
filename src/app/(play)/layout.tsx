import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import { getUser, isAdminRole } from "@/lib/auth";
import { wwwUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "BOC · 苏黎世血染钟楼",
  description: "苏黎世《血染钟楼》桌游群：时间投票、活动报名、出席记录、游戏记录与成就墙。",
};

/**
 * 功能站的外壳。手机是「顶栏 + 底部 tab bar」，桌面（lg 起）换成左侧固定导航，
 * 顶栏和 tab bar 都藏掉，正文跟着左移并放宽。
 */
export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  const me = await getUser();
  const isAdmin = me !== null && isAdminRole(me.role);
  const displayName = me ? (me.playerName ?? me.username) : null;

  return (
    <>
      <SideNav isAdmin={isAdmin} displayName={displayName} wwwHref={wwwUrl("/")} />

      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
            <Link href="/" className="display flex items-center gap-1.5 text-base">
              <BrandMark className="size-5 text-brand" /> 苏黎世血染钟楼
            </Link>
            {displayName ? (
              <Link href="/me" className="badge badge-brand">
                {displayName}
              </Link>
            ) : (
              <Link href="/login" className="text-xs text-faint">
                登录
              </Link>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 lg:max-w-5xl lg:px-8 lg:pt-8 lg:pb-12">
          {children}
        </main>

        <footer className="mx-auto max-w-3xl px-4 pb-28 text-center text-xs text-faint lg:hidden">
          <a href={wwwUrl("/")} className="underline underline-offset-2">
            社团主页
          </a>
        </footer>
      </div>

      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
