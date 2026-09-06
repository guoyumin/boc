import Link from "next/link";
import Flash from "@/components/Flash";
import RarityBadge from "@/components/RarityBadge";
import { getAdmin } from "@/lib/auth";
import { roleIcon } from "@/lib/labels";
import {
  confirmedUnlockMap,
  groupByRole,
  groupByScript,
  listAchievements,
  type Achievement,
} from "@/lib/queries";

/** 角色名 → 锚点 id。中文不能直接进 id，用下标编号。 */
function anchorId(i: number): string {
  return `role-${i}`;
}

function Row({
  a,
  owners,
}: {
  a: Achievement;
  owners: { playerId: number; name: string }[];
}) {
  const locked = owners.length === 0;
  const masked = a.hidden === 1 && locked;
  return (
    <li>
      <Link href={`/achievements/${a.id}`} className={`card block h-full ${locked ? "opacity-60" : ""}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">{masked ? "❓" : a.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-ink">{masked ? "???" : a.name}</span>
              <RarityBadge rarity={a.rarity} />
              {a.hidden === 1 && <span className="badge badge-plain">隐藏</span>}
            </div>
            <p className="muted mt-0.5">
              {masked ? "隐藏成就，解锁后才会显示。" : a.description}
            </p>
            <p className="mt-1 text-xs text-muted">
              {locked
                ? "还没有人解锁"
                : `已解锁：${owners.slice(0, 6).map((o) => o.name).join("、")}${
                    owners.length > 6 ? ` 等 ${owners.length} 人` : ""
                  }`}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const admin = await getAdmin();
  const list = listAchievements();
  const unlocks = confirmedUnlockMap();

  const global = groupByRole(list.filter((a) => !a.scriptName));
  const scripts = groupByScript(list.filter((a) => a.scriptName));
  const unlockedCount = list.filter((a) => (unlocks.get(a.id) ?? []).length > 0).length;

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />
      <div className="flex items-center justify-between gap-2">
        <h1 className="page-title">成就墙</h1>
        {admin && (
          <Link href="/admin/achievements" className="btn btn-sm btn-primary">
            管理成就 →
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <div className="card">
          <p className="muted">还没有成就。</p>
        </div>
      ) : (
        <>
          <p className="muted">
            共 {list.length} 个成就，已解锁 {unlockedCount} 个。积分：普通 1 / 稀有 3 / 史诗 5 / 传说 10。
          </p>

          {/* 角色快捷跳转：横向滚动的锚点条，手机上一屏能扫完 */}
          <nav className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">
            <div className="table-wrap flex gap-1.5 pb-0.5">
              {global.map((g, i) => (
                <a key={g.role} href={`#${anchorId(i)}`} className="btn btn-sm shrink-0">
                  {roleIcon(g.role)} {g.role}
                </a>
              ))}
            </div>
          </nav>

          {global.map((g, i) => {
            const done = g.items.filter((a) => (unlocks.get(a.id) ?? []).length > 0).length;
            return (
              <section key={g.role} id={anchorId(i)} className="scroll-mt-16">
                <h2 className="section-title">
                  {roleIcon(g.role)} {g.role} · 已解锁 {done}/{g.items.length}
                </h2>
                <ul className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
                  {g.items.map((a) => (
                    <Row key={a.id} a={a} owners={unlocks.get(a.id) ?? []} />
                  ))}
                </ul>
              </section>
            );
          })}

          {scripts.map((g) => {
            const done = g.items.filter((a) => (unlocks.get(a.id) ?? []).length > 0).length;
            return (
              <section key={g.scriptName}>
                <h2 className="section-title">
                  📕 剧本专属 · {g.scriptName} · 已解锁 {done}/{g.items.length}
                </h2>
                <ul className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
                  {g.items.map((a) => (
                    <Row key={a.id} a={a} owners={unlocks.get(a.id) ?? []} />
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
