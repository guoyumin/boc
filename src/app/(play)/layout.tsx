import type { Metadata } from "next";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { getUser, isAdminRole } from "@/lib/auth";
import { wwwUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "BOC · 苏黎世血染钟楼",
  description: "苏黎世《血染钟楼》桌游群：时间投票、活动报名、出席记录、游戏记录与成就墙。",
};

export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  const me = await getUser();
  const isAdmin = me !== null && isAdminRole(me.role);
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center gap-1.5 font-semibold text-stone-800">
            <span className="text-brand">🩸</span> 苏黎世血染钟楼
          </Link>
          {me ? (
            <Link href="/me" className="badge badge-brand">
              {me.playerName ?? me.username}
            </Link>
          ) : (
            <Link href="/login" className="text-xs text-stone-400">
              登录
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-6">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-28 text-center text-xs text-stone-400">
        <a href={wwwUrl("/")} className="underline underline-offset-2">
          社团主页
        </a>
      </footer>
      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
