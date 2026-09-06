/** 功能站的导航项。手机上是底部 tab bar，桌面上是左侧栏，两边共用这份清单。 */
export type NavItem = { href: string; label: string; sub: string; icon: string };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", sub: "TOWN SQUARE", icon: "🏠" },
  { href: "/polls", label: "时间", sub: "TIME POLL", icon: "🗓" },
  { href: "/events", label: "活动", sub: "GATHERINGS", icon: "🎲" },
  { href: "/achievements", label: "成就", sub: "HALL OF FAME", icon: "🏆" },
  { href: "/me", label: "我的", sub: "MY TOWN", icon: "👤" },
];

export const ADMIN_ITEM: NavItem = {
  href: "/admin",
  label: "管理",
  sub: "STORYTELLER",
  icon: "🛠",
};

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
