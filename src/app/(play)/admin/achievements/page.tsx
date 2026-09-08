import Link from "next/link";
import { redirect } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import RoleIcon from "@/components/RoleIcon";
import { RARITIES, type Rarity } from "@/db/schema";
import { roleTeam } from "@/lib/roles";
import RarityBadge from "@/components/RarityBadge";
import { deleteAchievement, grantAchievement, saveAchievement } from "@/actions/achievements";
import { getAdmin } from "@/lib/auth";
import { RARITY_LABEL, RARITY_OPTIONS, asRarity } from "@/lib/labels";
import {
  achievementRoles,
  confirmedUnlockMap,
  groupByRole,
  groupByScript,
  listAchievements,
} from "@/lib/queries";

type Ach = ReturnType<typeof listAchievements>[number];

function Fields({ a }: { a?: Ach }) {
  return (
    <>
      <div className="grid grid-cols-[4rem_1fr] gap-2">
        <div>
          <label className="label">图标</label>
          <input className="input text-center" name="icon" defaultValue={a?.icon ?? ""} maxLength={4} placeholder="按角色" />
        </div>
        <div>
          <label className="label">名称</label>
          <input className="input" name="name" defaultValue={a?.name ?? ""} maxLength={30} required />
        </div>
      </div>
      <div>
        <label className="label">达成条件</label>
        <textarea
          className="input"
          name="description"
          rows={2}
          defaultValue={a?.description ?? ""}
          maxLength={200}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">角色</label>
          <input
            className="input"
            name="role"
            list="ach-roles"
            defaultValue={a?.role ?? "通用"}
            maxLength={20}
            placeholder="通用 / 厨师 / 麻脸巫婆"
          />
        </div>
        <div>
          <label className="label">稀有度</label>
          <select className="input" name="rarity" defaultValue={a?.rarity ?? "common"}>
            {RARITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">剧本专属（留空 = 全局成就）</label>
        <input
          className="input"
          name="scriptName"
          defaultValue={a?.scriptName ?? ""}
          maxLength={40}
          placeholder="宏伟岩廊"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">排序</label>
          <input className="input" name="sortOrder" type="number" defaultValue={a?.sortOrder ?? 100} />
        </div>
        <div className="flex items-end gap-4 pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="hidden"
              value="1"
              defaultChecked={a?.hidden === 1}
              className="h-4 w-4 accent-[#8b1e2d]"
            />
            隐藏
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              value="1"
              defaultChecked={a ? a.active === 1 : true}
              className="h-4 w-4 accent-[#8b1e2d]"
            />
            上架
          </label>
        </div>
      </div>
    </>
  );
}

function Item({ a, owners }: { a: Ach; owners: number }) {
  return (
    <li className="card">
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none">{a.icon}</span>
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

      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-brand-bright">编辑</summary>
        <form action={saveAchievement} className="mt-3 space-y-3">
          <input type="hidden" name="achievementId" value={a.id} />
          <Fields a={a} />
          <button type="submit" className="btn btn-primary btn-block">
            保存
          </button>
        </form>
        <form action={deleteAchievement} className="mt-2">
          <input type="hidden" name="achievementId" value={a.id} />
          <ConfirmSubmit message={`删除成就「${a.name}」？相关宣告也会一起删掉。`}>
            删除成就
          </ConfirmSubmit>
        </form>
      </details>

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
  const roles = achievementRoles();

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
        <Link href="/achievements" className="btn btn-sm">
          看成就墙
        </Link>
      </div>
      <Flash err={sp.err} ok={sp.ok} />

      <datalist id="ach-roles">
        {roles.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <p className="muted">
        {shown.length === list.length
          ? `共 ${list.length} 个成就。`
          : `筛出 ${shown.length} 个（全部 ${list.length} 个）。`}
        正式清单来自 <code>docs/achievements.tsv</code>，在这里的改动只影响数据库，不会写回那份表。
      </p>

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
          <Fields />
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
            📕 剧本专属 · {g.scriptName}（{g.items.length}）
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
