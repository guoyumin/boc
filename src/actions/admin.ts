"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { adminSessions, admins } from "@/db/schema";
import { createSession, hashPassword, logout, requireAdmin, requireOwner, verifyPassword } from "@/lib/auth";
import { errMsg, num, optStr, str, withMsg } from "@/lib/form";
import { assertLoginRate, assertWriteRate } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;

export async function loginAction(fd: FormData): Promise<void> {
  const next = str(fd, "next") || "/admin";
  const back = `/admin/login${next !== "/admin" ? `?next=${encodeURIComponent(next)}` : ""}`;
  try {
    const username = str(fd, "username");
    const password = str(fd, "password");
    await assertLoginRate(username);
    const admin = db.select().from(admins).where(eq(admins.username, username)).get();
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      throw new Error("用户名或密码不对");
    }
    if (admin.status === "pending") throw new Error("账号还在等初始管理员审批");
    if (admin.status !== "active") throw new Error("账号已停用");
    await createSession(admin.id);
    logAudit(admin.id, "admin.login", "admin", admin.id);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/admin");
}

/** ADM-03：申请管理员，状态 pending */
export async function registerAction(fd: FormData): Promise<void> {
  try {
    await assertWriteRate("register", 5);
    const username = str(fd, "username");
    if (!USERNAME_RE.test(username)) throw new Error("用户名用 3–32 位字母、数字、下划线");
    const password = str(fd, "password");
    if (password.length < 8) throw new Error("密码至少 8 位");
    if (password !== str(fd, "password2")) throw new Error("两次输入的密码不一样");
    const exists = db.select().from(admins).where(eq(admins.username, username)).get();
    if (exists) throw new Error("这个用户名已经有人用了");
    db.insert(admins)
      .values({
        username,
        passwordHash: await hashPassword(password),
        role: "admin",
        status: "pending",
        note: optStr(fd, "note"),
      })
      .run();
  } catch (e) {
    redirect(withMsg("/admin/register", errMsg(e)));
  }
  revalidatePath("/admin/admins");
  redirect(withMsg("/admin/login", "申请已提交，等初始管理员批准后就能登录", "ok"));
}

export async function logoutAction(): Promise<void> {
  await logout();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function changePasswordAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  try {
    const current = str(fd, "current");
    const next = str(fd, "next");
    if (next.length < 8) throw new Error("新密码至少 8 位");
    if (next !== str(fd, "next2")) throw new Error("两次输入的新密码不一样");
    const row = db.select().from(admins).where(eq(admins.id, admin.id)).get();
    if (!row || !(await verifyPassword(current, row.passwordHash))) throw new Error("当前密码不对");
    db.update(admins)
      .set({ passwordHash: await hashPassword(next), updatedAt: new Date().toISOString() })
      .where(eq(admins.id, admin.id))
      .run();
    // 改密后踢掉其他会话
    db.delete(adminSessions).where(eq(adminSessions.adminId, admin.id)).run();
    logAudit(admin.id, "admin.password", "admin", admin.id);
  } catch (e) {
    redirect(withMsg("/admin/password", errMsg(e)));
  }
  redirect(withMsg("/admin/login", "密码已修改，请重新登录", "ok"));
}

/** owner 审批 / 停用管理员 */
export async function setAdminStatus(fd: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = num(fd, "adminId");
  const status = str(fd, "status");
  try {
    if (!["active", "disabled", "pending"].includes(status)) throw new Error("状态不对");
    const target = db.select().from(admins).where(eq(admins.id, id)).get();
    if (!target) throw new Error("管理员不存在");
    if (target.role === "owner") throw new Error("初始管理员不能被降级或停用");
    db.update(admins).set({ status, updatedAt: new Date().toISOString() }).where(eq(admins.id, id)).run();
    if (status !== "active") db.delete(adminSessions).where(eq(adminSessions.adminId, id)).run();
    logAudit(owner.id, `admin.${status}`, "admin", id, target.username);
  } catch (e) {
    redirect(withMsg("/admin/admins", errMsg(e)));
  }
  revalidatePath("/admin/admins");
  revalidatePath("/admin");
  redirect(withMsg("/admin/admins", "已更新", "ok"));
}

export async function deleteAdmin(fd: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = num(fd, "adminId");
  try {
    const target = db.select().from(admins).where(eq(admins.id, id)).get();
    if (!target) throw new Error("管理员不存在");
    if (target.role === "owner") throw new Error("初始管理员不能删除");
    db.delete(admins).where(eq(admins.id, id)).run();
    logAudit(owner.id, "admin.delete", "admin", id, target.username);
  } catch (e) {
    redirect(withMsg("/admin/admins", errMsg(e)));
  }
  revalidatePath("/admin/admins");
  redirect(withMsg("/admin/admins", "已删除", "ok"));
}

export async function countPendingAdmins(): Promise<number> {
  const r = db
    .select({ c: sql<number>`count(*)` })
    .from(admins)
    .where(eq(admins.status, "pending"))
    .get();
  return r?.c ?? 0;
}
