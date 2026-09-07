"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { eventFiles, scriptPollOptions, scriptPollVotes, scriptPolls } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { MAX_IMAGE_BYTES, detectKind, safeName, saveImage } from "@/lib/storage";
import { errMsg, many, num, optNum, optStr, str, withMsg } from "@/lib/form";
import { findOrCreatePlayer } from "@/lib/players";
import { assertWriteRate } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

/** 候选剧本一行一个，允许「名字 · 说明」这种写法 */
function parseOptions(raw: string): { name: string; note: string | null }[] {
  const seen = new Set<string>();
  const out: { name: string; note: string | null }[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const [name, ...rest] = t.split(/\s*[·|]\s*/);
    const key = name!.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: name.slice(0, 60), note: rest.join(" ").slice(0, 100) || null });
  }
  return out;
}

export async function createScriptPoll(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const eventId = optNum(fd, "eventId");
  const back = eventId ? `/events/${eventId}` : "/admin/events";
  let pollId = 0;
  try {
    // 候选有两个来源：勾选活动里已上传的剧本 JSON，或者手填
    const picked = many(fd, "fromFiles").map(Number).filter(Number.isInteger);
    const fromFiles = picked.length
      ? db
          .select()
          .from(eventFiles)
          .where(and(eq(eventFiles.kind, "script_json"), inArray(eventFiles.id, picked)))
          .all()
          .map((f) => ({ name: f.scriptName ?? f.originalName, note: f.scriptAuthor, fileId: f.id }))
      : [];
    const typed = parseOptions(str(fd, "options")).map((o) => ({ ...o, fileId: null as number | null }));
    const options = [...fromFiles, ...typed];
    if (options.length < 2) {
      throw new Error("至少要两个候选：勾几个已上传的剧本，或者手填几行");
    }
    const title = str(fd, "title") || "剧本投票";
    db.transaction((tx) => {
      tx.insert(scriptPolls).values({ eventId, title, note: optStr(fd, "note") }).run();
      pollId = tx.select({ id: scriptPolls.id }).from(scriptPolls).all().at(-1)!.id;
      tx.insert(scriptPollOptions)
        .values(
          options.map((o, i) => ({
            pollId,
            name: o.name,
            note: o.note,
            fileId: o.fileId,
            sortOrder: i,
          })),
        )
        .run();
    });
    logAudit(admin.id, "script_poll.create", "script_poll", pollId, title);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  redirect(withMsg(`/script-polls/${pollId}`, "剧本投票已发起", "ok"));
}

/**
 * 投票 / 改票。多选，重复提交按最后一次算：
 * 先把这个人在这场投票里的行全删掉，再按新选择重写。
 */
export async function submitScriptVote(fd: FormData): Promise<void> {
  const pollId = num(fd, "pollId");
  const back = `/script-polls/${pollId}`;
  try {
    await assertWriteRate("script-poll");
    const poll = db.select().from(scriptPolls).where(eq(scriptPolls.id, pollId)).get();
    if (!poll) throw new Error("剧本投票不存在");
    if (poll.status !== "open") throw new Error("这次剧本投票已经锁定，不能再投了");
    const player = findOrCreatePlayer(str(fd, "nickname"));
    const valid = db
      .select({ id: scriptPollOptions.id })
      .from(scriptPollOptions)
      .where(eq(scriptPollOptions.pollId, pollId))
      .all()
      .map((o) => o.id);
    const picked = many(fd, "options")
      .map((x) => Number(x))
      .filter((id) => valid.includes(id));
    if (picked.length === 0) throw new Error("至少选一个剧本");
    db.transaction((tx) => {
      tx.delete(scriptPollVotes)
        .where(and(eq(scriptPollVotes.pollId, pollId), eq(scriptPollVotes.playerId, player.id)))
        .run();
      tx.insert(scriptPollVotes)
        .values(picked.map((optionId) => ({ pollId, optionId, playerId: player.id })))
        .run();
    });
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  redirect(withMsg(back, "投好了，随时可以回来改", "ok"));
}

/** 撤回自己的票：记录直接删掉，因为剧本投票没有「填过又没空」这种语义 */
export async function withdrawScriptVote(fd: FormData): Promise<void> {
  const pollId = num(fd, "pollId");
  const back = `/script-polls/${pollId}`;
  try {
    await assertWriteRate("script-poll");
    const poll = db.select().from(scriptPolls).where(eq(scriptPolls.id, pollId)).get();
    if (!poll) throw new Error("剧本投票不存在");
    if (poll.status !== "open") throw new Error("这次剧本投票已经锁定，不能再改了");
    const player = findOrCreatePlayer(str(fd, "nickname"));
    const r = db
      .delete(scriptPollVotes)
      .where(and(eq(scriptPollVotes.pollId, pollId), eq(scriptPollVotes.playerId, player.id)))
      .run();
    if (r.changes === 0) throw new Error("没找到你的票——你这次还没投过");
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  redirect(withMsg(back, "已撤掉你的票", "ok"));
}

/** 锁定 / 重新开放 */
export async function setScriptPollStatus(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const pollId = num(fd, "pollId");
  const status = str(fd, "status");
  const back = `/script-polls/${pollId}`;
  try {
    if (!["open", "locked"].includes(status)) throw new Error("状态不对");
    db.update(scriptPolls)
      .set({ status, decidedOptionId: null, updatedAt: new Date().toISOString() })
      .where(eq(scriptPolls.id, pollId))
      .run();
    logAudit(admin.id, `script_poll.${status}`, "script_poll", pollId);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  redirect(withMsg(back, status === "locked" ? "已锁定，不能再投了" : "已重新开放", "ok"));
}

/** 定下最终玩哪个本 */
export async function decideScriptPoll(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const pollId = num(fd, "pollId");
  const optionId = num(fd, "optionId");
  const back = `/script-polls/${pollId}`;
  let name = "";
  try {
    const opt = db
      .select()
      .from(scriptPollOptions)
      .where(and(eq(scriptPollOptions.id, optionId), eq(scriptPollOptions.pollId, pollId)))
      .get();
    if (!opt) throw new Error("这个候选不在这场投票里");
    name = opt.name;
    db.update(scriptPolls)
      .set({ status: "decided", decidedOptionId: optionId, updatedAt: new Date().toISOString() })
      .where(eq(scriptPolls.id, pollId))
      .run();
    logAudit(admin.id, "script_poll.decide", "script_poll", pollId, opt.name);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  redirect(withMsg(back, `定了：${name}`, "ok"));
}

export async function deleteScriptPoll(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const pollId = num(fd, "pollId");
  const poll = db.select().from(scriptPolls).where(eq(scriptPolls.id, pollId)).get();
  const back = poll?.eventId ? `/events/${poll.eventId}` : "/events";
  db.delete(scriptPolls).where(eq(scriptPolls.id, pollId)).run();
  logAudit(admin.id, "script_poll.delete", "script_poll", pollId, poll?.title);
  revalidatePath(back);
  redirect(withMsg(back, "剧本投票已删除", "ok"));
}

/**
 * 新增 / 编辑一个候选剧本：名字、描述、一张图（issue 追加需求）。
 *
 * 图片走和板子图同一条管线（magic bytes 判类型、sharp 去 EXIF、生成缩略图），
 * 落在 event_files 里但用 script_option 这个 kind，所以不会混进活动页的文件列表。
 * 因此上传图片要求这场投票挂在活动下——磁盘路径是按活动 id 分目录的。
 */
export async function saveScriptOption(fd: FormData): Promise<void> {
  const pollId = num(fd, "pollId");
  const back = `/script-polls/${pollId}`;
  try {
    const admin = await requireAdmin();
    const poll = db.select().from(scriptPolls).where(eq(scriptPolls.id, pollId)).get();
    if (!poll) throw new Error("剧本投票不存在");
    const optionId = optNum(fd, "optionId");
    const name = str(fd, "name");
    if (!name) throw new Error("给这个本起个名字");
    const note = optStr(fd, "note");

    let imageFileId: number | null = null;
    const file = fd.get("image");
    if (file instanceof File && file.size > 0) {
      if (!poll.eventId) throw new Error("这场投票没挂在活动下，传不了图");
      const buf = Buffer.from(await file.arrayBuffer());
      const detected = detectKind(buf, safeName(file.name));
      if (detected.kind !== "board_image") throw new Error("只收图片（jpg / png / webp）");
      if (buf.length > MAX_IMAGE_BYTES) throw new Error("图片超过 10 MB 上限");
      const saved = await saveImage(poll.eventId, buf, detected.ext);
      db.insert(eventFiles)
        .values({
          eventId: poll.eventId,
          kind: "script_option",
          originalName: safeName(file.name),
          storagePath: saved.storagePath,
          thumbPath: saved.thumbPath,
          mime: saved.mime,
          size: saved.size,
          uploadedBy: admin.id,
        })
        .run();
      imageFileId = db.select({ id: eventFiles.id }).from(eventFiles).all().at(-1)!.id;
    }

    if (optionId) {
      db.update(scriptPollOptions)
        // 没重新选图就别把原来的图清掉
        .set({ name, note, ...(imageFileId ? { imageFileId } : {}) })
        .where(and(eq(scriptPollOptions.id, optionId), eq(scriptPollOptions.pollId, pollId)))
        .run();
    } else {
      const last = db
        .select({ sortOrder: scriptPollOptions.sortOrder })
        .from(scriptPollOptions)
        .where(eq(scriptPollOptions.pollId, pollId))
        .all()
        .reduce((m, o) => Math.max(m, o.sortOrder), 0);
      db.insert(scriptPollOptions)
        .values({ pollId, name, note, imageFileId, sortOrder: last + 1 })
        .run();
    }
    logAudit(admin.id, optionId ? "script_option.update" : "script_option.create", "script_poll", pollId, name);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  redirect(withMsg(back, "已保存", "ok"));
}

export async function deleteScriptOption(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const pollId = num(fd, "pollId");
  const optionId = num(fd, "optionId");
  const back = `/script-polls/${pollId}`;
  db.delete(scriptPollOptions)
    .where(and(eq(scriptPollOptions.id, optionId), eq(scriptPollOptions.pollId, pollId)))
    .run();
  logAudit(admin.id, "script_option.delete", "script_poll", pollId);
  revalidatePath(back);
  redirect(withMsg(back, "候选已删除", "ok"));
}
