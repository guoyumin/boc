"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "首页", icon: "🏠" },
  { href: "/polls", label: "时间", icon: "🗓" },
  { href: "/events", label: "活动", icon: "🎲" },
  { href: "/achievements", label: "成就", icon: "🏆" },
  { href: "/me", label: "我的", icon: "👤" },
];

export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "/";
  const items = isAdmin ? [...ITEMS, { href: "/admin", label: "管理", icon: "🛠" }] : ITEMS;
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur">
      <div
        className="mx-auto flex max-w-3xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              active(it.href) ? "text-brand font-medium" : "text-stone-500"
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
