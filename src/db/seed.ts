import { sql } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import {
  achievementClaims,
  achievements,
  admins,
  eventSignups,
  events,
  gamePlayers,
  gameStorytellers,
  games,
  pollResponses,
  players,
  polls,
} from "./schema";
import { addDays, formatMd, nextSaturday, pollTitle } from "@/lib/dates";

type DB = BetterSQLite3Database<typeof schema>;

function rows(db: DB, table: typeof players | typeof admins): number {
  const r = db.select({ c: sql<number>`count(*)` }).from(table).get();
  return r?.c ?? 0;
}

/** admins 表为空时，用环境变量创建初始管理员（ADM-02）。 */
export function seedOwner(db: DB): void {
  if (rows(db, admins) > 0) return;
  const username = (process.env.OWNER_USERNAME ?? "owner").trim() || "owner";
  const password = process.env.OWNER_PASSWORD ?? "change-me-now";
  db.insert(admins)
    .values({
      username,
      passwordHash: hashSync(password, 12),
      role: "owner",
      status: "active",
      note: "由环境变量创建",
    })
    .run();
  console.log(`[boc] 已创建初始管理员：${username}`);
}

const PLAYER_NAMES = [
  "清扬",
  "枫染柒萋",
  "Crystal🍀",
  "老王",
  "小林",
  "阿May",
  "夜观星象",
  "豆豆",
  "Kevin",
  "麦麦",
  "洛神",
  "阿飞",
  "苏打水",
  "钟楼怪人",
  "小圆",
  "Leo",
];

const ACHIEVEMENTS = [
  { name: "初次登场", description: "第一次来参加线下活动。", icon: "🎬", category: "attendance", rarity: "common", hidden: 0, sortOrder: 10 },
  { name: "全勤月", description: "一个月之内四次活动一次没落。", icon: "📅", category: "attendance", rarity: "rare", hidden: 0, sortOrder: 20 },
  { name: "第一次说书", description: "第一次给大家当说书人，无论讲得怎么样。", icon: "📖", category: "storyteller", rarity: "common", hidden: 0, sortOrder: 30 },
  { name: "铁人说书", description: "同一天连说三局，嗓子还在。", icon: "🎙️", category: "storyteller", rarity: "epic", hidden: 0, sortOrder: 40 },
  { name: "神算子", description: "作为占卜师，全场没有验错过一次。", icon: "🔮", category: "good", rarity: "rare", hidden: 0, sortOrder: 50 },
  { name: "圣徒之死", description: "作为圣徒被好人投票处决，直接送走全村。", icon: "😇", category: "good", rarity: "common", hidden: 0, sortOrder: 60 },
  { name: "完美下毒", description: "作为下毒者，每一晚都毒在了关键人身上。", icon: "☠️", category: "evil", rarity: "epic", hidden: 0, sortOrder: 70 },
  { name: "恶魔通关", description: "作为小恶魔活到最后一夜并取得胜利。", icon: "👹", category: "evil", rarity: "legendary", hidden: 0, sortOrder: 80 },
  { name: "团宠鸽子", description: "连续两次报名之后放了大家鸽子。", icon: "🕊️", category: "fun", rarity: "common", hidden: 0, sortOrder: 90 },
  { name: "午夜钟声", description: "在最后一票之前一秒改票，并且改对了。", icon: "🔔", category: "other", rarity: "legendary", hidden: 1, sortOrder: 100 },
];

const SCRIPTS = ["暗流涌动", "梦殒春宵", "教派再临"];

