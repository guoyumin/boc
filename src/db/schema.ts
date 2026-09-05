import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;
const timestamps = {
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
};

export const SESSIONS = ["none", "afternoon", "evening", "full"] as const;
export type Session = (typeof SESSIONS)[number];
export const GAME_SESSIONS = ["afternoon", "evening"] as const;
export type GameSession = (typeof GAME_SESSIONS)[number];
export const POLL_SLOTS = ["sat_pm", "sat_eve", "sun_pm", "sun_eve"] as const;
export type PollSlot = (typeof POLL_SLOTS)[number];
/** 成就稀有度：1–5 星，星数即积分 */
export const STAR_LEVELS = [1, 2, 3, 4, 5] as const;
export type StarLevel = (typeof STAR_LEVELS)[number];

export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"), // owner | admin
  status: text("status").notNull().default("pending"), // pending | active | disabled
  note: text("note"),
  ...timestamps,
});

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: text("id").primaryKey(),
    adminId: integer("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("admin_sessions_expires").on(t.expiresAt)],
);

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  aliases: text("aliases").notNull().default("[]"), // JSON string[]
  archived: integer("archived").notNull().default(0),
  ...timestamps,
});

export const polls = sqliteTable("polls", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saturday: text("saturday").notNull(), // YYYY-MM-DD
  title: text("title").notNull(),
  slots: text("slots").notNull().default('["sat_pm","sat_eve","sun_pm","sun_eve"]'),
  note: text("note"),
  status: text("status").notNull().default("open"), // open | decided | closed
  eventId: integer("event_id"),
  ...timestamps,
});

export const pollResponses = sqliteTable(
  "poll_responses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pollId: integer("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    slots: text("slots").notNull().default("[]"),
    note: text("note"),
    ...timestamps,
  },
  (t) => [uniqueIndex("poll_responses_unique").on(t.pollId, t.playerId), index("poll_responses_poll").on(t.pollId)],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    title: text("title").notNull(),
    location: text("location"),
    startTime: text("start_time"),
    note: text("note"),
    hasAfternoon: integer("has_afternoon").notNull().default(1),
    hasEvening: integer("has_evening").notNull().default(1),
    status: text("status").notNull().default("planned"), // planned | done | cancelled
    ...timestamps,
  },
  (t) => [index("events_date").on(t.date)],
);

export const eventSignups = sqliteTable(
  "event_signups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    signup: text("signup").notNull().default("none"),
    signupNote: text("signup_note"),
    seq: integer("seq"),
    source: text("source").notNull().default("self"), // self | jielong | admin
    attended: text("attended").notNull().default("none"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("event_signups_unique").on(t.eventId, t.playerId),
    index("event_signups_event").on(t.eventId),
    index("event_signups_player").on(t.playerId),
  ],
);

export const games = sqliteTable(
  "games",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    session: text("session").notNull().default("afternoon"),
    seq: integer("seq").notNull().default(1),
    scriptName: text("script_name").notNull(),
    scriptFileId: integer("script_file_id"),
    result: text("result").notNull().default("unknown"), // good | evil | unknown
    note: text("note"),
    recordedBy: integer("recorded_by").references(() => players.id),
    ...timestamps,
  },
  (t) => [index("games_event").on(t.eventId)],
);

export const gameStorytellers = sqliteTable(
  "game_storytellers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("game_storytellers_unique").on(t.gameId, t.playerId)],
);

export const gamePlayers = sqliteTable(
  "game_players",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    seat: integer("seat"),
    roleId: text("role_id"),
    roleName: text("role_name").notNull().default(""),
    note: text("note"),
  },
  (t) => [
    uniqueIndex("game_players_unique").on(t.gameId, t.playerId),
    index("game_players_player").on(t.playerId),
  ],
);

export const eventFiles = sqliteTable(
  "event_files",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    gameId: integer("game_id"),
    kind: text("kind").notNull(), // board_image | script_json | game_log
    session: text("session"),
    originalName: text("original_name").notNull(),
    storagePath: text("storage_path").notNull(),
    thumbPath: text("thumb_path"),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    scriptName: text("script_name"),
    scriptAuthor: text("script_author"),
    roleCount: integer("role_count"),
    uploadedBy: integer("uploaded_by"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("event_files_event").on(t.eventId)],
);

export const achievements = sqliteTable("achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description").notNull(), // 达成条件
  icon: text("icon").notNull().default("🏆"),
  role: text("role").notNull().default("通用"), // 角色名，与 docs/achievements.tsv 一致
  stars: integer("stars").notNull().default(1), // 稀有度 1–5，星数即积分
  scriptName: text("script_name"), // 剧本专属成就；null = 全局成就
  hidden: integer("hidden").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(100),
  active: integer("active").notNull().default(1),
  ...timestamps,
});

export const achievementClaims = sqliteTable(
  "achievement_claims",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    achievementId: integer("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    eventId: integer("event_id"),
    gameId: integer("game_id"),
    note: text("note"),
    status: text("status").notNull().default("pending"), // pending | confirmed | rejected
    reviewedBy: integer("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    reviewNote: text("review_note"),
    unlockedAt: text("unlocked_at").notNull().default(now),
    /** 日期不精确时显示这个（如「已不可考」），有值时优先于 unlocked_at */
    unlockedAtText: text("unlocked_at_text"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("achievement_claims_unique").on(t.achievementId, t.playerId),
    index("achievement_claims_status").on(t.achievementId, t.status),
    index("achievement_claims_player").on(t.playerId),
  ],
);

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminId: integer("admin_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: integer("target_id"),
  detail: text("detail"),
  createdAt: text("created_at").notNull().default(now),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
