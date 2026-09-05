"use server";

import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { GAME_SESSIONS, gamePlayers, gameStorytellers, games, players } from "@/db/schema";
import { getAdmin } from "@/lib/auth";
import { errMsg, many, num, optNum, optStr, str, withMsg } from "@/lib/form";
import { findOrCreatePlayer, findOrCreatePlayers, splitNames } from "@/lib/players";
import { normalizeName } from "@/lib/names";
import { assertWriteRate } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const RESULTS = ["good", "evil", "unknown"];

function asSession(v: string): string {
  return (GAME_SESSIONS as readonly string[]).includes(v) ? v : "afternoon";
}

/** GAME-05：记录者本人（同昵称）或管理员可改 */
async function assertCanEdit(gameId: number, nickname: string): Promise<number> {
  const admin = await getAdmin();
  const game = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game) throw new Error("这一局不存在");
  if (admin) return game.eventId;
  const recorder = game.recordedBy
    ? db.select().from(players).where(eq(players.id, game.recordedBy)).get()
    : null;
  if (!recorder) throw new Error("这一局没有记录者，只有管理员能改");
  if (normalizeName(recorder.name) !== normalizeName(nickname)) {
    throw new Error(`只有记录者（${recorder.name}）本人或管理员可以修改`);
  }
  return game.eventId;
}

function saveStorytellers(gameId: number, raw: string) {
  db.delete(gameStorytellers).where(eq(gameStorytellers.gameId, gameId)).run();
  for (const p of findOrCreatePlayers(splitNames(raw))) {
    db.insert(gameStorytellers).values({ gameId, playerId: p.id }).run();
  }
}

function saveLineup(gameId: number, names: string[], roles: string[], seats: string[]) {
  db.delete(gamePlayers).where(eq(gamePlayers.gameId, gameId)).run();
  const used = new Set<number>();
  names.forEach((rawName, i) => {
    const name = rawName.trim();
    if (!name) return;
    const player = findOrCreatePlayer(name);
    if (used.has(player.id)) return;
    used.add(player.id);
    const seat = Number(seats[i]);
    db.insert(gamePlayers)
      .values({
        gameId,
        playerId: player.id,
        roleName: (roles[i] ?? "").trim(),
        seat: Number.isFinite(seat) && seat > 0 ? seat : null,
      })
      .run();
  });
}

/** GAME-01 */
export async function createGame(fd: FormData): Promise<void> {
  const eventId = num(fd, "eventId");
  const back = `/events/${eventId}`;
  let gameId = 0;
  try {
    await assertWriteRate("game");
    const scriptName = str(fd, "scriptName");
    if (!scriptName) throw new Error("请填写剧本名");
    const recorder = findOrCreatePlayer(str(fd, "nickname"));
    const session = asSession(str(fd, "session"));
    const last = db
      .select({ seq: games.seq })
      .from(games)
      .where(eq(games.eventId, eventId))
      .orderBy(desc(games.seq))
      .get();
    const row = db
      .insert(games)
      .values({
        eventId,
        session,
        seq: (last?.seq ?? 0) + 1,
        scriptName,
        result: RESULTS.includes(str(fd, "result")) ? str(fd, "result") : "unknown",
        note: optStr(fd, "note"),
        recordedBy: recorder.id,
      })
      .returning({ id: games.id })
      .get();
    gameId = row.id;
    saveStorytellers(gameId, str(fd, "storytellers"));
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  revalidatePath("/events");
  redirect(withMsg(`/games/${gameId}`, "这一局已记下，接着补玩家和角色", "ok"));
}

export async function updateGame(fd: FormData): Promise<void> {
  const gameId = num(fd, "gameId");
  const back = `/games/${gameId}`;
  let eventId = 0;
  try {
    await assertWriteRate("game");
    eventId = await assertCanEdit(gameId, str(fd, "nickname"));
    const scriptName = str(fd, "scriptName");
    if (!scriptName) throw new Error("请填写剧本名");
    db.update(games)
      .set({
        session: asSession(str(fd, "session")),
        seq: Math.max(1, num(fd, "seq") || 1),
        scriptName,
        result: RESULTS.includes(str(fd, "result")) ? str(fd, "result") : "unknown",
        note: optStr(fd, "note"),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(games.id, gameId))
      .run();
    saveStorytellers(gameId, str(fd, "storytellers"));
    saveLineup(gameId, many(fd, "lineupName"), many(fd, "lineupRole"), many(fd, "lineupSeat"));
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  revalidatePath(`/events/${eventId}`);
  redirect(withMsg(back, "已保存", "ok"));
}

export async function deleteGame(fd: FormData): Promise<void> {
  const gameId = num(fd, "gameId");
  const back = `/games/${gameId}`;
  let eventId = 0;
  try {
    eventId = await assertCanEdit(gameId, str(fd, "nickname"));
    const admin = await getAdmin();
    db.delete(games).where(eq(games.id, gameId)).run();
    logAudit(admin?.id ?? null, "game.delete", "game", gameId);
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(`/events/${eventId}`);
  redirect(withMsg(`/events/${eventId}`, "这一局已删除", "ok"));
}

/** 单独加一个玩家行（详情页的快捷添加） */
export async function addGamePlayer(fd: FormData): Promise<void> {
  const gameId = num(fd, "gameId");
  const back = `/games/${gameId}`;
  try {
    await assertWriteRate("game");
    await assertCanEdit(gameId, str(fd, "nickname"));
    const player = findOrCreatePlayer(str(fd, "playerName"));
    const seat = optNum(fd, "seat");
    db.insert(gamePlayers)
      .values({ gameId, playerId: player.id, roleName: str(fd, "roleName"), seat })
      .onConflictDoUpdate({
        target: [gamePlayers.gameId, gamePlayers.playerId],
        set: { roleName: str(fd, "roleName"), seat },
      })
      .run();
  } catch (e) {
    redirect(withMsg(back, errMsg(e)));
  }
  revalidatePath(back);
  redirect(withMsg(back, "已添加", "ok"));
}
