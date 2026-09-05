/**
 * 剧本 JSON 的校验与解析（FILE-02）。纯函数，不碰文件系统，方便单测。
 *
 * 官方 / avalon2.top 的格式：顶层是数组，第一个元素可能是
 * `{ "id": "_meta", "name": ..., "author": ..., "bootlegger": [...], "firstNight": [...], ... }`，
 * 其余元素是角色：字符串 id（"chef"）或带 `id` 字段的对象。
 * `_meta` 里多出来的字段一律容忍。
 */

export type ScriptMeta = {
  scriptName: string | null;
  scriptAuthor: string | null;
  roleCount: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function optText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s === "" ? null : s.slice(0, 100);
}

/** 解析剧本 JSON；不合格时抛出中文错误。 */
export function parseScriptJson(raw: string): ScriptMeta {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("这个文件不是合法的 JSON，解析失败");
  }
  if (!Array.isArray(data)) {
    throw new Error("剧本 JSON 的顶层必须是一个数组（[...]），当前不是");
  }
  if (data.length === 0) {
    throw new Error("剧本 JSON 是个空数组，里面一个角色都没有");
  }

  let scriptName: string | null = null;
  let scriptAuthor: string | null = null;
  let roleCount = 0;

  data.forEach((el, i) => {
    if (i === 0 && isRecord(el) && el.id === "_meta") {
      scriptName = optText(el.name);
      scriptAuthor = optText(el.author);
      return; // _meta 不算角色
    }
    if (typeof el === "string") {
      if (el.trim() !== "") roleCount += 1;
      return;
    }
    if (isRecord(el) && typeof el.id === "string" && el.id.trim() !== "") {
      roleCount += 1;
      return;
    }
    throw new Error(`剧本 JSON 第 ${i + 1} 个元素既不是角色 id 字符串，也不是带 id 的对象`);
  });

  if (roleCount === 0) {
    throw new Error("剧本 JSON 里没有解析到任何角色");
  }
  return { scriptName, scriptAuthor, roleCount };
}
