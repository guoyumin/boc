/** 功能站的导航项。手机上是底部 tab bar，桌面上是左侧栏，两边共用这份清单。 */
import type { NavIconName } from "./NavIcon";

export type NavItem = { href: string; label: string; sub: string; icon: NavIconName };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", sub: "TOWN SQUARE", icon: "home" },
  { href: "/polls", label: "时间", sub: "TIME POLL", icon: "calendar" },
  { href: "/events", label: "活动", sub: "GATHERINGS", icon: "dice" },
  { href: "/achievements", label: "成就", sub: "HALL OF FAME", icon: "trophy" },
  { href: "/me", label: "我的", sub: "MY TOWN", icon: "user" },
];

export const ADMIN_ITEM: NavItem = {
  href: "/admin",
  label: "管理",
  sub: "STORYTELLER",
  icon: "tools",
};

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
