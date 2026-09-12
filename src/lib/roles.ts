/**
 * 角色：中文名 ↔ 官方英文 id ↔ 阵营 ↔ 图标。
 *
 * 数据来自 `src/lib/roles-data.ts`（由 `npm run gen:roles` 从 TPI 官方仓库生成，别手改）。
 * 以前这里是手工维护的 23 条映射，加角色容易漏；现在 177 个官方角色一次到位，
 * 阵营也跟着官方的 team 字段走，不用再一条条补。
 */
import { OFFICIAL_ROLES, type RoleTeam } from "./roles-data";

/** 不绑定角色的成就用这个：那个带角的门环纹样 */
export const GENERIC_ROLE = "通用";
const GENERIC_SLUG = "generic";

/**
 * 对比角色名时忽略连字符、间隔号和空格：官方译名「诺-达鲺」，群里一直写「诺达鲺」，
 * 少个横线就对不上图标（这个坑踩过）。只用来查表，不改显示。
 */
export function normalizeRoleName(role: string): string {
  return role.replace(/[\s\-‐‑–—·•・．.]/g, "");
}

/** 归一化后的名字 → 官方角色，查表都走这里 */
const BY_KEY = new Map(OFFICIAL_ROLES.map((r) => [normalizeRoleName(r.zh), r]));

function lookup(role: string) {
  return BY_KEY.get(normalizeRoleName(role));
}

/** 没配图标的角色回落到门环纹样，别让页面开天窗 */
export function roleSlug(role: string): string {
  if (role === GENERIC_ROLE) return GENERIC_SLUG;
  return lookup(role)?.id ?? GENERIC_SLUG;
}

/** 是不是官方角色名（连字符、空格的差异不算）。手填的、写错的、以及「通用」都返回 false。 */
export function isOfficialRole(role: string): boolean {
  return role !== GENERIC_ROLE && lookup(role) !== undefined;
}

/**
 * 收敛成官方写法：「诺达鲺」→「诺-达鲺」。认不出来的原样返回。
 * 保存 / 导入成就时都过一遍，库里只留一种写法，成就墙分组才不会裂成两块。
 */
export function canonicalRole(role: string): string {
  const r = role.trim();
  if (r === "" || r === GENERIC_ROLE) return GENERIC_ROLE;
  return lookup(r)?.zh ?? r;
}

/**
 * 这些图标是单色线稿，按遮罩渲染（颜色跟 currentColor 走），
 * 这样在成就卡里是金色、在导航里是正文色，不用为每种底色各存一张图。
 * 官方角色图标是彩色美术，不在此列。
 */
const MASK_SLUGS = new Set([GENERIC_SLUG]);

export function isMaskIcon(role: string): boolean {
  return MASK_SLUGS.has(roleSlug(role));
}

export function roleIconSrc(role: string): string {
  return `/roles/${roleSlug(role)}.webp`;
}

/**
 * 阵营。官方把角色分七类，善良 = 镇民 + 外来者，邪恶 = 爪牙 + 恶魔。
 * 群里习惯叫红方 / 蓝方，成就墙的筛选按这个分。
 * 旅行者阵营不固定、传奇和 loric 是说书人用的牌，都不算红蓝，返回 null；
 * 「通用」和手填的角色同理。
 */
const TEAM_SIDE: Partial<Record<RoleTeam, "good" | "evil">> = {
  townsfolk: "good",
  outsider: "good",
  minion: "evil",
  demon: "evil",
};

export function roleTeam(role: string): "good" | "evil" | null {
  const r = lookup(role);
  return r ? (TEAM_SIDE[r.team] ?? null) : null;
}

/** 下拉框里的分组，顺序就是官方角色表的排法 */
export const ROLE_GROUPS: { team: RoleTeam; label: string }[] = [
  { team: "townsfolk", label: "镇民" },
  { team: "outsider", label: "外来者" },
  { team: "minion", label: "爪牙" },
  { team: "demon", label: "恶魔" },
  { team: "traveller", label: "旅行者" },
  { team: "fabled", label: "传奇" },
  { team: "loric", label: "规则牌" },
];

export type RoleOptionGroup = { label: string; roles: string[] };

/**
 * 新建 / 编辑成就时的角色下拉选项：按阵营分组，组内按中文名排序。
 * 「通用」和手填不在这里，由表单单独处理。
 */
export function roleOptionGroups(): RoleOptionGroup[] {
  return ROLE_GROUPS.map((g) => ({
    label: g.label,
    roles: OFFICIAL_ROLES.filter((r) => r.team === g.team)
      .map((r) => r.zh)
      .sort((a, b) => a.localeCompare(b, "zh-Hans")),
  })).filter((g) => g.roles.length > 0);
}
