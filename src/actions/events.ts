"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { events, polls } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatMd } from "@/lib/dates";
import { bool, errMsg, num, optNum, optStr, str, withMsg } from "@/lib/form";
import { logAudit } from "@/lib/audit";
import { removeEventDir } from "@/lib/storage";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["planned", "done", "cancelled"];

export async function createEvent(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  let id = 0;
  try {
    const date = str(fd, "date");
    if (!YMD.test(date)) throw new Error("请选择日期");
    const hasAfternoon = bool(fd, "hasAfternoon") ? 1 : 0;
    const hasEvening = bool(fd, "hasEvening") ? 1 : 0;
    if (!hasAfternoon && !hasEvening) throw new Error("至少选一个场次");
    // 报名人数上限：留空 = 不限。上限只管报名，管理员手动加人不受它限制
    const capacity = optNum(fd, "capacity");
    if (capacity !== null && capacity < 1) throw new Error("人数上限至少是 1，不限就留空");
    const row = db
      .insert(events)
      .values({
        date,
        title: str(fd, "title") || `${formatMd(date)} 血染`,
        location: optStr(fd, "location"),
        startTime: optStr(fd, "startTime"),
        note: optStr(fd, "note"),
        hasAfternoon,
        hasEvening,
        capacity,
        status: STATUSES.includes(str(fd, "status")) ? str(fd, "status") : "planned",
      })
      .returning({ id: events.id })
      .get();
    id = row.id;
    logAudit(admin.id, "event.create", "event", id);
  } catch (e) {
    redirect(withMsg("/admin/events/new", errMsg(e)));
  }
  revalidatePath("/events");
  revalidatePath("/");
  redirect(`/events/${id}`);
}

export async function updateEvent(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = num(fd, "eventId");
  const back = `/events/${id}`;
  try {
    const date = str(fd, "date");
    if (!YMD.test(date)) throw new Error("请选择日期");
    const hasAfternoon = bool(fd, "hasAfternoon") ? 1 : 0;
    const hasEvening = bool(fd, "hasEvening") ? 1 : 0;
    if (!hasAfternoon && !hasEvening) throw new Error("至少选一个场次");
    // 报名人数上限：留空 = 不限。上限只管报名，管理员手动加人不受它限制
    const capacity = optNum(fd, "capacity");
    if (capacity !== null && capacity < 1) throw new Error("人数上限至少是 1，不限就留空");
    db.update(events)
      .set({
        date,
        title: str(fd, "title") || `${formatMd(date)} 血染`,
        location: optStr(fd, "location"),
        startTime: optStr(fd, "startTime"),
        note: optStr(fd, "note"),
        hasAfternoon,
        hasEvening,
        capacity,
        status: STATUSES.includes(str(fd, "status")) ? str(fd, "status") : "planned",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(events.id, id))
      .run();
    logAudit(admin.id, "event.update", "event", id);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  revalidatePath("/events");
  redirect(withMsg(back, "活动已更新", "ok"));
}

/** EVT-04：级联删除（外键 on delete cascade 处理报名 / 游戏 / 文件） */
export async function deleteEvent(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = num(fd, "eventId");
  const back = str(fd, "back") || "/events";
  // 活动详情页要手打「删除」两个字；后台列表页走浏览器确认框（confirm=1）
  if (str(fd, "confirm") !== "删除" && str(fd, "confirm") !== "1") {
    redirect(withMsg(`/events/${id}`, "请在确认框里输入「删除」两个字"));
  }
  db.update(polls).set({ status: "closed", eventId: null }).where(eq(polls.eventId, id)).run();
  db.delete(events).where(eq(events.id, id)).run(); // event_files 由外键级联删掉
  await removeEventDir(id); // 磁盘上的图片和 JSON 跟着走
  logAudit(admin.id, "event.delete", "event", id);
  revalidatePath("/events");
  revalidatePath("/admin/events");
  revalidatePath("/");
  redirect(withMsg(back, "活动已删除", "ok"));
}

/** 后台列表里改活动状态：计划中 / 已结束 / 已取消 */
export async function setEventStatus(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = num(fd, "eventId");
  const status = str(fd, "status");
  try {
    if (!["planned", "done", "cancelled"].includes(status)) throw new Error("状态不对");
    const ev = db.select().from(events).where(eq(events.id, id)).get();
    if (!ev) throw new Error("活动不存在");
    db.update(events).set({ status, updatedAt: new Date().toISOString() }).where(eq(events.id, id)).run();
    logAudit(admin.id, `event.status.${status}`, "event", id, ev.title);
  } catch (e) {
    redirect(withMsg("/admin/events", errMsg(e)));
  }
  revalidatePath("/admin/events");
  revalidatePath(`/events/${id}`);
  revalidatePath("/events");
  revalidatePath("/");
  redirect(withMsg("/admin/events", "已更新", "ok"));
}
