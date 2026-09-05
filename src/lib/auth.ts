import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { db } from "@/db";
import { adminSessions, admins } from "@/db/schema";

export const COOKIE_NAME = "boc_admin";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 天
const BCRYPT_COST = 12;

export type AdminUser = {
  id: number;
  username: string;
  role: string;
  status: string;
};

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
export async function createSession(adminId: number): Promise<void> {
  const token = newToken();
  const expires = new Date(Date.now() + MAX_AGE * 1000);
  db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date().toISOString())).run();
  db.insert(adminSessions).values({ id: token, adminId, expiresAt: expires.toISOString() }).run();
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const row = db
    .select({
      id: admins.id,
      username: admins.username,
      role: admins.role,
      status: admins.status,
    })
    .from(adminSessions)
    .innerJoin(admins, eq(admins.id, adminSessions.adminId))
    .where(and(eq(adminSessions.id, token), gt(adminSessions.expiresAt, new Date().toISOString())))
    .get();
  if (!row || row.status !== "active") return null;
  return row;
});

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) throw new Error("需要管理员权限");
  return admin;
}

export async function requireOwner(): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") throw new Error("需要初始管理员权限");
  return admin;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) db.delete(adminSessions).where(eq(adminSessions.id, token)).run();
  jar.delete(COOKIE_NAME);
}
