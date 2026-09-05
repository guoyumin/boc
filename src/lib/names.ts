/** 纯函数：昵称规范化与校验，客户端与服务端共用（不依赖 node）。 */

export const NICKNAME_MAX = 20;

/** 去首尾空格（含全角空格）、把连续空格合并成一个。 */
export function cleanName(raw: string): string {
  return raw.replace(/[\s　]+/g, " ").trim();
}

/** 用于匹配的键：清理后再转小写。 */
export function normalizeName(raw: string): string {
  return cleanName(raw).toLowerCase();
}

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

export function checkNickname(raw: string | null | undefined): NameCheck {
  const name = cleanName(String(raw ?? ""));
  if (!name) return { ok: false, error: "请填写昵称" };
  if (name.length > NICKNAME_MAX) return { ok: false, error: `昵称最多 ${NICKNAME_MAX} 个字符` };
  return { ok: true, name };
}

/** 只有空白或标点的字符串（接龙里的占位行，如 "、"）。表情符号不算标点。 */
export function isPunctuationOnly(s: string): boolean {
  return s.replace(/[\s　\p{P}]/gu, "").length === 0;
}
