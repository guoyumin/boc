import { RARITY_CLASS, RARITY_LABEL, RARITY_POINTS, asRarity } from "@/lib/labels";

/** 成就稀有度徽章：普通 / 稀有 / 史诗 / 传说。 */
export default function RarityBadge({
  rarity,
  showPoints = false,
  className = "",
}: {
  rarity: string;
  showPoints?: boolean;
  className?: string;
}) {
  const r = asRarity(rarity);
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      <span className={`badge ${RARITY_CLASS[r]}`}>{RARITY_LABEL[r]}</span>
      {showPoints && <span className="text-xs text-stone-500">{RARITY_POINTS[r]} 分</span>}
    </span>
  );
}
