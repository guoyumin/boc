/** 功能站的导航项。手机上是底部 tab bar，桌面上是左侧栏，两边共用这份清单。 */
import type { NavIconName } from "./NavIcon";

export type NavItem = { href: string; label: string; icon: NavIconName };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", icon: "home" },
  { href: "/polls", label: "时间投票", icon: "calendar" },
  { href: "/events", label: "活动", icon: "dice" },
  { href: "/achievements", label: "成就", icon: "trophy" },
  { href: "/me", label: "我的", icon: "user" },
];

export const ADMIN_ITEM: NavItem = { href: "/admin", label: "管理", icon: "tools" };

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
