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
  scriptPollOptions,
  scriptPollVotes,
  scriptPolls,
  users,
  type PollSlot,
} from "@/db/schema";
import { POLL_SLOTS } from "@/db/schema";
import { isFinished, isNoShow, rarityPoints } from "./labels";

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

/** 最近一个进行中的时间投票（可以同时有好几个，首页只展示最近的那个）。 */
export function getOpenPoll(): Poll | null {
  return (
    db.select().from(polls).where(eq(polls.status, "open")).orderBy(desc(polls.saturday), desc(polls.id)).get() ??
    null
  );
}

/** 全部进行中的时间投票，最近的排前面。 */
export function openPolls(): Poll[] {
  return db.select().from(polls).where(eq(polls.status, "open")).orderBy(desc(polls.saturday), desc(polls.id)).all();
}

export type PollListRow = Poll & { responseCount: number };

/** 所有时间投票（含已关闭 / 已定下），带填写人数。 */
export function listPolls(limit = 60): PollListRow[] {
  const rows = db.select().from(polls).orderBy(desc(polls.saturday), desc(polls.id)).limit(limit).all();
  if (rows.length === 0) return [];
  const counts = db
    .select({ pollId: pollResponses.pollId, c: sql<number>`count(*)` })
    .from(pollResponses)
    .where(inArray(pollResponses.pollId, rows.map((p) => p.id)))
    .groupBy(pollResponses.pollId)
    .all();
  return rows.map((p) => ({ ...p, responseCount: counts.find((c) => c.pollId === p.id)?.c ?? 0 }));
}

export type PollResponseView = {
  id: number;
  playerId: number;
  name: string;
  slots: PollSlot[];
  note: string | null;
  /** 本人撤回过：记录留着显示，但不算票 */
  withdrawn: boolean;
};

export type PollView = {
  poll: Poll;
  slots: PollSlot[];
  responses: PollResponseView[];
  counts: Record<string, number>;
  best: number;
  event: EventRow | null;
  /** 有效填写的人数，不含撤回的 */
  filledCount: number;
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
      status: pollResponses.status,
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
    // 撤回的记录不留时段，页面上只显示一个「已取消」
    slots: r.status === "withdrawn" ? [] : POLL_SLOTS.filter((s) => parseJsonArray(r.slots).includes(s)),
    note: r.note,
    withdrawn: r.status === "withdrawn",
  }));

  const counts: Record<string, number> = {};
  for (const s of slots) counts[s] = responses.filter((r) => r.slots.includes(s)).length;
  const filledCount = responses.filter((r) => !r.withdrawn).length;
  const best = Math.max(0, ...slots.map((s) => counts[s] ?? 0));
  const event = poll.eventId
    ? (db.select().from(events).where(eq(events.id, poll.eventId)).get() ?? null)
    : null;
  return { poll, slots, responses, counts, best, event, filledCount };
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
    .select({
      eventId: eventSignups.eventId,
      signup: eventSignups.signup,
      attended: eventSignups.attended,
      status: eventSignups.status,
      noShowWaived: eventSignups.noShowWaived,
    })
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
        ? own.filter((s) => isNoShow(s)).length
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
  status: string;
  cancelledAt: string | null;
  noShowWaived: number;
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
      status: eventSignups.status,
      cancelledAt: eventSignups.cancelledAt,
      noShowWaived: eventSignups.noShowWaived,
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
  rarity: string;
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
      rarity: achievements.rarity,
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

export type Unlocker = {
  playerId: number;
  name: string;
  unlockedAt: string;
  /** 日期不精确时用这个（如「已不可考」），有值时优先显示 */
  unlockedAtText: string | null;
};

/**
 * 成就墙用：每个成就的已确认解锁者，**按解锁时间升序**，
 * 所以 list[0] 就是首解者。日期不精确（unlockedAtText 有值）的排在最后，
 * 不让「已不可考」抢走首解的位置。
 */
export function confirmedUnlockMap(): Map<number, Unlocker[]> {
  const rows = db
    .select({
      achievementId: achievementClaims.achievementId,
      playerId: players.id,
      name: players.name,
      unlockedAt: achievementClaims.unlockedAt,
      unlockedAtText: achievementClaims.unlockedAtText,
    })
    .from(achievementClaims)
    .innerJoin(players, eq(players.id, achievementClaims.playerId))
    .where(eq(achievementClaims.status, "confirmed"))
    .all();
  const map = new Map<number, Unlocker[]>();
  for (const r of rows) {
    const list = map.get(r.achievementId) ?? [];
    list.push(r);
    map.set(r.achievementId, list);
  }
  for (const list of map.values()) list.sort(compareUnlock);
  return map;
}

