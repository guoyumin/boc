import Link from "next/link";
import { redirect } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import { deleteAchievement, grantAchievement, saveAchievement } from "@/actions/achievements";
import { getAdmin } from "@/lib/auth";
import { CATEGORY_LABEL, CATEGORY_ORDER, RARITY_LABEL } from "@/lib/labels";
import { confirmedUnlockMap, listAchievements } from "@/lib/queries";
import { RARITIES, type Category, type Rarity } from "@/db/schema";

type Ach = ReturnType<typeof listAchievements>[number];

function Fields({ a }: { a?: Ach }) {
  return (
    <>
      <div className="grid grid-cols-[4rem_1fr] gap-2">
        <div>
          <label className="label">图标</label>
          <input className="input text-center" name="icon" defaultValue={a?.icon ?? "🏆"} maxLength={4} />
        </div>
        <div>
          <label className="label">名称</label>
          <input className="input" name="name" defaultValue={a?.name ?? ""} maxLength={30} required />
        </div>
      </div>
      <div>
        <label className="label">描述</label>
        <textarea className="input" name="description" rows={2} defaultValue={a?.description ?? ""} maxLength={200} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">分类</label>
          <select className="input" name="category" defaultValue={a?.category ?? "other"}>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c as Category]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">稀有度</label>
          <select className="input" name="rarity" defaultValue={a?.rarity ?? "common"}>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {RARITY_LABEL[r as Rarity]}
              </option>
            ))}
          </select>
        </div>
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

export default async function AdminAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/admin/login");
  const list = listAchievements(true);
  const unlocks = confirmedUnlockMap();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">成就管理</h1>
        <Link href="/achievements" className="btn btn-sm">
          看成就墙
        </Link>
      </div>
      <Flash err={sp.err} ok={sp.ok} />

      <details className="card">
        <summary className="cursor-pointer text-sm font-medium text-brand">＋ 新建成就</summary>
        <form action={saveAchievement} className="mt-3 space-y-3">
          <Fields />
          <button type="submit" className="btn btn-primary btn-block">
            创建
          </button>
        </form>
      </details>

      <ul className="space-y-2">
        {list.map((a) => (
          <li key={a.id} className="card">
            <div className="flex items-start gap-2">
              <span className="text-2xl leading-none">{a.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-800">
                  {a.name}
                  {a.active === 0 && <span className="badge badge-plain ml-2">已下架</span>}
                  {a.hidden === 1 && <span className="badge badge-plain ml-1">隐藏</span>}
                </p>
                <p className="muted">
                  {CATEGORY_LABEL[a.category as Category]} · {RARITY_LABEL[a.rarity as Rarity]} ·{" "}
                  {(unlocks.get(a.id) ?? []).length} 人解锁
                </p>
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
              <input className="input flex-1 py-1 text-sm" name="nickname" placeholder="直接授予给（昵称）" maxLength={20} required />
              <button type="submit" className="btn btn-sm btn-primary">
                授予
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
