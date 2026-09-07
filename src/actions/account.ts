"use server";

import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { USER_ROLES, players, sessions, users } from "@/db/schema";
import {
  createSession,
  hashPassword,
  isAdminRole,
  logout,
  requireAdmin,
  requireOwner,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { JOIN_HINT } from "@/lib/contact";
import { SKIN_LABEL, asSkin } from "@/lib/skins";
import { errMsg, many, num, optStr, str, withMsg } from "@/lib/form";
import { assertLoginRate, assertWriteRate } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { checkNickname, cleanName, normalizeName } from "@/lib/names";
import { findPlayer, parseAliases } from "@/lib/players";

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;
const MAX_ALIASES = 5;

export async function loginAction(fd: FormData): Promise<void> {
  const next = str(fd, "next") || "/me";
  const back = `/login?next=${encodeURIComponent(next)}`;
  try {
    const username = str(fd, "username");
    const password = str(fd, "password");
    await assertLoginRate(username);
    const u = db.select().from(users).where(eq(users.username, username)).get();
    if (!u || !(await verifyPassword(password, u.passwordHash))) throw new Error("用户名或密码不对");
    if (u.status === "pending") throw new Error("账号还在等站长审批");
    if (u.status !== "active") throw new Error("账号已停用");
    await createSession(u.id);
    logAudit(u.id, "user.login", "user", u.id);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/me");
}

/**
 * 注册普通账号。玩家参加活动本来就不需要账号；注册只是为了绑定自己的玩家档案，
 * 看自己的报名与成就。注册即可用，不需要审批（管理员权限才要申请）。
 */
export async function registerAction(fd: FormData): Promise<void> {
  let userId = 0;
  try {
    await assertWriteRate("register", 5);
    const username = str(fd, "username");
    if (!USERNAME_RE.test(username)) throw new Error("用户名用 3–32 位字母、数字、下划线");
    const password = str(fd, "password");
    if (password.length < 8) throw new Error("密码至少 8 位");
    if (password !== str(fd, "password2")) throw new Error("两次输入的密码不一样");
    if (db.select().from(users).where(eq(users.username, username)).get()) {
      throw new Error("这个用户名已经有人用了");
    }

    const check = checkNickname(str(fd, "nickname"));
    if (!check.ok) throw new Error(check.error);
    // 认领名册里已有的同名玩家；没有就新建一个
    const existing = findPlayer(check.name);
    if (existing) {
      const taken = db.select().from(users).where(eq(users.playerId, existing.id)).get();
      if (taken) throw new Error(`昵称「${existing.name}」已经被别的账号绑定了，换一个或找管理员`);
    }
    const playerId =
      existing?.id ??
      db.insert(players).values({ name: check.name }).returning({ id: players.id }).get().id;

    const row = db
      .insert(users)
      .values({
        username,
        passwordHash: await hashPassword(password),
        role: "member",
        status: "active",
        playerId,
      })
      .returning({ id: users.id })
      .get();
    userId = row.id;
    await createSession(userId);
    logAudit(userId, "user.register", "user", userId, username);
  } catch (e) {
    redirect(withMsg("/register", errMsg(e)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg("/me", `注册成功。${JOIN_HINT}`, "ok"));
}

export async function logoutAction(): Promise<void> {
  await logout();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function changePasswordAction(fd: FormData): Promise<void> {
  const me = await requireUser();
  try {
    const current = str(fd, "current");
    const next = str(fd, "next");
    if (next.length < 8) throw new Error("新密码至少 8 位");
    if (next !== str(fd, "next2")) throw new Error("两次输入的新密码不一样");
    const row = db.select().from(users).where(eq(users.id, me.id)).get();
    if (!row || !(await verifyPassword(current, row.passwordHash))) throw new Error("当前密码不对");
    db.update(users)
      .set({ passwordHash: await hashPassword(next), updatedAt: new Date().toISOString() })
      .where(eq(users.id, me.id))
      .run();
    db.delete(sessions).where(eq(sessions.userId, me.id)).run(); // 改密后踢掉所有会话
    logAudit(me.id, "user.password", "user", me.id);
  } catch (e) {
    redirect(withMsg("/me/password", errMsg(e)));
  }
  redirect(withMsg("/login", "密码已修改，请重新登录", "ok"));
}

/** ROS-01 / ROS-04：自己改昵称和别名 */
export async function updateMyProfile(fd: FormData): Promise<void> {
  const me = await requireUser();
  try {
    if (!me.playerId) throw new Error("账号还没绑定玩家档案");
    const check = checkNickname(str(fd, "nickname"));
    if (!check.ok) throw new Error(check.error);

    const others = db.select().from(players).where(ne(players.id, me.playerId)).all();
    const clash = (name: string) =>
      others.find(
        (p) =>
          normalizeName(p.name) === normalizeName(name) ||
          parseAliases(p.aliases).some((a) => normalizeName(a) === normalizeName(name)),
      );

    const hit = clash(check.name);
    if (hit) throw new Error(`昵称「${check.name}」和「${hit.name}」冲突了，换一个`);

    const aliases: string[] = [];
    for (const raw of many(fd, "alias")) {
      const a = cleanName(raw);
      if (!a) continue;
      if (a.length > 20) throw new Error("别名最多 20 个字符");
      if (normalizeName(a) === normalizeName(check.name)) continue; // 和昵称重复的忽略
      if (aliases.some((x) => normalizeName(x) === normalizeName(a))) continue;
      const c = clash(a);
      if (c) throw new Error(`别名「${a}」和「${c.name}」冲突了`);
      aliases.push(a);
    }
    if (aliases.length > MAX_ALIASES) throw new Error(`最多 ${MAX_ALIASES} 个别名`);

    db.update(players)
      .set({ name: check.name, aliases: JSON.stringify(aliases), updatedAt: new Date().toISOString() })
      .where(eq(players.id, me.playerId))
      .run();
    logAudit(me.id, "player.self_update", "player", me.playerId, check.name);
  } catch (e) {
    redirect(withMsg("/me", errMsg(e)));
  }
  revalidatePath("/me");
  revalidatePath(`/players/${me.playerId}`);
  redirect(withMsg("/me", "已保存", "ok"));
}

/** 存下自己选的成就卡卡面（issue #12）。没登录就没得选，游客一律用默认皮肤。 */
export async function saveCardSkin(fd: FormData): Promise<void> {
  const me = await requireUser();
  const skin = asSkin(str(fd, "skin"));
  db.update(users)
    .set({ cardSkin: skin, updatedAt: new Date().toISOString() })
    .where(eq(users.id, me.id))
    .run();
  revalidatePath("/me");
  revalidatePath("/achievements");
  redirect(withMsg("/me", `卡面换成「${SKIN_LABEL[skin]}」了`, "ok"));
}

/** ADM-03：已登录的普通用户申请管理员，owner 审批 */
export async function requestAdmin(fd: FormData): Promise<void> {
  const me = await requireUser();
  try {
    if (isAdminRole(me.role)) throw new Error("你已经是管理员了");
    const note = optStr(fd, "note");
    if (!note) throw new Error("说一句你是谁、为什么需要管理权限");
    db.update(users)
      .set({ adminRequest: note, adminRequestedAt: new Date().toISOString() })
      .where(eq(users.id, me.id))
      .run();
  } catch (e) {
    redirect(withMsg("/me", errMsg(e)));
  }
  revalidatePath("/admin");
  revalidatePath("/admin/admins");
  redirect(withMsg("/me", "申请已提交，等站长批准", "ok"));
}

export async function cancelAdminRequest(): Promise<void> {
  const me = await requireUser();
  db.update(users).set({ adminRequest: null, adminRequestedAt: null }).where(eq(users.id, me.id)).run();
  revalidatePath("/me");
  revalidatePath("/admin/admins");
  redirect(withMsg("/me", "已撤回申请", "ok"));
}

/** owner 批准 / 拒绝管理员申请 */
export async function reviewAdminRequest(fd: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = num(fd, "userId");
  const decision = str(fd, "decision");
  try {
    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) throw new Error("账号不存在");
    if (decision === "approve") {
      db.update(users)
        .set({ role: "admin", adminRequest: null, adminRequestedAt: null, status: "active", updatedAt: new Date().toISOString() })
        .where(eq(users.id, id))
        .run();
    } else {
      db.update(users)
        .set({ adminRequest: null, adminRequestedAt: null, updatedAt: new Date().toISOString() })
        .where(eq(users.id, id))
        .run();
    }
    logAudit(owner.id, `admin.${decision}`, "user", id, target.username);
  } catch (e) {
    redirect(withMsg("/admin/admins", errMsg(e)));
  }
  revalidatePath("/admin/admins");
  revalidatePath("/admin");
  redirect(withMsg("/admin/admins", decision === "approve" ? "已批准" : "已拒绝", "ok"));
}

/** owner 改角色 / 停用账号 */
/**
 * 改别人的角色。只有 owner 能动。
 *
 * owner 可以把别人也提成 owner（站点可以有多个 owner）。
 * 反过来降 owner 有两条硬约束，防止把自己锁在门外或者让站点没人管：
 *  1. 不能降自己 —— 要卸任就让另一个 owner 来操作
 *  2. 最后一个 owner 不能降
 */
export async function setUserRole(fd: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = num(fd, "userId");
  const role = str(fd, "role");
  try {
    if (!(USER_ROLES as readonly string[]).includes(role)) throw new Error("角色不对");
    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) throw new Error("账号不存在");
    if (role !== "owner" && target.role === "owner") {
      if (target.id === owner.id) throw new Error("不能给自己降级，让另一个 owner 来操作");
      const owners = db.select().from(users).where(eq(users.role, "owner")).all().length;
      if (owners <= 1) throw new Error("这是最后一个 owner，降了就没人能管权限了");
    }
    if (role === "owner" && target.status !== "active") {
      throw new Error("停用中的账号不能提成 owner，先启用");
    }
    db.update(users).set({ role, updatedAt: new Date().toISOString() }).where(eq(users.id, id)).run();
    logAudit(owner.id, `user.role.${role}`, "user", id, target.username);
  } catch (e) {
    redirect(withMsg("/admin/admins", errMsg(e)));
  }
  revalidatePath("/admin/admins");
  redirect(withMsg("/admin/admins", "已更新", "ok"));
}

export async function setUserStatus(fd: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = num(fd, "userId");
  const status = str(fd, "status");
  try {
    if (!["active", "disabled"].includes(status)) throw new Error("状态不对");
    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) throw new Error("账号不存在");
    if (target.role === "owner") throw new Error("站长不能被停用，先把他降成管理员");
    db.update(users).set({ status, updatedAt: new Date().toISOString() }).where(eq(users.id, id)).run();
    if (status !== "active") db.delete(sessions).where(eq(sessions.userId, id)).run();
    logAudit(owner.id, `user.${status}`, "user", id, target.username);
  } catch (e) {
    redirect(withMsg("/admin/admins", errMsg(e)));
  }
  revalidatePath("/admin/admins");
  redirect(withMsg("/admin/admins", "已更新", "ok"));
}

export async function deleteUser(fd: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = num(fd, "userId");
  try {
    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) throw new Error("账号不存在");
    if (target.role === "owner") throw new Error("站长不能删除，先把他降成管理员");
    db.delete(users).where(eq(users.id, id)).run();
    logAudit(owner.id, "user.delete", "user", id, target.username);
  } catch (e) {
    redirect(withMsg("/admin/admins", errMsg(e)));
  }
  revalidatePath("/admin/admins");
  redirect(withMsg("/admin/admins", "账号已删除（玩家档案保留）", "ok"));
}

/** 管理员重置别人的密码（AUTH-05），返回的一次性密码只在页面上显示一次 */
export async function resetUserPassword(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = num(fd, "userId");
  let temp = "";
  try {
    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) throw new Error("账号不存在");
    if (target.role === "owner" && admin.role !== "owner") throw new Error("只有站长能重置自己的密码");
    temp = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
    db.update(users)
      .set({ passwordHash: await hashPassword(temp), updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .run();
    db.delete(sessions).where(eq(sessions.userId, id)).run();
    logAudit(admin.id, "user.reset_password", "user", id, target.username);
  } catch (e) {
    redirect(withMsg("/admin/admins", errMsg(e)));
  }
  revalidatePath("/admin/admins");
  redirect(withMsg("/admin/admins", `临时密码：${temp}（只显示这一次，请让本人登录后立刻改掉）`, "ok"));
}

export async function countPendingAdminRequests(): Promise<number> {
  const r = db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(and(isNotNull(users.adminRequest), eq(users.role, "member")))
    .get();
  return r?.c ?? 0;
}
