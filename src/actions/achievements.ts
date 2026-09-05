"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { CATEGORIES, RARITIES, achievementClaims, achievements } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { bool, errMsg, num, optNum, optStr, str, withMsg } from "@/lib/form";
import { findOrCreatePlayer } from "@/lib/players";
import { assertWriteRate } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

function asCategory(v: string): string {
  return (CATEGORIES as readonly string[]).includes(v) ? v : "other";
}
function asRarity(v: string): string {
  return (RARITIES as readonly string[]).includes(v) ? v : "common";
}

/** ACH-03：玩家宣告"我达成了" */
export async function claimAchievement(fd: FormData): Promise<void> {
  const achievementId = num(fd, "achievementId");
  const back = `/achievements/${achievementId}`;
  try {
    await assertWriteRate("claim");
    const ach = db.select().from(achievements).where(eq(achievements.id, achievementId)).get();
    if (!ach) throw new Error("成就不存在");
    if (ach.active !== 1) throw new Error("这个成就已经下架了");
    const player = findOrCreatePlayer(str(fd, "nickname"));
    const existing = db
      .select()
      .from(achievementClaims)
      .where(
        and(eq(achievementClaims.achievementId, achievementId), eq(achievementClaims.playerId, player.id)),
      )
      .get();
    if (existing?.status === "confirmed") throw new Error("你已经解锁过这个成就了");
    if (existing?.status === "pending") throw new Error("已经提交过了，等管理员确认");
    const values = {
      achievementId,
      playerId: player.id,
      eventId: optNum(fd, "eventId"),
      note: optStr(fd, "note"),
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      unlockedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.insert(achievementClaims)
      .values(values)
      .onConflictDoUpdate({
        target: [achievementClaims.achievementId, achievementClaims.playerId],
        set: values,
      })
      .run();
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  revalidatePath("/achievements");
  redirect(withMsg(back, "已提交，等管理员确认", "ok"));
}

/** ACH-04：确认 / 驳回 */
export async function reviewClaim(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const claimId = num(fd, "claimId");
  const decision = str(fd, "decision") === "confirm" ? "confirmed" : "rejected";
  const back = str(fd, "back") || "/admin/claims";
  db.update(achievementClaims)
    .set({
      status: decision,
      reviewedBy: admin.id,
      reviewedAt: new Date().toISOString(),
      reviewNote: optStr(fd, "reviewNote"),
      unlockedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(achievementClaims.id, claimId))
    .run();
  logAudit(admin.id, `claim.${decision}`, "achievement_claim", claimId);
  revalidatePath("/admin");
  revalidatePath("/admin/claims");
  revalidatePath("/achievements");
  revalidatePath("/");
  redirect(withMsg(back, decision === "confirmed" ? "已确认，成就上墙" : "已驳回", "ok"));
}

/** ACH-05：管理员直接授予 */
export async function grantAchievement(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const achievementId = num(fd, "achievementId");
  const back = str(fd, "back") || `/achievements/${achievementId}`;
  try {
    const player = findOrCreatePlayer(str(fd, "nickname"));
    const values = {
      achievementId,
      playerId: player.id,
      eventId: optNum(fd, "eventId"),
      note: optStr(fd, "note"),
      status: "confirmed",
      reviewedBy: admin.id,
      reviewedAt: new Date().toISOString(),
      unlockedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.insert(achievementClaims)
      .values(values)
      .onConflictDoUpdate({
        target: [achievementClaims.achievementId, achievementClaims.playerId],
        set: values,
      })
      .run();
    logAudit(admin.id, "claim.grant", "achievement", achievementId, player.name);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath("/achievements");
  revalidatePath(back);
  redirect(withMsg(back, "已授予", "ok"));
}

/** ACH-01 */
export async function saveAchievement(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = optNum(fd, "achievementId");
  const back = "/admin/achievements";
  try {
    const name = str(fd, "name");
    if (!name) throw new Error("请填写成就名称");
    const values = {
      name,
      description: str(fd, "description"),
      icon: str(fd, "icon") || "🏆",
      category: asCategory(str(fd, "category")),
      rarity: asRarity(str(fd, "rarity")),
      hidden: bool(fd, "hidden") ? 1 : 0,
      sortOrder: num(fd, "sortOrder") || 100,
      active: bool(fd, "active") ? 1 : 0,
      updatedAt: new Date().toISOString(),
    };
    if (id) {
      db.update(achievements).set(values).where(eq(achievements.id, id)).run();
      logAudit(admin.id, "achievement.update", "achievement", id, name);
    } else {
      const row = db.insert(achievements).values(values).returning({ id: achievements.id }).get();
      logAudit(admin.id, "achievement.create", "achievement", row.id, name);
    }
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath("/achievements");
  revalidatePath(back);
  redirect(withMsg(back, "已保存", "ok"));
}

export async function deleteAchievement(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = num(fd, "achievementId");
  db.delete(achievements).where(eq(achievements.id, id)).run();
  logAudit(admin.id, "achievement.delete", "achievement", id);
  revalidatePath("/achievements");
  revalidatePath("/admin/achievements");
  redirect(withMsg("/admin/achievements", "成就已删除", "ok"));
}
