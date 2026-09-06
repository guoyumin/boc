import Link from "next/link";
import AchievementCard, { AchievementTile, SKINS, asSkin } from "@/components/AchievementCard";
import Flash from "@/components/Flash";
import { getAdmin } from "@/lib/auth";
import { RARITIES, type Rarity } from "@/db/schema";
import { RARITY_LABEL, asRarity, roleIcon } from "@/lib/labels";
import {
  confirmedUnlockMap,
  groupByRole,
  groupByScript,
  latestUnlockAt,
  listAchievements,
  type Achievement,
  type Unlocker,
} from "@/lib/queries";

/** 角色名 → 锚点 id。中文不能直接进 id，用下标编号。 */
function anchorId(i: number): string {
  return `role-${i}`;
}

/** 皮肤的中文名。加皮肤时这里也要加一条。 */
const SKIN_LABEL: Record<string, string> = { gothic: "暗夜", ice: "霜蓝" };

const SORTS = [
  { key: "role", label: "按角色" },
  { key: "rarity", label: "按稀有度" },
  { key: "time", label: "按解锁时间" },
  { key: "unlocked", label: "只看已解锁" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

function asSort(v: string | null | undefined): Sort {
  return (SORTS.map((s) => s.key) as readonly string[]).includes(String(v)) ? (v as Sort) : "role";
}

/** 一组成就：已解锁的铺成卡，未解锁的缩成紧凑格 */
function Group({
  title,
  items,
  unlocks,
  skin,
  id,
}: {
  title: string;
  items: Achievement[];
  unlocks: Map<number, Unlocker[]>;
  skin: ReturnType<typeof asSkin>;
  id?: string;
}) {
  const unlocked = items.filter((a) => (unlocks.get(a.id) ?? []).length > 0);
  const locked = items.filter((a) => (unlocks.get(a.id) ?? []).length === 0);
  if (items.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-16">
      <h2 className="section-title">
        {title} · 已解锁 {unlocked.length}/{items.length}
      </h2>

      {unlocked.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {unlocked.map((a) => (
            <li key={a.id}>
              <AchievementCard a={a} owners={unlocks.get(a.id) ?? []} skin={skin} />
            </li>
          ))}
        </ul>
      )}

      {locked.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
          {locked.map((a) => (
            <li key={a.id}>
              <AchievementTile a={a} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string; sort?: string; skin?: string }>;
}) {
  const sp = await searchParams;
  const sort = asSort(sp.sort);
  const skin = asSkin(sp.skin);
  const admin = await getAdmin();
  const list = listAchievements();
  const unlocks = confirmedUnlockMap();

  const isUnlocked = (a: Achievement) => (unlocks.get(a.id) ?? []).length > 0;
  const unlockedCount = list.filter(isUnlocked).length;
  /** 换排序时保留皮肤，换皮肤时保留排序 */
  const sortHref = (k: Sort) => (skin === "gothic" ? `?sort=${k}` : `?sort=${k}&skin=${skin}`);
  const skinHref = (k: string) => (k === "gothic" ? `?sort=${sort}` : `?sort=${sort}&skin=${k}`);

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

          <nav className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">
            <div className="flex flex-wrap items-center gap-1.5">
              {SORTS.map((s) => (
                <Link
                  key={s.key}
                  href={sortHref(s.key)}
                  className={`btn btn-sm ${sort === s.key ? "btn-primary" : ""}`}
                >
                  {s.label}
                </Link>
              ))}
              {/* 卡面皮肤。现在只跟着链接走，不记在账号上——记住每人的选择是后续 issue。 */}
              <span className="ml-auto flex items-center gap-1.5">
                <span className="text-xs text-faint">卡面</span>
                {SKINS.map((k) => (
                  <Link
                    key={k}
                    href={skinHref(k)}
                    className={`btn btn-sm ${skin === k ? "btn-primary" : ""}`}
                  >
                    {SKIN_LABEL[k]}
                  </Link>
                ))}
              </span>
            </div>
          </nav>

          {sort === "role" && (
            <>
              {/* 角色快捷跳转：横向滚动的锚点条，手机上一屏能扫完 */}
              <div className="table-wrap flex gap-1.5 pb-0.5">
                {groupByRole(list.filter((a) => !a.scriptName)).map((g, i) => (
                  <a key={g.role} href={`#${anchorId(i)}`} className="btn btn-sm shrink-0">
                    {roleIcon(g.role)} {g.role}
                  </a>
                ))}
              </div>
              {groupByRole(list.filter((a) => !a.scriptName)).map((g, i) => (
                <Group
                  key={g.role}
                  id={anchorId(i)}
                  title={`${roleIcon(g.role)} ${g.role}`}
                  items={g.items}
                  unlocks={unlocks}
                  skin={skin}
                />
              ))}
              {groupByScript(list.filter((a) => a.scriptName)).map((g) => (
                <Group
                  key={g.scriptName}
                  title={`📕 剧本专属 · ${g.scriptName}`}
                  items={g.items}
                  unlocks={unlocks}
                  skin={skin}
                />
              ))}
            </>
          )}

          {sort === "rarity" &&
            /* 传说在最前 */
            [...RARITIES].reverse().map((r: Rarity) => (
              <Group
                key={r}
                title={RARITY_LABEL[r]}
                items={list.filter((a) => asRarity(a.rarity) === r)}
                unlocks={unlocks}
                skin={skin}
              />
            ))}

          {sort === "time" && (
            <Group
              title="🕰 按解锁时间"
              items={[...list].sort((a, b) => {
                // 最近解锁的在前；没解锁的沉底，内部按名字稳定排
                const at = latestUnlockAt(unlocks.get(a.id) ?? []);
                const bt = latestUnlockAt(unlocks.get(b.id) ?? []);
                if (at && bt) return bt.localeCompare(at);
                if (at) return -1;
                if (bt) return 1;
                return a.name.localeCompare(b.name);
              })}
              unlocks={unlocks}
              skin={skin}
            />
          )}

          {sort === "unlocked" && (
            <Group
              title="🏆 已解锁"
              items={list.filter(isUnlocked).sort((a, b) => {
                const at = latestUnlockAt(unlocks.get(a.id) ?? []) ?? "";
                const bt = latestUnlockAt(unlocks.get(b.id) ?? []) ?? "";
                return bt.localeCompare(at);
              })}
              unlocks={unlocks}
              skin={skin}
            />
          )}
        </>
      )}
    </div>
  );
}
