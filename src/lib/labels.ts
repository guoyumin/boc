import { RARITIES, type PollSlot, type Rarity, type Session } from "@/db/schema";

export const SESSION_LABEL: Record<Session, string> = {
  none: "未到",
  afternoon: "下午",
  evening: "晚上",
  full: "全天",
};

/** 报名一栏里 none 的含义与出席不同 */
export const SIGNUP_LABEL: Record<Session, string> = {
  none: "未报名",
  afternoon: "下午",
  evening: "晚上",
  full: "全天",
};

export const SESSION_OPTIONS: { value: Session; label: string }[] = [
  { value: "afternoon", label: "下午" },
  { value: "evening", label: "晚上" },
  { value: "full", label: "全天" },
];

export const ATTEND_OPTIONS: { value: Session; label: string }[] = [
  { value: "none", label: "未到" },
  { value: "afternoon", label: "下午" },
  { value: "evening", label: "晚上" },
  { value: "full", label: "全天" },
];

export const SLOT_LABEL: Record<PollSlot, string> = {
  sat_pm: "周六下午",
  sat_eve: "周六晚上",
  sun_pm: "周日下午",
  sun_eve: "周日晚上",
};

export const SLOT_SHORT: Record<PollSlot, string> = {
  sat_pm: "六 下午",
  sat_eve: "六 晚上",
  sun_pm: "日 下午",
  sun_eve: "日 晚上",
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
};

/** 成就积分：普通 1 / 稀有 3 / 史诗 5 / 传说 10 */
export const RARITY_POINTS: Record<Rarity, number> = {
  common: 1,
  rare: 3,
  epic: 5,
  legendary: 10,
};

export const RARITY_CLASS: Record<Rarity, string> = {
  common: "bg-surface-2 text-muted border-line",
  rare: "bg-rare-soft text-rare border-rare/35",
  epic: "bg-epic-soft text-epic border-epic/35",
  legendary: "bg-legend-soft text-legend border-legend/40",
};

export const RARITY_OPTIONS: { value: Rarity; label: string }[] = RARITIES.map((r) => ({
  value: r,
  label: `${RARITY_LABEL[r]}（${RARITY_POINTS[r]} 分）`,
}));

/** 把任意输入收敛成合法稀有度 */
export function asRarity(v: string | null | undefined): Rarity {
  return (RARITIES as readonly string[]).includes(String(v)) ? (v as Rarity) : "common";
}

export function rarityPoints(v: string): number {
  return RARITY_POINTS[asRarity(v)];
}

export const ROLE_ICON: Record<string, string> = {
  通用: "🎭",
  厨师: "👨‍🍳",
  贵族: "👑",
  共情者: "💞",
  舞蛇人: "🐍",
  数学家: "🧮",
  僧侣: "🧘",
  赌徒: "🎲",
  半兽人: "🐺",
  女裁缝: "🧵",
  哲学家: "📜",
  炼金术士: "⚗️",
  农夫: "🌾",
  管家: "🎩",
  解谜大师: "🧩",
  疯子: "🤪",
  食人魔: "👹",
  麻脸巫婆: "🧙",
  魔鬼代言人: "😈",
  鹰身女妖: "🦅",
  哥布林: "👺",
  痢蛭: "🩸",
  精神病患者: "🔪",
};

export function roleIcon(role: string): string {
  return ROLE_ICON[role] ?? "🏆";
}

export const EVENT_STATUS_LABEL: Record<string, string> = {
  planned: "计划中",
  done: "已结束",
  cancelled: "已取消",
};

export const EVENT_STATUS_CLASS: Record<string, string> = {
  planned: "bg-brand-soft text-brand-bright border-brand-line",
  done: "bg-surface-2 text-muted border-line",
  cancelled: "bg-surface-2 text-faint border-line line-through",
};

export const POLL_STATUS_LABEL: Record<string, string> = {
  open: "进行中",
  decided: "已定下",
  closed: "已关闭",
};

export const CLAIM_STATUS_LABEL: Record<string, string> = {
  pending: "待确认",
  confirmed: "已确认",
  rejected: "已驳回",
};

export const GAME_RESULT_LABEL: Record<string, string> = {
  good: "善良胜",
  evil: "邪恶胜",
  unknown: "未记录",
};

export const GAME_RESULT_CLASS: Record<string, string> = {
  good: "bg-rare-soft text-rare border-rare/35",
  evil: "bg-danger-soft text-danger border-danger/30",
  unknown: "bg-surface-2 text-muted border-line",
};

export const ADMIN_STATUS_LABEL: Record<string, string> = {
  pending: "待审批",
  active: "已启用",
  disabled: "已停用",
};

export const ADMIN_ROLE_LABEL: Record<string, string> = {
  owner: "初始管理员",
  admin: "管理员",
};

/** 活动是不是已经过去了：只有过去的活动才谈得上"鸽" */
export function isFinished(date: string, status: string): boolean {
  if (status === "cancelled") return false;
  if (status === "done") return true;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return date < today;
}

/** 一行报名记录里跟"鸽不鸽"有关的字段 */
export type NoShowInput = {
  signup: string;
  attended: string;
  status?: string;
  noShowWaived?: number;
};

/** 本人取消的报名 */
export function isCancelled(r: NoShowInput): boolean {
  return r.status === "cancelled";
}

/** 管理员已免鸽 */
export function isWaived(r: NoShowInput): boolean {
  return (r.noShowWaived ?? 0) === 1;
}

/**
 * 报名了但没来 = 鸽。本人取消也算（记录保留），除非管理员点了"免鸽"。
 * 是否真的显示成鸽子还要看活动是不是已经过去了（isFinished）。
 */
export function isNoShow(r: NoShowInput): boolean {
  if (isWaived(r)) return false;
  return r.signup !== "none" && r.attended === "none";
}

/** 报了全天只到一场 */
export function isPartial(r: NoShowInput): boolean {
  return r.signup === "full" && (r.attended === "afternoon" || r.attended === "evening");
}

/** 没报名却到场 */
export function isWalkIn(r: NoShowInput): boolean {
  return r.signup === "none" && r.attended !== "none";
}

export const SIGNUP_SOURCE_LABEL: Record<string, string> = {
  self: "自助报名",
  jielong: "接龙导入",
  admin: "管理员添加",
};
