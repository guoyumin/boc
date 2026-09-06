import Link from "next/link";
import ClockFace from "./ClockFace";
import RarityBadge from "./RarityBadge";
import { formatDay } from "@/lib/dates";
import { RARITY_LABEL, asRarity, roleIcon } from "@/lib/labels";
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

/** 首解者那一行：谁、什么时候。日期不确切的走 unlockedAtText（如「已不可考」）。 */
function FirstUnlock({ u }: { u: Unlocker }) {
  return (
    <>
      <span className="font-medium">{u.name}</span> 首解 ·{" "}
      {u.unlockedAtText ?? formatDay(u.unlockedAt)}
    </>
  );
}

/**
 * 已解锁的成就：竖版收藏卡。
 * 视觉参照用户给的那张卡——顶部横幅、角色、中央主图、大标题、分隔星、达成条件。
 * 颜色全部来自 data-skin / data-rarity 决定的 CSS 变量，组件本身不写死颜色。
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
  const first = owners[0];
  return (
    <Link href={`/achievements/${a.id}`} className="block h-full">
      <article data-skin={skin} data-rarity={a.rarity} className="ach-card">
        <span className="ach-corner top-1.5 left-1.5 border-r-0 border-b-0" />
        <span className="ach-corner top-1.5 right-1.5 border-b-0 border-l-0" />
        <span className="ach-corner bottom-1.5 left-1.5 border-t-0 border-r-0" />
        <span className="ach-corner right-1.5 bottom-1.5 border-t-0 border-l-0" />

        <p className="ach-banner">血染钟楼 · 成就</p>
        <p className="ach-role">
          {roleIcon(a.role)} {a.role}
        </p>

        <div className="ach-art">
          <ClockFace className="ach-clock" />
          <span className="ach-icon">{a.icon}</span>
        </div>

        <h3 className="ach-name">{a.name}</h3>
        {/* 分隔线中间放稀有度：卡框颜色已经在暗示，但得有字才认得出 */}
        <p className="ach-star">✦ {RARITY_LABEL[asRarity(a.rarity)]} ✦</p>
        <p className="ach-desc">{a.description}</p>

        <p className="ach-foot">
          {first ? <FirstUnlock u={first} /> : "还没有人解锁"}
          {owners.length > 1 && <span className="ml-1">· 共 {owners.length} 人</span>}
        </p>
      </article>
    </Link>
  );
}

/** 未解锁的成就：紧凑格子。隐藏成就连名字都不给。 */
export function AchievementTile({ a }: { a: Ach }) {
  const masked = a.hidden === 1;
  return (
    <Link href={`/achievements/${a.id}`} className="block h-full">
      <div className="ach-tile">
        <span className="text-2xl leading-none opacity-45 grayscale">{masked ? "❓" : a.icon}</span>
        <span className="line-clamp-2 text-xs text-muted">{masked ? "???" : a.name}</span>
        <RarityBadge rarity={a.rarity} className="mt-0.5 scale-90 opacity-70" />
      </div>
    </Link>
  );
}
