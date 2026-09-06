/**
 * 两个站的域名与分流判定。**src/proxy.ts 会 import 这个文件**，所以这里只能是纯字符串逻辑，
 * 不许引入任何带 native 依赖的东西（better-sqlite3 会把中间件打挂）。
 *
 * 生产上是 www.zurich-boca.party / play.zurich-boca.party（可用环境变量覆盖）；
 * 本地开发默认 www.localhost:3000 / play.localhost:3000
 * ——浏览器会把 *.localhost 解析到 127.0.0.1，不用改 hosts 文件。
 * 直接开 localhost:3000 时按功能站处理，和以前一样。
 */
const DEV = process.env.NODE_ENV !== "production";

/** 带端口，用来拼绝对地址 */
export const WWW_HOST = process.env.WWW_HOST ?? (DEV ? "www.localhost:3000" : "www.zurich-boca.party");
export const PLAY_HOST =
  process.env.PLAY_HOST ?? (DEV ? "play.localhost:3000" : "play.zurich-boca.party");

/** 去掉端口的小写主机名 */
export function normalizeHost(host: string | null | undefined) {
  return (host ?? "").split(":")[0]!.toLowerCase();
}

const WWW_NAME = normalizeHost(WWW_HOST);
/** 主页站的根域，访问它等同于访问 www（nginx 上也会 301 一次） */
const APEX_NAME = WWW_NAME.replace(/^www\./, "");

/** 这个请求是不是打在主页站上 */
export function isWwwHost(host: string | null | undefined) {
  const h = normalizeHost(host);
  return h === WWW_NAME || h === APEX_NAME;
}

/**
 * 主页站上不该出现的路径 —— 这些是功能站的东西，命中就跳到 play 同路径。
 *
 * `/achievements` 现在还在功能站上，所以暂时也列在这里；等 issue #8 把公开成就墙
 * 搬到主页站之后，要把它从这个列表里删掉，否则会自己把自己跳走。
 */
export const PLAY_ONLY_PREFIXES = [
  "/achievements",
  "/admin",
  "/me",
  "/login",
  "/register",
  "/events",
  "/polls",
  "/games",
  "/players",
];

export function isPlayOnlyPath(pathname: string) {
  return PLAY_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