/** players 表为空时写入一整套演示数据（SEED_DEMO=1）。 */
export function seedDemo(db: DB): void {
  if (rows(db, players) > 0) return;

  const pid = new Map<string, number>();
  for (const name of PLAYER_NAMES) {
    const p = db.insert(players).values({ name }).returning({ id: players.id }).get();
    pid.set(name, p.id);
  }
  const P = (n: string) => pid.get(n)!;

  const achId = new Map<string, number>();
  for (const a of ACHIEVEMENTS) {
    const r = db.insert(achievements).values(a).returning({ id: achievements.id }).get();
    achId.set(a.name, r.id);
  }

  const upcomingSat = nextSaturday();
  const pastA = addDays(upcomingSat, -20); // 三周前的周日
  const pastB = addDays(upcomingSat, -14); // 两周前的周六
  const pollSat = addDays(upcomingSat, 7); // 下下周末的预填

  // ---- 两场已结束的活动 ----
  const evA = db
    .insert(events)
    .values({
      date: pastA,
      title: `${formatMd(pastA)} 血染`,
      location: "Zürich Oerlikon 桌游吧",
      startTime: "下午两点",
      hasAfternoon: 1,
      hasEvening: 1,
      status: "done",
      note: "第一次用新场地，人比想象中多。",
    })
    .returning({ id: events.id })
    .get();

  const evB = db
    .insert(events)
    .values({
      date: pastB,
      title: `${formatMd(pastB)} 血染`,
      location: "ETH Zentrum 活动室",
      startTime: "下午一点半",
      hasAfternoon: 1,
      hasEvening: 1,
      status: "done",
    })
    .returning({ id: events.id })
    .get();

  const evNext = db
    .insert(events)
    .values({
      date: upcomingSat,
      title: `${formatMd(upcomingSat)} 血染`,
      location: "Zürich Oerlikon 桌游吧",
      startTime: "下午两点",
      hasAfternoon: 1,
      hasEvening: 1,
      status: "planned",
      note: "新人友好场，会先讲一遍规则。",
    })
    .returning({ id: events.id })
    .get();

  type SignupSeed = [string, string, string, string | null];
  const signupsA: SignupSeed[] = [
    ["清扬", "full", "full", null],
    ["枫染柒萋", "afternoon", "afternoon", "下午场 感冒好了就来"],
    ["Crystal🍀", "full", "full", null],
    ["老王", "full", "evening", null],
    ["小林", "evening", "evening", "晚上补位"],
    ["阿May", "full", "full", null],
    ["夜观星象", "afternoon", "none", null],
    ["豆豆", "full", "full", null],
    ["Kevin", "evening", "evening", null],
    ["麦麦", "full", "full", null],
    ["洛神", "afternoon", "afternoon", null],
    ["阿飞", "full", "none", "临时加班"],
    ["苏打水", "none", "evening", null],
  ];
  const signupsB: SignupSeed[] = [
    ["清扬", "full", "full", null],
    ["钟楼怪人", "full", "full", null],
    ["Crystal🍀", "evening", "evening", null],
    ["老王", "full", "full", null],
    ["小圆", "afternoon", "afternoon", null],
    ["Leo", "full", "full", null],
    ["豆豆", "afternoon", "afternoon", null],
    ["Kevin", "full", "full", null],
    ["麦麦", "evening", "none", "临时有事"],
    ["洛神", "full", "full", null],
    ["阿飞", "full", "afternoon", null],
    ["苏打水", "full", "full", null],
    ["夜观星象", "evening", "evening", null],
  ];
  const signupsNext: SignupSeed[] = [
    ["清扬", "full", "none", null],
    ["Crystal🍀", "full", "none", null],
    ["老王", "afternoon", "none", null],
    ["豆豆", "full", "none", null],
    ["Kevin", "evening", "none", "晚上补位"],
    ["洛神", "full", "none", null],
    ["小圆", "afternoon", "none", null],
  ];

  const writeSignups = (eventId: number, list: SignupSeed[], source: string) => {
    list.forEach(([name, signup, attended, note], i) => {
      db.insert(eventSignups)
        .values({
          eventId,
          playerId: P(name),
          signup,
          attended,
          signupNote: note,
          seq: i + 1,
          source,
        })
        .run();
    });
  };
  writeSignups(evA.id, signupsA, "jielong");
  writeSignups(evB.id, signupsB, "jielong");
  writeSignups(evNext.id, signupsNext, "self");

  // ---- 游戏记录 ----
  type GameSeed = {
    eventId: number;
    session: string;
    seq: number;
    scriptName: string;
    result: string;
    note?: string;
    recordedBy: string;
    storytellers: string[];
    lineup: [string, string][];
  };
  const gameSeeds: GameSeed[] = [
    {
      eventId: evA.id,
      session: "afternoon",
      seq: 1,
      scriptName: SCRIPTS[0],
      result: "good",
      note: "第一局教学局，最后一天靠占卜师验出恶魔。",
      recordedBy: "清扬",
      storytellers: ["清扬"],
      lineup: [
        ["枫染柒萋", "占卜师"],
        ["Crystal🍀", "共情者"],
        ["老王", "小恶魔"],
        ["阿May", "下毒者"],
        ["豆豆", "洗衣妇"],
        ["洛神", "厨师"],
        ["麦麦", "圣徒"],
        ["夜观星象", "士兵"],
      ],
    },
    {
      eventId: evA.id,
      session: "evening",
      seq: 2,
      scriptName: SCRIPTS[1],
      result: "evil",
      note: "邪恶方第三夜直接收工。",
      recordedBy: "Crystal🍀",
      storytellers: ["Crystal🍀", "清扬"],
      lineup: [
        ["老王", "调查员"],
        ["小林", "管家"],
        ["阿May", "间谍"],
        ["Kevin", "小恶魔"],
        ["豆豆", "僧侣"],
        ["麦麦", "掘墓人"],
        ["苏打水", "红唇女郎"],
      ],
    },
    {
      eventId: evB.id,
      session: "afternoon",
      seq: 1,
      scriptName: SCRIPTS[0],
      result: "good",
      recordedBy: "钟楼怪人",
      storytellers: ["钟楼怪人"],
      lineup: [
        ["清扬", "图书管理员"],
        ["老王", "厨师"],
        ["小圆", "占卜师"],
        ["Leo", "小恶魔"],
        ["豆豆", "男爵"],
        ["洛神", "酒鬼"],
        ["阿飞", "市长"],
        ["苏打水", "士兵"],
      ],
    },
    {
      eventId: evB.id,
      session: "evening",
      seq: 2,
      scriptName: SCRIPTS[2],
      result: "evil",
      note: "教派再临第一次开，大家都懵。",
      recordedBy: "Leo",
      storytellers: ["Leo"],
      lineup: [
        ["清扬", "小恶魔"],
        ["钟楼怪人", "梦语者"],
        ["Crystal🍀", "小说家"],
        ["老王", "疯子"],
        ["Kevin", "间谍"],
        ["洛神", "巫婆"],
        ["苏打水", "食人魔"],
        ["夜观星象", "赌徒"],
      ],
    },
    {
      eventId: evB.id,
      session: "evening",
      seq: 3,
      scriptName: SCRIPTS[0],
      result: "unknown",
      note: "太晚了没打完，记个存档。",
      recordedBy: "Leo",
      storytellers: ["Leo", "钟楼怪人"],
      lineup: [
        ["清扬", "共情者"],
        ["Crystal🍀", "送葬者"],
        ["老王", "下毒者"],
        ["Kevin", "小恶魔"],
        ["洛神", "洗衣妇"],
        ["苏打水", "贞洁者"],
      ],
    },
  ];

  for (const g of gameSeeds) {
    const row = db
      .insert(games)
      .values({
        eventId: g.eventId,
        session: g.session,
        seq: g.seq,
        scriptName: g.scriptName,
        result: g.result,
        note: g.note ?? null,
        recordedBy: P(g.recordedBy),
      })
      .returning({ id: games.id })
      .get();
    for (const st of g.storytellers) {
      db.insert(gameStorytellers).values({ gameId: row.id, playerId: P(st) }).run();
    }
    g.lineup.forEach(([name, role], i) => {
      db.insert(gamePlayers)
        .values({ gameId: row.id, playerId: P(name), seat: i + 1, roleName: role })
        .run();
    });
  }

  // ---- 进行中的时间预填 ----
  const poll = db
    .insert(polls)
    .values({
      saturday: pollSat,
      title: pollTitle(pollSat),
      slots: JSON.stringify(["sat_pm", "sat_eve", "sun_pm", "sun_eve"]),
      note: "老规矩，能来的勾一下，周三定。",
      status: "open",
    })
    .returning({ id: polls.id })
    .get();

  const responses: [string, string[], string | null][] = [
    ["清扬", ["sat_pm", "sat_eve", "sun_pm", "sun_eve"], null],
    ["枫染柒萋", ["sun_pm", "sun_eve"], "周六要出城"],
    ["Crystal🍀", ["sat_eve", "sun_eve"], null],
    ["老王", ["sun_pm", "sun_eve"], null],
    ["小林", ["sat_pm"], "晚上只能到九点"],
    ["阿May", ["sun_pm", "sun_eve"], null],
    ["豆豆", ["sat_eve", "sun_pm", "sun_eve"], null],
    ["Kevin", ["sun_eve"], null],
    ["洛神", ["sat_pm", "sun_pm", "sun_eve"], null],
    ["Leo", ["sun_pm", "sun_eve"], "可以带板子"],
    ["苏打水", ["sat_eve", "sun_eve"], null],
  ];
  for (const [name, slots, note] of responses) {
    db.insert(pollResponses)
      .values({ pollId: poll.id, playerId: P(name), slots: JSON.stringify(slots), note })
      .run();
  }

  // ---- 成就宣告 ----
  const claim = (
    ach: string,
    player: string,
    status: string,
    eventId: number | null,
    note: string | null,
  ) => {
    db.insert(achievementClaims)
      .values({
        achievementId: achId.get(ach)!,
        playerId: P(player),
        eventId,
        note,
        status,
        reviewedBy: status === "pending" ? null : 1,
        reviewedAt: status === "pending" ? null : new Date().toISOString(),
      })
      .run();
  };
  claim("初次登场", "小圆", "confirmed", evB.id, "第一次来，规则还没背下来。");
  claim("初次登场", "苏打水", "confirmed", evA.id, null);
  claim("第一次说书", "钟楼怪人", "confirmed", evB.id, null);
  claim("恶魔通关", "Kevin", "confirmed", evA.id, "小恶魔活到最后一夜。");
  claim("神算子", "枫染柒萋", "confirmed", evA.id, "占卜师全场没验错。");
  claim("圣徒之死", "麦麦", "confirmed", evA.id, "被好人票走，全村送走。");
  claim("铁人说书", "Leo", "confirmed", evB.id, "一晚上说了两局半。");
  claim("完美下毒", "老王", "pending", evB.id, "下毒者，每晚都毒对了人。");
  claim("团宠鸽子", "阿飞", "pending", evB.id, "连续两次没来，自首。");
  claim("全勤月", "清扬", "pending", null, "上个月四场全到。");

  console.log("[boc] 已写入演示数据");
}
