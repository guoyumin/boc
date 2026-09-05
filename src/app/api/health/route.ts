import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/** 给反向代理 / 监控用的健康检查：能开库并查得动就算健康。 */
export async function GET() {
  try {
    const r = db.get<{ c: number }>(sql`select count(*) as c from achievements`);
    return Response.json({ ok: true, achievements: r?.c ?? 0 }, { status: 200 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 503 });
  }
}
