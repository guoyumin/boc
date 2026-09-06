/**
 * 成就卡的卡面皮肤。
 *
 * 卡片自己不写死颜色，全部走根节点上的 data-skin 变量（见 globals.css 的 .ach-* 那段）。
 * 加一套皮肤 = globals.css 里加一个 [data-skin="xxx"] 块 + 这里加一条，组件不用动。
 *
 * 登录用户的选择存在 users.card_skin，没登录（或没选过）就是 gothic；
 * URL 上的 ?skin= 永远优先，方便预览和分享。
 */
export const SKINS = ["gothic", "parchment", "ice"] as const;
export type Skin = (typeof SKINS)[number];
export const DEFAULT_SKIN: Skin = "gothic";

export const SKIN_LABEL: Record<Skin, string> = {
  gothic: "暗夜",
  parchment: "羊皮纸",
  ice: "霜蓝",
};

export function asSkin(v: string | null | undefined): Skin {
  return (SKINS as readonly string[]).includes(String(v)) ? (v as Skin) : DEFAULT_SKIN;
}
