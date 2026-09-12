import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import AchievementCard from "@/components/AchievementCard";
import Flash from "@/components/Flash";
import { getUser, isAdminRole } from "@/lib/auth";
import { RARITIES, type Rarity } from "@/db/schema";
import NavIcon from "@/components/NavIcon";
import RoleIcon from "@/components/RoleIcon";
import { roleTeam } from "@/lib/roles";
import { SKINS, SKIN_LABEL, asSkin, type Skin } from "@/lib/skins";
import { RARITY_LABEL, asRarity } from "@/lib/labels";
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

/**
 * 筛选是三个独立维度，可以组合（issue #41）：排序方式 × 阵营 × 解锁状态。
 * 原来「只看已解锁」混在排序里，导致「已解锁 + 按时间」这种组合选不出来。
 */
const SORTS = [
  { key: "role", label: "按角色" },
  { key: "rarity", label: "按稀有度" },
  { key: "time", label: "按解锁时间" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

const TEAMS = [
  { key: "all", label: "全部" },
  { key: "good", label: "蓝方" },
  { key: "evil", label: "红方" },
] as const;
type Team = (typeof TEAMS)[number]["key"];

const STATUSES = [
  { key: "all", label: "全部" },
  { key: "unlocked", label: "已解锁" },
  { key: "locked", label: "未解锁" },
] as const;
type Status = (typeof STATUSES)[number]["key"];

function pick<T extends string>(options: readonly { key: T }[], v: string | null | undefined, fallback: T): T {
  return (options.map((o) => o.key) as readonly string[]).includes(String(v)) ? (v as T) : fallback;
}

/** 一组成就：已解锁的铺成卡，未解锁的缩成紧凑格 */
function Group({
  title,
  items,
  unlocks,
  skin,
  id,
}: {
  title: React.ReactNode;
  items: Achievement[];
  unlocks: Map<number, Unlocker[]>;
  skin: Skin;
  id?: string;
}) {
  if (items.length === 0) return null;
  const unlockedCount = items.filter((a) => (unlocks.get(a.id) ?? []).length > 0).length;

  return (
    <section id={id} className="scroll-mt-16">
      <h2 className="section-title">
        {title} · 已解锁 {unlockedCount}/{items.length}
      </h2>
      {/* 手机两列，再窄的屏幕上宁可一列也不把卡片挤小（#15） */}
      <ul className="grid grid-cols-1 gap-3 min-[23rem]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((a) => (
          <li key={a.id}>
            <AchievementCard a={a} owners={unlocks.get(a.id) ?? []} skin={skin} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    err?: string;
    ok?: string;
    sort?: string;
    team?: string;
    status?: string;
    skin?: string;
  }>;
}) {
  const sp = await searchParams;
  const sort = pick(SORTS, sp.sort, "role");
  const team = pick(TEAMS, sp.team, "all");
  const status = pick(STATUSES, sp.status, "all");
  const me = await getUser();
  // URL 上的 ?skin= 优先（方便预览和分享），其次是账号里存的选择（issue #12）
  const skin = asSkin(sp.skin ?? me?.cardSkin);
  const admin = me !== null && isAdminRole(me.role);
  const list = listAchievements();
  const unlocks = confirmedUnlockMap();

  const isUnlocked = (a: Achievement) => (unlocks.get(a.id) ?? []).length > 0;

  // 三个维度互不影响：切换其中一个，其余保持原样
  const shown = list.filter((a) => {
    if (team !== "all" && roleTeam(a.role) !== team) return false;
    if (status === "unlocked" && !isUnlocked(a)) return false;
    if (status === "locked" && isUnlocked(a)) return false;
    return true;
  });
  const unlockedCount = shown.filter(isUnlocked).length;

  const href = (next: Partial<{ sort: Sort; team: Team; status: Status; skin: Skin }>) => {
    const q = new URLSearchParams({ sort, team, status, skin, ...next });
    return `?${q}`;
  };

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
          <EmptyState art="shelf">还没有成就。</EmptyState>
        </div>
      ) : (
        <>
          <p className="muted">
            {shown.length === list.length
              ? `共 ${list.length} 个成就，已解锁 ${unlockedCount} 个。`
              : `筛出 ${shown.length} 个（全部 ${list.length} 个），其中已解锁 ${unlockedCount} 个。`}
            积分：普通 1 / 稀有 3 / 史诗 5 / 传说 10。
          </p>

          <nav className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-faint">排序</span>
                {SORTS.map((o) => (
                  <Link
                    key={o.key}
                    href={href({ sort: o.key })}
                    className={`btn btn-sm ${sort === o.key ? "btn-primary" : ""}`}
                  >
                    {o.label}
                  </Link>
                ))}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-faint">阵营</span>
                {TEAMS.map((o) => (
                  <Link
                    key={o.key}
                    href={href({ team: o.key })}
                    className={`btn btn-sm ${team === o.key ? "btn-primary" : ""}`}
                  >
                    {o.label}
                  </Link>
                ))}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-faint">状态</span>
                {STATUSES.map((o) => (
                  <Link
                    key={o.key}
                    href={href({ status: o.key })}
                    className={`btn btn-sm ${status === o.key ? "btn-primary" : ""}`}
                  >
                    {o.label}
                  </Link>
                ))}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="text-xs text-faint">卡面</span>
                {SKINS.map((k) => (
                  <Link
                    key={k}
                    href={href({ skin: k })}
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
              {/* 角色菜单：换行铺开，别让后面的角色藏在横向滚动里（#15） */}
              <div className="flex flex-wrap gap-1.5">
                {groupByRole(shown.filter((a) => !a.scriptName)).map((g, i) => (
                  <a key={g.role} href={`#${anchorId(i)}`} className="btn btn-sm gap-1.5">
                    <RoleIcon role={g.role} className="size-4" />
                    {g.role}
                  </a>
                ))}
              </div>
              {groupByRole(shown.filter((a) => !a.scriptName)).map((g, i) => (
                <Group
                  key={g.role}
                  id={anchorId(i)}
                  title={
                    <span className="inline-flex items-center gap-1.5">
                      <RoleIcon role={g.role} className="size-4" />
                      {g.role}
                    </span>
                  }
                  items={g.items}
                  unlocks={unlocks}
                  skin={skin}
                />
              ))}
              {groupByScript(shown.filter((a) => a.scriptName)).map((g) => (
                <Group
                  key={g.scriptName}
                  title={
                    <span className="inline-flex items-center gap-1.5">
                      <NavIcon name="book" className="size-4" />
                      剧本专属 · {g.scriptName}
                    </span>
                  }
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
                items={shown.filter((a) => asRarity(a.rarity) === r)}
                unlocks={unlocks}
                skin={skin}
              />
            ))}

          {sort === "time" && (
            <Group
              title={
                <span className="inline-flex items-center gap-1.5">
                  <NavIcon name="calendar" className="size-4" />
                  按解锁时间
                </span>
              }
              items={[...shown].sort((a, b) => {
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

        </>
      )}
    </div>
  );
}
