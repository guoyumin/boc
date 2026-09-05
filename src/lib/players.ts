import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { checkNickname, cleanName, normalizeName } from "./names";

export { normalizeName, cleanName, checkNickname };

export type Player = typeof players.$inferSelect;

export function parseAliases(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function matches(p: Player, key: string): boolean {
  if (normalizeName(p.name) === key) return true;
  return parseAliases(p.aliases).some((a) => normalizeName(a) === key);
}

/** 按昵称（忽略大小写与多余空格，同时匹配别名）查找玩家，不创建。 */
export function findPlayer(raw: string): Player | null {
  const key = normalizeName(raw);
  if (!key) return null;
  const all = db.select().from(players).all();
  return all.find((p) => matches(p, key)) ?? null;
}

/** 昵称 → 玩家；不存在则创建（ROS-02）。昵称非法时抛错。 */
export function findOrCreatePlayer(raw: string): Player {
  const check = checkNickname(raw);
  if (!check.ok) throw new Error(check.error);
  const existing = findPlayer(check.name);
  if (existing) return existing;
  try {
    const created = db.insert(players).values({ name: check.name }).returning().get();
    return created;
  } catch {
    // 并发或大小写不同的唯一键冲突：回查
    const again = findPlayer(check.name);
    if (again) return again;
    throw new Error("创建玩家失败");
  }
}

/** 一组昵称批量解析成玩家（保持顺序，重复的按第一次出现算）。 */
export function findOrCreatePlayers(names: string[]): Player[] {
  const out: Player[] = [];
  const seen = new Set<number>();
  for (const n of names) {
    const name = cleanName(n);
    if (!name) continue;
    const p = findOrCreatePlayer(name);
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/** 把逗号 / 顿号 / 换行 / 分号分隔的昵称串拆开。 */
export function splitNames(raw: string): string[] {
  return String(raw ?? "")
    .split(/[,，、;；\n\r]+/)
    .map((s) => cleanName(s))
    .filter(Boolean);
}

export function getPlayer(id: number): Player | null {
  return db.select().from(players).where(eq(players.id, id)).get() ?? null;
}
