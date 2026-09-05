import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const LIMIT = 30;

function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

/** 返回 true 表示放行。 */
export function hit(key: string, limit = LIMIT, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "local";
}

/** 公开写操作调用：每个 IP 每分钟 30 次，超了抛错。 */
export async function assertWriteRate(scope = "write", limit = LIMIT): Promise<void> {
  const ip = await clientIp();
  if (!hit(`${scope}:${ip}`, limit)) {
    throw new Error("操作太频繁，请过一分钟再试");
  }
}

/** 登录限流（ADM-06），比普通写操作更严格。 */
export async function assertLoginRate(username: string): Promise<void> {
  const ip = await clientIp();
  if (!hit(`login:${ip}`, 10, 5 * 60_000) || !hit(`login-user:${username}`, 10, 5 * 60_000)) {
    throw new Error("登录尝试过多，请五分钟后再试");
  }
}
