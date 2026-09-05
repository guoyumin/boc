"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { eventSignups, events, SESSIONS, type Session } from "@/db/schema";
import { getAdmin, requireAdmin } from "@/lib/auth";
import { errMsg, num, optStr, str, withMsg } from "@/lib/form";
import { findOrCreatePlayer, findPlayer } from "@/lib/players";
import { assertWriteRate } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import type { JielongRow } from "@/lib/jielong";

function asSession(v: string, fallback: Session = "full"): Session {
  return (SESSIONS as readonly string[]).includes(v) ? (v as Session) : fallback;
}

/** SIGN-01：玩家自助报名（再次提交覆盖） */
export async function selfSignup(fd: FormData): Promise<void> {
  const eventId = num(fd, "eventId");
  const back = `/events/${eventId}`;
  try {
    await assertWriteRate("signup");
    const ev = db.select().from(events).where(eq(events.id, eventId)).get();
    if (!ev) throw new Error("活动不存在");
    if (ev.status === "cancelled") throw new Error("这次活动已取消");
    const player = findOrCreatePlayer(str(fd, "nickname"));
    const signup = asSession(str(fd, "session"));
    const note = optStr(fd, "note");
    db.insert(eventSignups)
      .values({ eventId, playerId: player.id, signup, signupNote: note, source: "self", status: "active" })
      .onConflictDoUpdate({
        target: [eventSignups.eventId, eventSignups.playerId],
        set: {
          signup,
          signupNote: note,
          status: "active",
          cancelledAt: null,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  revalidatePath("/events");
  redirect(withMsg(back, "报名成功，到时候见", "ok"));
}

export async function cancelSignup(fd: FormData): Promise<void> {
  const eventId = num(fd, "eventId");
  const back = `/events/${eventId}`;
  try {
    await assertWriteRate("signup");
    const player = findPlayer(str(fd, "nickname"));
    if (!player) throw new Error("名册里没有这个昵称，确认一下有没有写错");
    const row = db
      .select()
      .from(eventSignups)
      .where(and(eq(eventSignups.eventId, eventId), eq(eventSignups.playerId, player.id)))
      .get();
    if (!row) throw new Error("你还没有报名");
    if (row.attended !== "none") throw new Error("已经记了出席，取消请找管理员");
    if (row.status === "cancelled") throw new Error("你已经取消过了");
    // 记录保留：取消也算一次鸽，管理员 review 后可以免掉
    db.update(eventSignups)
      .set({ status: "cancelled", cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(eventSignups.id, row.id))
      .run();
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  revalidatePath("/events");
  redirect(withMsg(back, "已取消报名。放鸽子会记一笔，情况特殊可以找管理员免掉", "ok"));
}

/** SIGN-04：管理员点选出席状态，客户端 startTransition 调用 */
export async function setAttendance(signupId: number, attended: string): Promise<void> {
  await requireAdmin();
  const value = asSession(attended, "none");
  const row = db.select().from(eventSignups).where(eq(eventSignups.id, signupId)).get();
  if (!row) throw new Error("这条报名不存在");
  db.update(eventSignups)
    .set({
      attended: value,
      // 人来了就不算取消
      status: value === "none" ? row.status : "active",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(eventSignups.id, signupId))
    .run();
  revalidatePath(`/events/${row.eventId}`);
}

/** SIGN-06：管理员添加临时来的玩家 */
export async function addAttendee(fd: FormData): Promise<void> {
  await requireAdmin();
  const eventId = num(fd, "eventId");
  const back = `/events/${eventId}`;
  try {
    const player = findOrCreatePlayer(str(fd, "nickname"));
    const attended = asSession(str(fd, "attended"), "full");
    db.insert(eventSignups)
      .values({
        eventId,
        playerId: player.id,
        signup: asSession(str(fd, "signup"), "none"),
        attended,
        source: "admin",
        signupNote: optStr(fd, "note"),
      })
      .onConflictDoUpdate({
        target: [eventSignups.eventId, eventSignups.playerId],
        set: { attended, updatedAt: new Date().toISOString() },
      })
      .run();
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  redirect(withMsg(back, "已加入出席表", "ok"));
}

export async function removeSignup(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = num(fd, "signupId");
  const eventId = num(fd, "eventId");
  db.delete(eventSignups).where(eq(eventSignups.id, id)).run();
  logAudit(admin.id, "signup.delete", "event_signup", id);
  revalidatePath(`/events/${eventId}`);
  redirect(withMsg(`/events/${eventId}`, "已从名单里移除", "ok"));
}

/** SIGN-02：接龙预览确认后批量写入。rows 由客户端解析后以 JSON 提交。 */
export async function importJielong(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const eventId = num(fd, "eventId");
  const back = `/events/${eventId}/jielong`;
  let imported = 0;
  try {
    const raw = str(fd, "rows");
    const parsed: JielongRow[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("没有可导入的行");
    const ev = db.select().from(events).where(eq(events.id, eventId)).get();
    if (!ev) throw new Error("活动不存在");
    for (const [i, row] of parsed.entries()) {
      const name = String(row?.name ?? "").trim();
      if (!name) continue;
      const player = findOrCreatePlayer(name);
      const signup = asSession(String(row?.session ?? "full"));
      const note = row?.note ? String(row.note).slice(0, 200) : null;
      db.insert(eventSignups)
        .values({
          eventId,
          playerId: player.id,
          signup,
          signupNote: note,
          seq: typeof row?.seq === "number" ? row.seq : i + 1,
          source: "jielong",
        })
        .onConflictDoUpdate({
          target: [eventSignups.eventId, eventSignups.playerId],
          set: {
            signup,
            signupNote: note,
            seq: typeof row?.seq === "number" ? row.seq : i + 1,
            source: "jielong",
            updatedAt: new Date().toISOString(),
          },
        })
        .run();
      imported += 1;
    }
    logAudit(admin.id, "signup.jielong", "event", eventId, `${imported} 人`);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  redirect(withMsg(`/events/${eventId}`, `接龙已导入 ${imported} 人`, "ok"));
}

/** 页面上给"我是不是管理员"用的轻量查询 */
export async function amIAdmin(): Promise<boolean> {
  return (await getAdmin()) !== null;
}

/** 需求 h：管理员 review 后把某次"鸽"免掉，或者撤销免除。 */
export async function setNoShowWaived(signupId: number, waived: boolean): Promise<void> {
  const admin = await requireAdmin();
  const row = db.select().from(eventSignups).where(eq(eventSignups.id, signupId)).get();
  if (!row) throw new Error("这条报名不存在");
  db.update(eventSignups)
    .set({ noShowWaived: waived ? 1 : 0, updatedAt: new Date().toISOString() })
    .where(eq(eventSignups.id, signupId))
    .run();
  logAudit(admin.id, waived ? "signup.waive" : "signup.unwaive", "event_signup", signupId);
  revalidatePath(`/events/${row.eventId}`);
  revalidatePath("/events");
}

/** 管理员代为取消某人的报名（记录保留） */
export async function adminCancelSignup(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = num(fd, "signupId");
  const eventId = num(fd, "eventId");
  db.update(eventSignups)
    .set({ status: "cancelled", cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(eventSignups.id, id))
    .run();
  logAudit(admin.id, "signup.cancel", "event_signup", id);
  revalidatePath(`/events/${eventId}`);
  redirect(withMsg(`/events/${eventId}`, "已标记为取消报名", "ok"));
}
