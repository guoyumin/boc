/**
 * 中文角色名 → 官方角色 id。图标是官方美术，放在 public/roles/<id>.webp
 * （从官方工具的图标集取，trim 掉留白后统一 128px）。
 *
 * 对应关系按成就描述逐条核对过，几个容易搞混的：
 * 贵族 = Noble（首夜得知三人中有一个邪恶）、半兽人 = Lycanthrope（支配每晚死亡）、
 * 痢蛭 = Lleech（有宿主）、精神病患者 = Psychopath（白天公开杀人）。
 */
export const ROLE_SLUG: Record<string, string> = {
  通用: "imp", // 没有具体角色的成就用恶魔头像
  厨师: "chef",
  贵族: "noble",
  共情者: "empath",
  舞蛇人: "snakecharmer",
  数学家: "mathematician",
  僧侣: "monk",
  赌徒: "gambler",
  半兽人: "lycanthrope",
  女裁缝: "seamstress",
  哲学家: "philosopher",
  炼金术士: "alchemist",
  农夫: "farmer",
  管家: "butler",
  解谜大师: "puzzlemaster",
  疯子: "lunatic",
  食人魔: "ogre",
  麻脸巫婆: "pithag",
  魔鬼代言人: "devilsadvocate",
  鹰身女妖: "harpy",
  哥布林: "goblin",
  痢蛭: "lleech",
  精神病患者: "psychopath",
};

/** 没配图标的角色回落到恶魔头像，别让页面开天窗 */
export function roleSlug(role: string): string {
  return ROLE_SLUG[role] ?? "imp";
}

export function roleIconSrc(role: string): string {
  return `/roles/${roleSlug(role)}.webp`;
}
