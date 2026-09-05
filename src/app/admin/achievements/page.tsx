import Link from "next/link";
import { redirect } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import Stars from "@/components/Stars";
import { deleteAchievement, grantAchievement, saveAchievement } from "@/actions/achievements";
import { getAdmin } from "@/lib/auth";
import { roleIcon } from "@/lib/labels";
import {
  achievementRoles,
  confirmedUnlockMap,
  groupByRole,
  groupByScript,
  listAchievements,
} from "@/lib/queries";
import { STAR_LEVELS } from "@/db/schema";

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
          <label className="label">稀有度（星 = 分）</label>
          <select className="input" name="stars" defaultValue={String(a?.stars ?? 1)}>
            {STAR_LEVELS.map((s) => (
              <option key={s} value={s}>
                {"★".repeat(s)}（{s} 分）
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
          <p className="font-medium text-stone-800">
            {a.name}
            {a.active === 0 && <span className="badge badge-plain ml-2">已下架</span>}
            {a.hidden === 1 && <span className="badge badge-plain ml-1">隐藏</span>}
          </p>
          <p className="muted flex items-center gap-1.5">
            <Stars stars={a.stars} />
            <span>· {owners} 人解锁</span>
          </p>
          <p className="muted mt-0.5 line-clamp-2">{a.description}</p>
        </div>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-brand">编辑</summary>
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
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/admin/login");
  const list = listAchievements(true);
  const unlocks = confirmedUnlockMap();
  const roles = achievementRoles();
  const global = groupByRole(list.filter((a) => !a.scriptName));
  const scripts = groupByScript(list.filter((a) => a.scriptName));
  const count = (id: number) => (unlocks.get(id) ?? []).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">成就管理</h1>
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
        共 {list.length} 个成就。正式清单来自 <code>docs/achievements.tsv</code>，
        在这里的改动只影响数据库，不会写回那份表。
      </p>

      <details className="card">
        <summary className="cursor-pointer text-sm font-medium text-brand">＋ 新建成就</summary>
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
            {roleIcon(g.role)} {g.role}（{g.items.length}）
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
