import type { PollSlot, Session } from "@/db/schema";

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

/** 星数收敛到 1–5 */
export function clampStars(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** 积分 = 星数 */
export function starPoints(stars: number): number {
  return clampStars(stars);
}

/** 每个角色一个固定 emoji；名单外的角色回退到 🏆 */
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
  planned: "bg-brand-light text-brand border-brand/20",
  done: "bg-stone-100 text-stone-600 border-stone-200",
  cancelled: "bg-stone-100 text-stone-400 border-stone-200 line-through",
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
  good: "bg-sky-50 text-sky-700 border-sky-200",
  evil: "bg-red-50 text-red-700 border-red-200",
  unknown: "bg-stone-100 text-stone-500 border-stone-200",
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

/** 报名了但没来 */
export function isNoShow(signup: string, attended: string): boolean {
  return signup !== "none" && attended === "none";
}

/** 报了全天只到一场 */
export function isPartial(signup: string, attended: string): boolean {
  return signup === "full" && (attended === "afternoon" || attended === "evening");
}

/** 没报名却到场 */
export function isWalkIn(signup: string, attended: string): boolean {
  return signup === "none" && attended !== "none";
}
