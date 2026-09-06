import Link from "next/link";
import RarityBadge from "./RarityBadge";
import RoleIcon from "./RoleIcon";
import { formatDay } from "@/lib/dates";
import type { Unlocker } from "@/lib/queries";

/** 卡片皮肤。加皮肤只要在 globals.css 里加一个 [data-skin="xxx"] 块。 */
export const SKINS = ["gothic", "ice"] as const;
export type Skin = (typeof SKINS)[number];
export const DEFAULT_SKIN: Skin = "gothic";

export function asSkin(v: string | null | undefined): Skin {
  return (SKINS as readonly string[]).includes(String(v)) ? (v as Skin) : DEFAULT_SKIN;
}

type Ach = {
  id: number;
  name: string;
  description: string;
  icon: string;
  role: string;
  rarity: string;
  scriptName: string | null;
  hidden: number;
};

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

  return (
    <Link href={`/achievements/${a.id}`} className="block h-full">
      <article
        data-skin={skin}
        data-rarity={a.rarity}
        data-locked={locked ? "" : undefined}
        className="ach-card"
      >
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