/** 解锁记录的排序：日期确切的按时间升序在前，「已不可考」这类沉底 */
type UnlockTime = { unlockedAt: string; unlockedAtText: string | null };
export function compareUnlock(a: UnlockTime, b: UnlockTime) {
  const av = a.unlockedAtText ? 1 : 0;
  const bv = b.unlockedAtText ? 1 : 0;
  if (av !== bv) return av - bv;
  return a.unlockedAt.localeCompare(b.unlockedAt);
}

/** 全站最近解锁的成就 id，按时间倒序（成就墙的「最近解锁」排序用） */
export function latestUnlockAt(list: UnlockTime[]): string | null {
  const dated = list.filter((u) => !u.unlockedAtText);
  if (dated.length === 0) return null;
  return dated.reduce((m, u) => (u.unlockedAt > m ? u.unlockedAt : m), dated[0]!.unlockedAt);
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
      status: eventSignups.status,
      cancelledAt: eventSignups.cancelledAt,
      noShowWaived: eventSignups.noShowWaived,
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

  // 积分 = 各稀有度分数之和
  const points = unlocks.reduce((sum, u) => sum + rarityPoints(u.rarity), 0);

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
      // 只认还没办的：管理员一旦标成 done / cancelled，首页就不再拿它当下一场（issue #25）
      .where(and(sql`${events.date} >= ${ymd}`, sql`${events.status} = 'planned'`))
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

export type UserRow = typeof users.$inferSelect & { playerName: string | null };

/** 全部账号，owner 最前，然后是管理员，最后是普通玩家。 */
export function listUsers(): UserRow[] {
  const rows = db
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
      role: users.role,
      status: users.status,
      playerId: users.playerId,
      note: users.note,
      cardSkin: users.cardSkin,
      adminRequest: users.adminRequest,
      adminRequestedAt: users.adminRequestedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      playerName: players.name,
    })
    .from(users)
    .leftJoin(players, eq(players.id, users.playerId))
    .all();
  const rank = (r: string) => (r === "owner" ? 0 : r === "admin" ? 1 : 2);
  return rows.sort((a, b) => rank(a.role) - rank(b.role) || a.id - b.id);
}

/** 待审批的管理员申请 */
export function pendingAdminRequests(): UserRow[] {
  return listUsers().filter((u) => u.adminRequest && u.role === "member");
}

// ---------- 剧本投票（issue #4）----------

export type ScriptPollOptionView = {
  id: number;
  name: string;
  note: string | null;
  /** 配图，指向 event_files 的一行；用 /files/{id} 取原图、加 ?thumb=1 取缩略图 */
  imageFileId: number | null;
  /** 从已上传的剧本 JSON 生成的候选，带着原文件，方便下载 */
  scriptFileId: number | null;
  votes: number;
  voters: string[];
};

export type ScriptPollView = {
  poll: typeof scriptPolls.$inferSelect;
  options: ScriptPollOptionView[];
  /** 投过票的人数（不是票数，一个人可以投多个） */
  voterCount: number;
  best: number;
  event: EventRow | null;
};

export function getScriptPollView(id: number): ScriptPollView | null {
  const poll = db.select().from(scriptPolls).where(eq(scriptPolls.id, id)).get();
  if (!poll) return null;
  const options = db
    .select()
    .from(scriptPollOptions)
    .where(eq(scriptPollOptions.pollId, id))
    .orderBy(scriptPollOptions.sortOrder, scriptPollOptions.id)
    .all();
  const votes = db
    .select({ optionId: scriptPollVotes.optionId, playerId: players.id, name: players.name })
    .from(scriptPollVotes)
    .innerJoin(players, eq(players.id, scriptPollVotes.playerId))
    .where(eq(scriptPollVotes.pollId, id))
    .all();

  const view: ScriptPollOptionView[] = options.map((o) => {
    const mine = votes.filter((v) => v.optionId === o.id);
    return {
      id: o.id,
      name: o.name,
      note: o.note,
      imageFileId: o.imageFileId,
      scriptFileId: o.fileId,
      votes: mine.length,
      voters: mine.map((v) => v.name),
    };
  });
  const voterCount = new Set(votes.map((v) => v.playerId)).size;
  const best = Math.max(0, ...view.map((o) => o.votes));
  const event = poll.eventId
    ? (db.select().from(events).where(eq(events.id, poll.eventId)).get() ?? null)
    : null;
  return { poll, options: view, voterCount, best, event };
}

/** 某个活动下的剧本投票，活动页上挂个入口 */
export function scriptPollsForEvent(eventId: number) {
  return db
    .select()
    .from(scriptPolls)
    .where(eq(scriptPolls.eventId, eventId))
    .orderBy(desc(scriptPolls.id))
    .all();
}

/** 某人在这场投票里选了哪些，用来回显 */
export function scriptVotesOf(pollId: number, playerId: number): number[] {
  return db
    .select({ optionId: scriptPollVotes.optionId })
    .from(scriptPollVotes)
    .where(and(eq(scriptPollVotes.pollId, pollId), eq(scriptPollVotes.playerId, playerId)))
    .all()
    .map((r) => r.optionId);
}
