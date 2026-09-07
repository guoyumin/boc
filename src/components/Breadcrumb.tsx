"use client";

import { usePathname } from "next/navigation";
import { ADMIN_ITEM, NAV_ITEMS } from "./nav-items";

/** 顶部面包屑：小镇 / 当前页。名字取自导航清单，多一层的页面显示所属那一栏。 */
export default function Breadcrumb() {
  const pathname = usePathname() ?? "/";
  const items = [...NAV_ITEMS, ADMIN_ITEM];
  // 取匹配最长的一项，/events/12 也能落到「活动」
  const hit = items
    .filter((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav className="text-sm text-faint">
      小镇 <span className="px-1">/</span>
      <span className="text-muted">{hit?.label ?? "首页"}</span>
    </nav>
  );
}
