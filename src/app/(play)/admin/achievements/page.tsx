import Link from "next/link";
import { redirect } from "next/navigation";
import AchievementEditor from "@/components/AchievementEditor";
import AchievementFields from "@/components/AchievementFields";
import Flash from "@/components/Flash";
import NavIcon from "@/components/NavIcon";
import RoleIcon from "@/components/RoleIcon";
import { RARITIES, type Rarity } from "@/db/schema";
import { roleTeam } from "@/lib/roles";
import RarityBadge from "@/components/RarityBadge";
import { grantAchievement, saveAchievement } from "@/actions/achievements";
import { getAdmin } from "@/lib/auth";
import { RARITY_LABEL, asRarity } from "@/lib/labels";
import { confirmedUnlockMap, groupByRole, groupByScript, listAchievements } from "@/lib/queries";

type Ach = ReturnType<typeof listAchievements>[number];

function Item({ a, owners }: { a: Ach; owners: number }) {
  return (
    <li className="card">
      <div className="flex items-start gap-2">
        <RoleIcon role={a.role} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            {a.name}
            {a.active === 0 && <span className="badge badge-plain ml-2">已下架</span>}
            {a.hidden === 1 && <span className="badge badge-plain ml-1">隐藏</span>}
          </p>
          <p className="muted flex items-center gap-1.5">
            <RarityBadge rarity={a.rarity} />
            <span>· {owners} 人解锁</span>
          </p>
          <p className="muted mt-0.5 line-clamp-2">{a.description}</p>
        </div>
      </div>

      <AchievementEditor
        id={a.id}
        a={{
          name: a.name,
          description: a.description,
          role: a.role,
          rarity: a.rarity,
          scriptName: a.scriptName,
          hidden: a.hidden,
          sortOrder: a.sortOrder,
          active: a.active,
        }}
      />

      <form action={grantAchievement} className="mt-2 flex gap-2">
        <input type="hidden" name="achievementId" value={a.id} />
        <input type="hidden" name="back" value="/admin/achievements" />
        <input
          className="input flex-1 py-1 text-sm"
          name="nickname"
          placeholder="直接授予给（昵称）"
          maxLength={20}
          required
        />
        <button type="submit" className="btn btn-sm btn-primary">
          授予
        </button>
      </form>
    </li>
  );
}

export default async function AdminAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string; q?: string; team?: string; rarity?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/admin/login");
  const list = listAchievements(true);
  const unlocks = confirmedUnlockMap();

  // 搜索 + 筛选（issue #41）：成就越来越多，一屏一屏翻太慢
  const q = (sp.q ?? "").trim().toLowerCase();
  const team = sp.team === "good" || sp.team === "evil" ? sp.team : "all";
  const rarity = RARITIES.includes(sp.rarity as Rarity) ? (sp.rarity as Rarity) : "all";
  const shown = list.filter((a) => {
    if (q && !`${a.name} ${a.description} ${a.role} ${a.scriptName ?? ""}`.toLowerCase().includes(q)) {
      return false;
    }
    if (team !== "all" && roleTeam(a.role) !== team) return false;
    if (rarity !== "all" && asRarity(a.rarity) !== rarity) return false;
    return true;
  });

  const global = groupByRole(shown.filter((a) => !a.scriptName));
  const scripts = groupByScript(shown.filter((a) => a.scriptName));
  const count = (id: number) => (unlocks.get(id) ?? []).length;
  const chip = (next: Record<string, string>) => {
    const params = new URLSearchParams({ ...(q ? { q } : {}), team, rarity, ...next });
    return `?${params}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">成就管理</h1>
        <div className="flex gap-2">
          <Link href="/admin/achievements/import" className="btn btn-sm btn-primary">
            批量新增
          </Link>
          <Link href="/achievements" className="btn btn-sm">
            看成就墙
          </Link>
        </div>
      </div>
      <Flash err={sp.err} ok={sp.ok} />

      <p className="muted">
        {shown.length === list.length
          ? `共 ${list.length} 个成就。`
          : `筛出 ${shown.length} 个（全部 ${list.length} 个）。`}
        改动只写进数据库；<code>docs/achievements.tsv</code> 只是空库首次导入的种子，
        在这里改动不会写回那份表。
      </p>

      <div className="flex flex-wrap gap-2">
        <a href="/admin/achievements/export" className="btn btn-sm">
          导出 CSV（全量）
        </a>
      </div>

      {/* 搜索走 GET，刷新和分享链接都能保持筛选状态 */}
      <div className="card space-y-3">
        <form method="get" className="flex gap-2">
          <input type="hidden" name="team" value={team} />
          <input type="hidden" name="rarity" value={rarity} />
          <input
            className="input"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="搜成就名、达成条件、角色、剧本"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            搜索
          </button>
          {(q || team !== "all" || rarity !== "all") && (
            <Link href="/admin/achievements" className="btn shrink-0">
              清空
            </Link>
          )}
        </form>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-faint">阵营</span>
            {[
              { key: "all", label: "全部" },
              { key: "good", label: "蓝方" },
              { key: "evil", label: "红方" },
            ].map((o) => (
              <Link
                key={o.key}
                href={chip({ team: o.key })}
                className={`btn btn-sm ${team === o.key ? "btn-primary" : ""}`}
              >
                {o.label}
              </Link>
            ))}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-faint">稀有度</span>
            <Link
              href={chip({ rarity: "all" })}
              className={`btn btn-sm ${rarity === "all" ? "btn-primary" : ""}`}
            >
              全部
            </Link>
            {RARITIES.map((r) => (
              <Link
                key={r}
                href={chip({ rarity: r })}
                className={`btn btn-sm ${rarity === r ? "btn-primary" : ""}`}
              >
                {RARITY_LABEL[r]}
              </Link>
            ))}
          </span>
        </div>
      </div>

      {shown.length === 0 && (
        <div className="card">
          <p className="muted">没有符合条件的成就。</p>
        </div>
      )}

      <details className="card">
        <summary className="cursor-pointer text-sm font-medium text-brand-bright">＋ 新建成就</summary>
        <form action={saveAchievement} className="mt-3 space-y-3">
          <AchievementFields />
          <button type="submit" className="btn btn-primary btn-block">
            创建
          </button>
        </form>
      </details>

      {global.map((g) => (
        <section key={g.role}>
          <h2 className="section-title">
            <RoleIcon role={g.role} className="size-4" /> {g.role}（{g.items.length}）
          </h2>
          <ul className="space-y-2">
            {g.items.map((a) => (
              <Item key={a.id} a={a} owners={count(a.id)} />
            ))}
          </ul>
        </section>
      ))}

      {scripts.map((g) => (
        <section key={g.scriptName}>
          <h2 className="section-title">
            <NavIcon name="book" className="size-4" /> 剧本专属 · {g.scriptName}（{g.items.length}）
          </h2>
          <ul className="space-y-2">
            {g.items.map((a) => (
              <Item key={a.id} a={a} owners={count(a.id)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
