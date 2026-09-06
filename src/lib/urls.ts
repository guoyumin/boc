/**
 * 跨站链接。主页站（www）和功能站（play）跑的是同一个应用、同一个数据库，
 * 由 src/proxy.ts 按 Host 头分流，所以跨站链接一律走这里，别在页面里硬编码域名。
 */
import { PLAY_HOST, WWW_HOST } from "./hosts";

const proto = process.env.NODE_ENV === "production" ? "https" : "http";

/** 主页站（www）上的绝对地址 */
export function wwwUrl(path = "/") {
  return `${proto}://${WWW_HOST}${path}`;
}

/** 功能站（play）上的绝对地址：活动报名、投票、个人中心、管理后台 */
export function playUrl(path = "/") {
  return `${proto}://${PLAY_HOST}${path}`;
}

/** 主页上几个固定入口 */
export const PLAY_LINKS = {
  events: () => playUrl("/events"),
  polls: () => playUrl("/polls"),
  me: () => playUrl("/me"),
};

/**
 * 在线魔典（说书人用的模拟器）。第三方站点，不是我们维护的，
 * 所以只在这一处写死地址，页面上一律用 GrimoireLink 组件。
 */
export const GRIMOIRE_URL = "https://avalon2.top/botc/";
