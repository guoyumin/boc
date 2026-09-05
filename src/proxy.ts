import { NextResponse, type NextRequest } from "next/server";

// 与 src/lib/auth.ts 里的 COOKIE_NAME 保持一致（这里不 import，避免把 better-sqlite3 带进中间件）
const COOKIE_NAME = "boc_admin";

const PUBLIC = ["/admin/login", "/admin/register"];

/**
 * Next 16 的 middleware。只做一件事：没登录 cookie 就把 /admin/* 弹到登录页。
 * 真正的权限校验在每个 Server Action 里的 requireAdmin()。
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (!req.cookies.get(COOKIE_NAME)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
