"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { errMsg, num, str, withMsg } from "@/lib/form";
import { checkNickname } from "@/lib/names";
import { findPlayer, parseAliases, splitNames } from "@/lib/players";
import { logAudit } from "@/lib/audit";

const BACK = "/admin/players";

/** ROS-04：重命名 */
export async function renamePlayer(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = num(fd, "playerId");
  try {
    const check = checkNickname(str(fd, "name"));
    if (!check.ok) throw new Error(check.error);
    const other = findPlayer(check.name);
    if (other && other.id !== id) throw new Error(`「${check.name}」已经是另一个玩家了`);
    db.update(players)
      .set({ name: check.name, updatedAt: new Date().toISOString() })
      .where(eq(players.id, id))
      .run();
    logAudit(admin.id, "player.rename", "player", id, check.name);
  } catch (e) {
    redirect(withMsg(BACK, errMsg(e)));
  }
  revalidatePath(BACK);
  revalidatePath(`/players/${id}`);
  redirect(withMsg(BACK, "已改名", "ok"));
}

/** ROS-04：别名（接龙里名字不统一时用） */
export async function setAliases(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = num(fd, "playerId");
  try {
    const list = [...new Set(splitNames(str(fd, "aliases")))];
    for (const a of list) {
      const other = findPlayer(a);
      if (other && other.id !== id) throw new Error(`「${a}」和玩家「${other.name}」冲突`);
    }
    db.update(players)
      .set({ aliases: JSON.stringify(list), updatedAt: new Date().toISOString() })
      .where(eq(players.id, id))
      .run();
    logAudit(admin.id, "player.aliases", "player", id, list.join("/"));
  } catch (e) {
    redirect(withMsg(BACK, errMsg(e)));
  }
  revalidatePath(BACK);
  redirect(withMsg(BACK, "别名已保存", "ok"));
}

export async function toggleArchive(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = num(fd, "playerId");
  const row = db.select().from(players).where(eq(players.id, id)).get();
  if (!row) redirect(withMsg(BACK, "玩家不存在"));
  const next = row.archived === 1 ? 0 : 1;
  db.update(players)
    .set({ archived: next, updatedAt: new Date().toISOString() })
    .where(eq(players.id, id))
    .run();
  logAudit(admin.id, next ? "player.archive" : "player.unarchive", "player", id, row.name);
  revalidatePath(BACK);
  redirect(withMsg(BACK, next ? "已归档" : "已恢复", "ok"));
}

export async function currentAliases(id: number): Promise<string[]> {
  const row = db.select().from(players).where(eq(players.id, id)).get();
  return row ? parseAliases(row.aliases) : [];
}

/** /me 用：按昵称找玩家 id */
export async function lookupPlayerId(nickname: string): Promise<number | null> {
  const p = findPlayer(nickname);
  return p ? p.id : null;
}
