import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { db } from "@/db";
import { players, sessions, users } from "@/db/schema";

export const COOKIE_NAME = "boc_session";
/** 旧 cookie 名，只为让上一版已登录的管理员平滑过渡，读到就清掉 */
export const LEGACY_COOKIE_NAME = "boc_admin";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 天
const BCRYPT_COST = 12;

export type CurrentUser = {
  id: number;
  username: string;
  role: string;
  status: string;
  playerId: number | null;
  playerName: string | null;
  adminRequest: string | null;
  /** 成就卡的卡面皮肤，见 src/lib/skins.ts */
  cardSkin: string;
};

export function isAdminRole(role: string): boolean {
  return role === "admin" || role === "owner";
}

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, digest: string): Promise<boolean> {
  return compare(plain, digest);
}

function newToken(): string {
  return randomBytes(32).toString("hex");
}

/** 登录成功后调用：写会话表 + 设置 cookie。只能在 Server Action / Route Handler 里用。 */
export async function createSession(userId: number): Promise<void> {
  const token = newToken();
  const expires = new Date(Date.now() + MAX_AGE * 1000);
  db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString())).run();
  db.insert(sessions).values({ id: token, userId, expiresAt: expires.toISOString() }).run();
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  jar.delete(LEGACY_COOKIE_NAME);
}

/** 当前登录账号；未登录或被停用都返回 null。 */
export const getUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const row = db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      status: users.status,
      playerId: users.playerId,
      playerName: players.name,
      adminRequest: users.adminRequest,
      cardSkin: users.cardSkin,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(players, eq(players.id, users.playerId))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date().toISOString())))
    .get();
  if (!row || row.status !== "active") return null;
  return row;
});

/** 当前登录账号，且必须是管理员；否则 null。页面上判断"要不要显示管理按钮"用这个。 */
export async function getAdmin(): Promise<CurrentUser | null> {
  const u = await getUser();
  return u && isAdminRole(u.role) ? u : null;
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getUser();
  if (!u) throw new Error("请先登录");
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await getUser();
  if (!u || !isAdminRole(u.role)) throw new Error("需要管理员权限");
  return u;
}

export async function requireOwner(): Promise<CurrentUser> {
  const u = await requireAdmin();
  if (u.role !== "owner") throw new Error("需要初始管理员权限");
  return u;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) db.delete(sessions).where(eq(sessions.id, token)).run();
  jar.delete(COOKIE_NAME);
  jar.delete(LEGACY_COOKIE_NAME);
}
