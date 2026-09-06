import { NextResponse, type NextRequest } from "next/server";
import { PLAY_HOST, WWW_HOST, isPlayOnlyPath, isWwwHost } from "@/lib/hosts";

// 与 src/lib/auth.ts 里的 COOKIE_NAME 保持一致（这里不 import，避免把 better-sqlite3 带进中间件）
const COOKIE_NAME = "boc_session";

/** 主页站的页面都放在 src/app/www/ 下，对外的路径不带这个前缀 */
const WWW_PREFIX = "/www";

/**
 * 跳到另一个站的同一个路径上。
 *
 * 注意 URL 的 host setter：赋一个不带端口的主机名**不会**清掉原来的端口，而
 * req.nextUrl 的端口是容器内部的 3000，不清就会跳到 play.zurich-boca.party:3000 上去。
 * 本地开发时 WWW_HOST / PLAY_HOST 自带 :3000，那种情况下端口是要保留的。
 */
function otherSite(req: NextRequest, host: string) {
  const url = req.nextUrl.clone();
  url.host = host;
  if (!host.includes(":")) url.port = "";
  url.protocol = host.includes("localhost") ? "http:" : "https:";
  return url;
}

/**
 * Next 16 的 middleware。两件事：
 *
 * 1. 按 Host 分流。www.zurich-boca.party（含根域）是社团主页，请求 rewrite 到 /www/*；
 *    play.zurich-boca.party 是功能站，路径原样走。走错域名的路径互相跳转。
 * 2. 没有会话 cookie 就把 /admin/* 弹到登录页。
 *    真正的权限校验（是不是管理员）在每个 Server Action 和页面里做。
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const onWww = isWwwHost(req.headers.get("host"));

  if (onWww) {
    // 功能站的路径跑到主页站上了：跳过去，别在 www 上渲染一份登录/后台
    // 用 307 而不是 301：这套映射还会变（比如 /achievements 之后要搬到主页站），
    // 301 会被浏览器和 Cloudflare 长期缓存，改回来的时候很难收拾
    if (isPlayOnlyPath(pathname)) {
      return NextResponse.redirect(otherSite(req, PLAY_HOST));
    }
    // /www 是内部前缀，不该出现在地址栏里
    if (pathname === WWW_PREFIX || pathname.startsWith(WWW_PREFIX + "/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.slice(WWW_PREFIX.length) || "/";
      return NextResponse.redirect(url);
    }
    const url = req.nextUrl.clone();
    url.pathname = WWW_PREFIX + (pathname === "/" ? "" : pathname);
    return NextResponse.rewrite(url);
  }

  // 功能站上不提供主页站的内容，/www/* 打回主页站
  if (pathname === WWW_PREFIX || pathname.startsWith(WWW_PREFIX + "/")) {
    const url = otherSite(req, WWW_HOST);
    url.pathname = pathname.slice(WWW_PREFIX.length) || "/";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && !req.cookies.get(COOKIE_NAME)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // 静态资源、上传的文件和健康检查不走分流
  matcher: ["/((?!_next/|api/|files/|favicon.ico).*)"],
};
