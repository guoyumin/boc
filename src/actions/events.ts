"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { events, polls } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatMd } from "@/lib/dates";
import { bool, errMsg, num, optStr, str, withMsg } from "@/lib/form";
import { logAudit } from "@/lib/audit";

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
    db.update(events)
      .set({
        date,
        title: str(fd, "title") || `${formatMd(date)} 血染`,
        location: optStr(fd, "location"),
        startTime: optStr(fd, "startTime"),
        note: optStr(fd, "note"),
        hasAfternoon,
        hasEvening,
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
  if (str(fd, "confirm") !== "删除") {
    redirect(withMsg(`/events/${id}`, "请在确认框里输入「删除」两个字"));
  }
  db.update(polls).set({ status: "closed", eventId: null }).where(eq(polls.eventId, id)).run();
  db.delete(events).where(eq(events.id, id)).run();
  logAudit(admin.id, "event.delete", "event", id);
  revalidatePath("/events");
  revalidatePath("/");
  redirect(withMsg("/events", "活动已删除", "ok"));
}
