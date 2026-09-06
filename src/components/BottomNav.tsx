"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_ITEM, NAV_ITEMS, isActive } from "./nav-items";

/** 手机上的底部 tab bar。桌面（lg 起）换成 SideNav 的左侧栏，这里整条藏掉。 */
export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "/";
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/85 backdrop-blur lg:hidden">
      <div
        className="mx-auto flex max-w-3xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              isActive(pathname, it.href) ? "font-medium text-brand-bright" : "text-muted"
            }`}
          >
            <span className="text-lg leading-none">{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
