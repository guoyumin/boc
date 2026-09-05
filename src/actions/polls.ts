"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { events, pollResponses, polls, POLL_SLOTS, type PollSlot } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { addDays, formatMd, pollTitle } from "@/lib/dates";
import { errMsg, many, num, optStr, str, withMsg } from "@/lib/form";
import { findOrCreatePlayer } from "@/lib/players";
import { assertWriteRate } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function createPoll(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  let newId = 0;
  try {
    const saturday = str(fd, "saturday");
    if (!YMD.test(saturday)) throw new Error("请选择周末日期");
    const slots = many(fd, "slots").filter((s): s is PollSlot => (POLL_SLOTS as readonly string[]).includes(s));
    if (slots.length === 0) throw new Error("至少保留一个时段");
    const title = str(fd, "title") || pollTitle(saturday);
    // POLL-01：同一时间只有一个进行中的预填
    db.update(polls).set({ status: "closed" }).where(eq(polls.status, "open")).run();
    const row = db
      .insert(polls)
      .values({ saturday, title, slots: JSON.stringify(slots), note: optStr(fd, "note"), status: "open" })
      .returning({ id: polls.id })
      .get();
    newId = row.id;
    logAudit(admin.id, "poll.create", "poll", newId, title);
  } catch (e) {
    redirect(withMsg("/admin/polls/new", errMsg(e)));
  }
  revalidatePath("/");
  revalidatePath("/polls");
  redirect(`/polls/${newId}`);
}

export async function submitPollResponse(fd: FormData): Promise<void> {
  const pollId = num(fd, "pollId");
  const back = `/polls/${pollId}`;
  try {
    await assertWriteRate("poll");
    const poll = db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) throw new Error("预填不存在");
    if (poll.status !== "open") throw new Error("这次预填已经不接受填写了");
    const player = findOrCreatePlayer(str(fd, "nickname"));
    const allowed = new Set(JSON.parse(poll.slots) as string[]);
    const slots = many(fd, "slots").filter((s) => allowed.has(s));
    db.insert(pollResponses)
      .values({
        pollId,
        playerId: player.id,
        slots: JSON.stringify(slots),
        note: optStr(fd, "note"),
      })
      .onConflictDoUpdate({
        target: [pollResponses.pollId, pollResponses.playerId],
        set: {
          slots: JSON.stringify(slots),
          note: optStr(fd, "note"),
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  revalidatePath("/");
  redirect(withMsg(back, "已保存你的时间", "ok"));
}

export async function closePoll(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const pollId = num(fd, "pollId");
  db.update(polls).set({ status: "closed", updatedAt: new Date().toISOString() }).where(eq(polls.id, pollId)).run();
  logAudit(admin.id, "poll.close", "poll", pollId);
  revalidatePath(`/polls/${pollId}`);
  revalidatePath("/polls");
  revalidatePath("/");
  redirect(withMsg(`/polls/${pollId}`, "预填已关闭", "ok"));
}

export async function reopenPoll(fd: FormData): Promise<void> {
  await requireAdmin();
  const pollId = num(fd, "pollId");
  db.update(polls).set({ status: "closed" }).where(and(eq(polls.status, "open"), ne(polls.id, pollId))).run();
  db.update(polls).set({ status: "open", updatedAt: new Date().toISOString() }).where(eq(polls.id, pollId)).run();
  revalidatePath(`/polls/${pollId}`);
  revalidatePath("/");
  redirect(withMsg(`/polls/${pollId}`, "预填已重新打开", "ok"));
}

/** POLL-06：把预填结果定下来，创建活动。 */
export async function decidePoll(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const pollId = num(fd, "pollId");
  const back = `/polls/${pollId}`;
  let eventId = 0;
  try {
    const poll = db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) throw new Error("预填不存在");
    const day = str(fd, "day");
    if (day !== "sat" && day !== "sun") throw new Error("请选择周六还是周日");
    const date = day === "sat" ? poll.saturday : addDays(poll.saturday, 1);
    const sessions = str(fd, "sessions") || "full";
    const hasAfternoon = sessions === "afternoon" || sessions === "full" ? 1 : 0;
    const hasEvening = sessions === "evening" || sessions === "full" ? 1 : 0;
    const row = db
      .insert(events)
      .values({
        date,
        title: str(fd, "title") || `${formatMd(date)} 血染`,
        location: optStr(fd, "location"),
        startTime: optStr(fd, "startTime"),
        hasAfternoon,
        hasEvening,
        status: "planned",
      })
      .returning({ id: events.id })
      .get();
    eventId = row.id;
    db.update(polls)
      .set({ status: "decided", eventId, updatedAt: new Date().toISOString() })
      .where(eq(polls.id, pollId))
      .run();
    logAudit(admin.id, "poll.decide", "poll", pollId, `event=${eventId}`);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath("/");
  revalidatePath("/polls");
  revalidatePath("/events");
  redirect(withMsg(`/events/${eventId}`, "活动已创建，快去群里喊人报名", "ok"));
}
