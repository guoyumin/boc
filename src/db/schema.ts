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
/** 成就稀有度四档 */
export const RARITIES = ["common", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];
/** 时间投票的记录状态：active 有效，withdrawn 本人撤回（记录保留，不计入票数） */
export const POLL_RESPONSE_STATUSES = ["active", "withdrawn"] as const;
export type PollResponseStatus = (typeof POLL_RESPONSE_STATUSES)[number];

/** 报名状态：active 有效，cancelled 本人取消（记录保留，算鸽） */
export const SIGNUP_STATUSES = ["active", "cancelled"] as const;
export type SignupStatus = (typeof SIGNUP_STATUSES)[number];
/** 账号角色 */
export const USER_ROLES = ["member", "admin", "owner"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * 账号。玩家可以完全不注册（昵称即身份）；注册只是为了绑定自己的玩家档案、
 * 看自己的报名与成就。管理权限是这张表上的 role。
 */
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("member"), // member | admin | owner
    status: text("status").notNull().default("active"), // active | pending | disabled
    /** 绑定的玩家档案；一个玩家最多被一个账号绑定 */
    playerId: integer("player_id").references(() => players.id, { onDelete: "set null" }),
    note: text("note"),
    /** 成就卡的卡面皮肤，见 src/lib/skins.ts */
    cardSkin: text("card_skin").notNull().default("gothic"),
    /** 申请管理员时填的理由；非空且 role=member 即为待审批 */
    adminRequest: text("admin_request"),
    adminRequestedAt: text("admin_requested_at"),
    ...timestamps,
  },
  // 还有一条 drizzle schema 表达不了的索引：drizzle/0007 里手写的
  // users_username_ci_unique = UNIQUE(lower(username))，保证用户名不区分大小写地唯一
  (t) => [uniqueIndex("users_player_unique").on(t.playerId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("sessions_expires").on(t.expiresAt)],
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
    /** active 有效；withdrawn 本人撤回（记录保留，页面上明确标出「已取消」） */
    status: text("status").notNull().default("active"),
    withdrawnAt: text("withdrawn_at"),
    ...timestamps,
  },
  (t) => [uniqueIndex("poll_responses_unique").on(t.pollId, t.playerId), index("poll_responses_poll").on(t.pollId)],
);

/** 板子投票的状态：open 投票中 / locked 锁定（不能再投）/ decided 已选定 */
export const SCRIPT_POLL_STATUSES = ["open", "locked", "decided"] as const;
export type ScriptPollStatus = (typeof SCRIPT_POLL_STATUSES)[number];

/**
 * 板子投票。英文里 BOTC 的 script 就是「板子」，所以表名用 script_polls；
 * 中文一律叫「板子投票」——「剧本」在这个群里指说书人每局从板子里挑的角色单，
 * 是另一回事，别混。
 *
 * 和 polls（时间投票）也是两回事：那个定日期，这个定玩哪个板子。
 */
export const scriptPolls = sqliteTable(
  "script_polls",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** 挂在哪场活动下；活动删了投票跟着删 */
    eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    note: text("note"),
    status: text("status").notNull().default("open"),
    /** 最终选定的候选项 */
    decidedOptionId: integer("decided_option_id"),
    ...timestamps,
  },
  (t) => [index("script_polls_event").on(t.eventId)],
);

/** 候选板子。可以从已上传的剧本 JSON 里选，也可以手填名字 */
export const scriptPollOptions = sqliteTable(
  "script_poll_options",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pollId: integer("poll_id").notNull().references(() => scriptPolls.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    note: text("note"),
    /** 关联到 event_files 里的剧本 JSON（从已上传的文件生成的候选才有） */
    fileId: integer("file_id"),
    /** 候选的配图，也在 event_files 里，kind = script_option */
    imageFileId: integer("image_file_id"),
    sortOrder: integer("sort_order").notNull().default(100),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("script_poll_options_poll").on(t.pollId)],
);

/** 一票一行：多选就是多行。改票 = 把这个人在这场投票里的行删掉重写 */
export const scriptPollVotes = sqliteTable(
  "script_poll_votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pollId: integer("poll_id").notNull().references(() => scriptPolls.id, { onDelete: "cascade" }),
    optionId: integer("option_id")
      .notNull()
      .references(() => scriptPollOptions.id, { onDelete: "cascade" }),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [
    uniqueIndex("script_poll_votes_unique").on(t.optionId, t.playerId),
    index("script_poll_votes_poll").on(t.pollId),
  ],
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
    /** active 有效；cancelled 本人报名后又取消（记录保留，默认算鸽） */
    status: text("status").notNull().default("active"),
    cancelledAt: text("cancelled_at"),
    /** 管理员免鸽：1 = 这次不算鸽子 */
    noShowWaived: integer("no_show_waived").notNull().default(0),
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
  rarity: text("rarity").notNull().default("common"), // common | rare | epic | legendary
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
  userId: integer("user_id"),
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
