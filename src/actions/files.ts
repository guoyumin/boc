"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { eventFiles, events, games } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { errMsg, num, optNum, str, withMsg } from "@/lib/form";
import { logAudit } from "@/lib/audit";
import { parseScriptJson } from "@/lib/script-json";
import { MAX_IMAGE_BYTES, MAX_JSON_BYTES, detectKind, removeFiles, safeName, saveImage, saveJson } from "@/lib/storage";

const SESSIONS = ["afternoon", "evening"];

function mb(n: number): string {
  return `${Math.round((n / 1024 / 1024) * 10) / 10} MB`;
}

/**
 * FILE-01：管理员给活动上传文件。支持一次选多个。
 * 站点是公开的，所以这里不能放开非管理员——匿名上传端点太容易被滥用。
 */
export async function uploadEventFiles(fd: FormData): Promise<void> {
  const eventId = num(fd, "eventId");
  const back = `/events/${eventId}`;
  let ok = 0;

  try {
    const admin = await requireAdmin();
    const event = db.select().from(events).where(eq(events.id, eventId)).get();
    if (!event) throw new Error("活动不存在");

    const session = SESSIONS.includes(str(fd, "session")) ? str(fd, "session") : null;
    const gameId = optNum(fd, "gameId");
    if (gameId) {
      const g = db.select().from(games).where(eq(games.id, gameId)).get();
      if (!g || g.eventId !== eventId) throw new Error("选中的局不属于这次活动");
    }

    const picked = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (picked.length === 0) throw new Error("请先选择文件");

    for (const file of picked) {
      const name = safeName(file.name);
      const buf = Buffer.from(await file.arrayBuffer());
      const detected = detectKind(buf, name);

      if (detected.kind === "board_image") {
        if (buf.length > MAX_IMAGE_BYTES) {
          throw new Error(`${name}：图片 ${mb(buf.length)}，超过 10 MB 上限`);
        }
        const saved = await saveImage(eventId, buf, detected.ext);
        db.insert(eventFiles)
          .values({
            eventId,
            gameId,
            kind: "board_image",
            session,
            originalName: name,
            storagePath: saved.storagePath,
            thumbPath: saved.thumbPath,
            mime: saved.mime,
            size: saved.size,
            uploadedBy: admin.id,
          })
          .run();
      } else {
        if (buf.length > MAX_JSON_BYTES) {
          throw new Error(`${name}：JSON ${mb(buf.length)}，超过 1 MB 上限`);
        }
        const meta = parseScriptJson(buf.toString("utf8"));
        const saved = await saveJson(eventId, buf);
        const row = db
          .insert(eventFiles)
          .values({
            eventId,
            gameId,
            kind: "script_json",
            session,
            originalName: name,
            storagePath: saved.storagePath,
            thumbPath: null,
            mime: saved.mime,
            size: saved.size,
            scriptName: meta.scriptName,
            scriptAuthor: meta.scriptAuthor,
            roleCount: meta.roleCount,
            uploadedBy: admin.id,
          })
          .returning({ id: eventFiles.id })
          .get();
        // 关联到某一局的剧本 JSON，同时回填 games.script_file_id
        if (gameId) {
          db.update(games).set({ scriptFileId: row.id }).where(eq(games.id, gameId)).run();
        }
      }
      ok += 1;
    }
    logAudit(admin.id, "file.upload", "event", eventId, `${ok} 个文件`);
  } catch (e) {
    const msg = errMsg(e);
    redirect(withMsg(back, ok > 0 ? `已上传 ${ok} 个，其余失败：${msg}` : msg));
  }
  revalidatePath(back);
  redirect(withMsg(back, `已上传 ${ok} 个文件`, "ok"));
}

/** 先删数据库记录，再删磁盘文件；磁盘上没有也不报错。 */
export async function deleteEventFile(fd: FormData): Promise<void> {
  const fileId = num(fd, "fileId");
  const row = db.select().from(eventFiles).where(eq(eventFiles.id, fileId)).get();
  const back = `/events/${row?.eventId ?? num(fd, "eventId")}`;
  try {
    const admin = await requireAdmin();
    if (!row) throw new Error("文件已经不在了");
    db.update(games).set({ scriptFileId: null }).where(eq(games.scriptFileId, fileId)).run();
    db.delete(eventFiles).where(eq(eventFiles.id, fileId)).run();
    await removeFiles([row.storagePath, row.thumbPath]);
    logAudit(admin.id, "file.delete", "event_file", fileId, row.originalName);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  redirect(withMsg(back, "文件已删除", "ok"));
}
