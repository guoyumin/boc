import { NextResponse, type NextRequest } from "next/server";

// 与 src/lib/auth.ts 里的 COOKIE_NAME 保持一致（这里不 import，避免把 better-sqlite3 带进中间件）
const COOKIE_NAME = "boc_session";

/**
 * Next 16 的 middleware。只做一件事：没有会话 cookie 就把 /admin/* 弹到登录页。
 * 真正的权限校验（是不是管理员）在每个 Server Action 和页面里做。
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (req.cookies.get(COOKIE_NAME)?.value) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
