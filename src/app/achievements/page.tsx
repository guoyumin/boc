import Link from "next/link";
import Flash from "@/components/Flash";
import { getAdmin } from "@/lib/auth";
import { CATEGORY_LABEL, CATEGORY_ORDER, RARITY_CLASS, RARITY_LABEL } from "@/lib/labels";
import { confirmedUnlockMap, listAchievements } from "@/lib/queries";
import type { Category, Rarity } from "@/db/schema";

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const admin = await getAdmin();
  const list = listAchievements();
  const unlocks = confirmedUnlockMap();

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">成就墙</h1>
        {admin && (
          <Link href="/admin/achievements" className="btn btn-sm btn-primary">
            管理成就
          </Link>
        )}
      </div>

      {list.length === 0 && (
        <div className="card">
          <p className="muted">还没有成就。</p>
        </div>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const items = list.filter((a) => a.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat}>
            <h2 className="section-title">{CATEGORY_LABEL[cat as Category]}</h2>
            <ul className="space-y-2">
              {items.map((a) => {
                const owners = unlocks.get(a.id) ?? [];
                const locked = owners.length === 0;
                const masked = a.hidden === 1 && locked;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/achievements/${a.id}`}
                      className={`card block ${locked ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl leading-none">{masked ? "❓" : a.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-800">{masked ? "???" : a.name}</span>
                            <span className={`badge ${RARITY_CLASS[a.rarity as Rarity]}`}>
                              {RARITY_LABEL[a.rarity as Rarity]}
                            </span>
                            {a.hidden === 1 && <span className="badge badge-plain">隐藏</span>}
                          </div>
                          <p className="muted mt-0.5 line-clamp-2">
                            {masked ? "隐藏成就，解锁后才会显示。" : a.description}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {locked
                              ? "还没有人解锁"
                              : `${owners.length} 人解锁：${owners.slice(0, 6).map((o) => o.name).join("、")}${
                                  owners.length > 6 ? " 等" : ""
                                }`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
