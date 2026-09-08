"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "./BrandMark";
import NavIcon from "./NavIcon";
import { ADMIN_ITEM, NAV_ITEMS, isActive } from "./nav-items";

/**
 * 桌面（lg 起）的左侧固定导航。手机上整条藏掉，那边用 BottomNav。
 * 底部是当前账号的卡片；没登录就显示一个登录入口。
 */
export default function SideNav({
  isAdmin,
  displayName,
  wwwHref,
}: {
  isAdmin: boolean;
  displayName: string | null;
  wwwHref: string;
}) {
  const pathname = usePathname() ?? "/";
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-surface lg:flex">
      {/* logo 点回社团主页（issue #48）；回功能站首页走下面导航里的「首页」 */}
      <a href={wwwHref} className="flex items-center gap-2 px-5 py-5">
        <BrandMark className="size-6 text-brand" />
        <span className="leading-tight">
          <span className="display block text-base">
            苏黎世血染钟楼 <span className="text-xs text-faint">↗</span>
          </span>
          <span className="eyebrow">zurich boca</span>
        </span>
      </a>

      <nav className="flex-1 px-3">
        {items.map((it) => {
          const on = isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                on
                  ? "border border-brand-line bg-brand-soft font-medium text-brand-bright"
                  : "border border-transparent text-ink-2 hover:bg-surface-2"
              }`}
            >
              <NavIcon name={it.icon} className="size-[18px] shrink-0" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line px-4 py-3 text-xs">
        {displayName ? (
          <Link href="/me" className="flex items-center gap-2 text-ink-2 hover:text-ink">
            <span className="flex size-7 items-center justify-center rounded-full border border-brand-line bg-brand-soft text-brand-bright">
              {displayName.slice(0, 1)}
            </span>
            <span className="truncate">{displayName}</span>
          </Link>
        ) : (
          <Link href="/login" className="text-muted hover:text-ink">
            登录 / 注册
          </Link>
        )}
        <a href={wwwHref} className="btn btn-sm mt-3 w-full">
          社团主页 ↗
        </a>
      </div>
    </aside>
  );
}
