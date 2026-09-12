import Link from "next/link";
import RarityBadge from "./RarityBadge";
import RoleIcon from "./RoleIcon";
import { formatDay } from "@/lib/dates";
import type { Unlocker } from "@/lib/queries";
import { DEFAULT_SKIN, type Skin } from "@/lib/skins";

type Ach = {
  id: number;
  name: string;
  description: string;
  role: string;
  rarity: string;
  scriptName: string | null;
  hidden: number;
};

/** 最近 7 天内解锁过的卡在页面加载时点亮一次（issue #28）。日期不可考的历史记录不算。 */
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
function isFresh(owners: Unlocker[]): boolean {
  const now = Date.now();
  return owners.some((o) => {
    if (o.unlockedAtText) return false;
    const t = Date.parse(o.unlockedAt);
    return Number.isFinite(t) && now - t < FRESH_MS;
  });
}

/**
 * 成就卡。已解锁和未解锁是同一张卡、同一个尺寸，
 * 区别只在图标和边框的成色 —— 说明文字始终保持可读（issue #15）。
 */
export default function AchievementCard({
  a,
  owners,
  skin = DEFAULT_SKIN,
}: {
  a: Ach;
  owners: Unlocker[];
  skin?: Skin;
}) {
  const locked = owners.length === 0;
  const masked = a.hidden === 1 && locked;
  const first = owners[0];
  const fresh = !locked && isFresh(owners);

  return (
    <Link href={`/achievements/${a.id}`} className="block h-full">
      <article
        data-skin={skin}
        data-rarity={a.rarity}
        data-locked={locked ? "" : undefined}
        data-fresh={fresh ? "" : undefined}
        className="ach-card"
      >
        {fresh && <span className="ach-new">新解锁</span>}
        <p className="ach-state">{locked ? "未解锁" : "已解锁"}</p>

        <div className="ach-frame">
          {masked ? (
            <span className="ach-mask">?</span>
          ) : (
            <RoleIcon role={a.role} className="size-16" dimmed={locked} />
          )}
        </div>

        <h3 className="ach-name">{masked ? "???" : a.name}</h3>
        <p className="ach-desc">
          {masked ? "隐藏成就，解锁后才会显示。" : a.description}
        </p>

        <div className="ach-foot">
          <RarityBadge rarity={a.rarity} />
          <p className="ach-credit">
            {first ? (
              <>
                <span className="font-medium">{first.name}</span> 首解 ·{" "}
                {first.unlockedAtText ?? formatDay(first.unlockedAt)}
                {owners.length > 1 && <> · 共 {owners.length} 人</>}
              </>
            ) : (
              <>还没有人解锁</>
            )}
          </p>
        </div>
      </article>
    </Link>
  );
}
