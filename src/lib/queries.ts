import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  achievementClaims,
  achievements,
  eventFiles,
  eventSignups,
  events,
  gamePlayers,
  gameStorytellers,
  games,
  pollResponses,
  players,
  polls,
  type PollSlot,
} from "@/db/schema";
import { POLL_SLOTS } from "@/db/schema";
import { isFinished, isNoShow, starPoints } from "./labels";

export type Poll = typeof polls.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;

export function parseJsonArray(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function pollSlots(poll: Poll): PollSlot[] {
  const raw = parseJsonArray(poll.slots);
  return POLL_SLOTS.filter((s) => raw.includes(s));
}

export function getOpenPoll(): Poll | null {
  return (
    db.select().from(polls).where(eq(polls.status, "open")).orderBy(desc(polls.saturday)).get() ?? null
  );
}

export type PollResponseView = {
  id: number;
  playerId: number;
  name: string;
  slots: PollSlot[];
  note: string | null;
};

export type PollView = {
  poll: Poll;
  slots: PollSlot[];
  responses: PollResponseView[];
  counts: Record<string, number>;
  best: number;
  event: EventRow | null;
};

export function getPollView(id: number): PollView | null {
  const poll = db.select().from(polls).where(eq(polls.id, id)).get();
  if (!poll) return null;
  const slots = pollSlots(poll);
  const raw = db
    .select({
      id: pollResponses.id,
      playerId: pollResponses.playerId,
      name: players.name,
      slots: pollResponses.slots,
      note: pollResponses.note,
      createdAt: pollResponses.createdAt,
    })
    .from(pollResponses)
    .innerJoin(players, eq(players.id, pollResponses.playerId))
    .where(eq(pollResponses.pollId, id))
    .orderBy(pollResponses.id)
    .all();

  const responses: PollResponseView[] = raw.map((r) => ({
    id: r.id,
    playerId: r.playerId,
    name: r.name,
    slots: POLL_SLOTS.filter((s) => parseJsonArray(r.slots).includes(s)),
    note: r.note,
  }));

  const counts: Record<string, number> = {};
  for (const s of slots) counts[s] = responses.filter((r) => r.slots.includes(s)).length;
  const best = Math.max(0, ...slots.map((s) => counts[s] ?? 0));
  const event = poll.eventId
    ? (db.select().from(events).where(eq(events.id, poll.eventId)).get() ?? null)
    : null;
  return { poll, slots, responses, counts, best, event };
}

export type EventListRow = EventRow & {
  signupCount: number;
  attendCount: number;
  noShowCount: number;
  scripts: string[];
};

export function listEvents(limit = 50): EventListRow[] {
  const rows = db.select().from(events).orderBy(desc(events.date), desc(events.id)).limit(limit).all();
  if (rows.length === 0) return [];
  const ids = rows.map((e) => e.id);
  const signups = db
    .select({ eventId: eventSignups.eventId, signup: eventSignups.signup, attended: eventSignups.attended })
    .from(eventSignups)
    .where(inArray(eventSignups.eventId, ids))
    .all();
  const scriptRows = db
    .select({ eventId: games.eventId, scriptName: games.scriptName })
    .from(games)
    .where(inArray(games.eventId, ids))
    .all();
  return rows.map((e) => {
    const own = signups.filter((s) => s.eventId === e.id);
    return {
      ...e,
      signupCount: own.filter((s) => s.signup !== "none").length,
      attendCount: own.filter((s) => s.attended !== "none").length,
      noShowCount: isFinished(e.date, e.status)
        ? own.filter((s) => isNoShow(s.signup, s.attended)).length
        : 0,
      scripts: [...new Set(scriptRows.filter((g) => g.eventId === e.id).map((g) => g.scriptName))],
    };
  });
}

export function getEvent(id: number): EventRow | null {
  return db.select().from(events).where(eq(events.id, id)).get() ?? null;
}

export type SignupView = {
  id: number;
  playerId: number;
  name: string;
  signup: string;
  signupNote: string | null;
  attended: string;
  seq: number | null;
  source: string;
};

export function getSignups(eventId: number): SignupView[] {
  return db
    .select({
      id: eventSignups.id,
      playerId: eventSignups.playerId,
      name: players.name,
      signup: eventSignups.signup,
      signupNote: eventSignups.signupNote,
      attended: eventSignups.attended,
      seq: eventSignups.seq,
      source: eventSignups.source,
    })
    .from(eventSignups)
    .innerJoin(players, eq(players.id, eventSignups.playerId))
    .where(eq(eventSignups.eventId, eventId))
    .orderBy(sql`coalesce(${eventSignups.seq}, 999)`, eventSignups.id)
    .all();
}

export type GameView = Game & {
  storytellers: { id: number; name: string }[];
  lineup: { id: number; playerId: number; name: string; seat: number | null; roleName: string; note: string | null }[];
  recorderName: string | null;
};

export function getGames(eventId: number): GameView[] {
  const rows = db
    .select()
    .from(games)
    .where(eq(games.eventId, eventId))
    .orderBy(games.session, games.seq, games.id)
    .all();
  return rows.map((g) => expandGame(g));
}

export function expandGame(g: Game): GameView {
  const storytellers = db
    .select({ id: players.id, name: players.name })
    .from(gameStorytellers)
    .innerJoin(players, eq(players.id, gameStorytellers.playerId))
    .where(eq(gameStorytellers.gameId, g.id))
    .all();
  const lineup = db
    .select({
      id: gamePlayers.id,
      playerId: gamePlayers.playerId,
      name: players.name,
      seat: gamePlayers.seat,
      roleName: gamePlayers.roleName,
      note: gamePlayers.note,
    })
    .from(gamePlayers)
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .where(eq(gamePlayers.gameId, g.id))
    .orderBy(sql`coalesce(${gamePlayers.seat}, 999)`, gamePlayers.id)
    .all();
  const recorder = g.recordedBy
    ? db.select({ name: players.name }).from(players).where(eq(players.id, g.recordedBy)).get()
    : null;
  return { ...g, storytellers, lineup, recorderName: recorder?.name ?? null };
}

export function getGame(id: number): GameView | null {
  const g = db.select().from(games).where(eq(games.id, id)).get();
  return g ? expandGame(g) : null;
}

export type EventFile = typeof eventFiles.$inferSelect;

export function getEventFiles(eventId: number): EventFile[] {
  return db
    .select()
    .from(eventFiles)
    .where(eq(eventFiles.eventId, eventId))
    .orderBy(eventFiles.kind, eventFiles.id)
    .all();
}

export function recentScripts(limit = 20): string[] {
  const rows = db
    .select({ scriptName: games.scriptName })
    .from(games)
    .orderBy(desc(games.id))
    .limit(200)
    .all();
  return [...new Set(rows.map((r) => r.scriptName).filter(Boolean))].slice(0, limit);
}

export type UnlockView = {
  claimId: number;
  achievementId: number;
  achievementName: string;
  icon: string;
  stars: number;
  role: string;
  playerId: number;
  playerName: string;
  unlockedAt: string;
  unlockedAtText: string | null;
  eventId: number | null;
  note: string | null;
  status: string;
};

function claimQuery() {
  return db
    .select({
      claimId: achievementClaims.id,
      achievementId: achievements.id,
      achievementName: achievements.name,
      icon: achievements.icon,
      stars: achievements.stars,
      role: achievements.role,
      hidden: achievements.hidden,
      playerId: players.id,
      playerName: players.name,
      unlockedAt: achievementClaims.unlockedAt,
      unlockedAtText: achievementClaims.unlockedAtText,
      eventId: achievementClaims.eventId,
      note: achievementClaims.note,
      status: achievementClaims.status,
    })
    .from(achievementClaims)
    .innerJoin(achievements, eq(achievements.id, achievementClaims.achievementId))
    .innerJoin(players, eq(players.id, achievementClaims.playerId));
}

export function recentUnlocks(limit = 8): UnlockView[] {
  return claimQuery()
    .where(eq(achievementClaims.status, "confirmed"))
    .orderBy(desc(achievementClaims.reviewedAt), desc(achievementClaims.id))
    .limit(limit)
    .all();
}

export function pendingClaims(): UnlockView[] {
  return claimQuery()
    .where(eq(achievementClaims.status, "pending"))
    .orderBy(desc(achievementClaims.id))
    .all();
}

export function claimsForEvent(eventId: number): UnlockView[] {
  return claimQuery()
    .where(and(eq(achievementClaims.eventId, eventId), eq(achievementClaims.status, "confirmed")))
    .orderBy(desc(achievementClaims.id))
    .all();
}

export function claimsForAchievement(achievementId: number): UnlockView[] {
  return claimQuery()
    .where(eq(achievementClaims.achievementId, achievementId))
    .orderBy(desc(achievementClaims.id))
    .all();
}

export function listAchievements(includeInactive = false): Achievement[] {
  const rows = db.select().from(achievements).orderBy(achievements.sortOrder, achievements.id).all();
  return includeInactive ? rows : rows.filter((a) => a.active === 1);
}

export function getAchievement(id: number): Achievement | null {
  return db.select().from(achievements).where(eq(achievements.id, id)).get() ?? null;
}

/** 成就管理页用的角色候选（datalist） */
export function achievementRoles(): string[] {
  const rows = db
    .select({ role: achievements.role })
    .from(achievements)
    .orderBy(achievements.sortOrder, achievements.id)
    .all();
  return [...new Set(rows.map((r) => r.role).filter(Boolean))];
}

export type AchievementGroup = { role: string; items: Achievement[] };

/**
 * 按角色分组，组的顺序 = 角色在 sort_order 里首次出现的顺序，
 * 「通用」永远排第一。
 */
export function groupByRole(list: Achievement[]): AchievementGroup[] {
  const groups: AchievementGroup[] = [];
  const byRole = new Map<string, AchievementGroup>();
  for (const a of list) {
    let g = byRole.get(a.role);
    if (!g) {
      g = { role: a.role, items: [] };
      byRole.set(a.role, g);
      groups.push(g);
    }
    g.items.push(a);
  }
  return groups.sort((a, b) => (a.role === "通用" ? -1 : b.role === "通用" ? 1 : 0));
}

/** 剧本专属成就按剧本名分块，剧本名按首次出现的顺序 */
export function groupByScript(list: Achievement[]): { scriptName: string; items: Achievement[] }[] {
  const out: { scriptName: string; items: Achievement[] }[] = [];
  const seen = new Map<string, { scriptName: string; items: Achievement[] }>();
  for (const a of list) {
    const key = a.scriptName ?? "";
    let g = seen.get(key);
    if (!g) {
      g = { scriptName: key, items: [] };
      seen.set(key, g);
      out.push(g);
    }
    g.items.push(a);
  }
  return out;
}

/** 成就墙用：每个成就的已确认解锁者 */
export function confirmedUnlockMap(): Map<number, { playerId: number; name: string }[]> {
  const rows = db
    .select({
      achievementId: achievementClaims.achievementId,
      playerId: players.id,
      name: players.name,
    })
    .from(achievementClaims)
    .innerJoin(players, eq(players.id, achievementClaims.playerId))
    .where(eq(achievementClaims.status, "confirmed"))
    .all();
  const map = new Map<number, { playerId: number; name: string }[]>();
  for (const r of rows) {
    const list = map.get(r.achievementId) ?? [];
    list.push({ playerId: r.playerId, name: r.name });
    map.set(r.achievementId, list);
  }
  return map;
}

export type PlayerProfile = {
  player: typeof players.$inferSelect;
  attendance: (SignupView & { date: string; title: string; eventId: number; eventStatus: string })[];
  played: {
    gameId: number;
    date: string;
    eventId: number;
    scriptName: string;
    result: string;
    roleName: string;
    asStoryteller: boolean;
  }[];
  unlocks: UnlockView[];
  points: number;
};

export function getPlayerProfile(id: number): PlayerProfile | null {
  const player = db.select().from(players).where(eq(players.id, id)).get();
  if (!player) return null;

  const attendance = db
    .select({
      id: eventSignups.id,
      playerId: eventSignups.playerId,
      name: players.name,
      signup: eventSignups.signup,
      signupNote: eventSignups.signupNote,
      attended: eventSignups.attended,
      seq: eventSignups.seq,
      source: eventSignups.source,
      date: events.date,
      title: events.title,
      eventId: events.id,
      eventStatus: events.status,
    })
    .from(eventSignups)
    .innerJoin(events, eq(events.id, eventSignups.eventId))
    .innerJoin(players, eq(players.id, eventSignups.playerId))
    .where(eq(eventSignups.playerId, id))
    .orderBy(desc(events.date))
    .all();

  const asPlayer = db
    .select({
      gameId: games.id,
      date: events.date,
      eventId: events.id,
      scriptName: games.scriptName,
      result: games.result,
      roleName: gamePlayers.roleName,
    })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .innerJoin(events, eq(events.id, games.eventId))
    .where(eq(gamePlayers.playerId, id))
    .orderBy(desc(events.date), desc(games.id))
    .all();

  const asSt = db
    .select({
      gameId: games.id,
      date: events.date,
      eventId: events.id,
      scriptName: games.scriptName,
      result: games.result,
    })
    .from(gameStorytellers)
    .innerJoin(games, eq(games.id, gameStorytellers.gameId))
    .innerJoin(events, eq(events.id, games.eventId))
    .where(eq(gameStorytellers.playerId, id))
    .orderBy(desc(events.date), desc(games.id))
    .all();

  const played = [
    ...asPlayer.map((g) => ({ ...g, asStoryteller: false })),
    ...asSt.map((g) => ({ ...g, roleName: "说书人", asStoryteller: true })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.gameId - a.gameId));

  const unlocks = claimQuery()
    .where(and(eq(achievementClaims.playerId, id), eq(achievementClaims.status, "confirmed")))
    .orderBy(desc(achievementClaims.id))
    .all();

  // 积分 = 星数之和
  const points = unlocks.reduce((sum, u) => sum + starPoints(u.stars), 0);

  return { player, attendance, played, unlocks, points };
}

export function nextEvent(): EventRow | null {
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  return (
    db
      .select()
      .from(events)
      .where(and(sql`${events.date} >= ${ymd}`, sql`${events.status} != 'cancelled'`))
      .orderBy(events.date)
      .get() ?? null
  );
}

export function latestEvent(): EventRow | null {
  return db.select().from(events).orderBy(desc(events.date), desc(events.id)).get() ?? null;
}

export function listPlayers(): (typeof players.$inferSelect)[] {
  return db.select().from(players).orderBy(players.name).all();
}
