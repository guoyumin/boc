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

/** 中文角色名 → 官方 id（= public/roles/<id>.webp 的文件名） */
export const ROLE_SLUG: Record<string, string> = {
  [GENERIC_ROLE]: GENERIC_SLUG,
  ...Object.fromEntries(OFFICIAL_ROLES.map((r) => [r.zh, r.id])),
};

/** 没配图标的角色回落到门环纹样，别让页面开天窗 */
export function roleSlug(role: string): string {
  return ROLE_SLUG[role] ?? GENERIC_SLUG;
}

/** 是不是官方角色名。手填的、写错的、以及「通用」都返回 false。 */
export function isOfficialRole(role: string): boolean {
  return Object.hasOwn(ROLE_SLUG, role) && role !== GENERIC_ROLE;
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

export const ROLE_TEAM: Record<string, "good" | "evil"> = Object.fromEntries(
  OFFICIAL_ROLES.flatMap((r) => {
    const side = TEAM_SIDE[r.team];
    return side ? [[r.zh, side] as const] : [];
  }),
);

export function roleTeam(role: string): "good" | "evil" | null {
  return ROLE_TEAM[role] ?? null;
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
