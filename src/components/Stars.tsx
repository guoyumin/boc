import { clampStars } from "@/lib/labels";

/**
 * 稀有度星条：1–5 星，星数即积分。
 * 手机上比重复的 ⭐ emoji 紧凑很多，实心星用品牌色，空星灰显。
 */
export default function Stars({
  stars,
  size = "sm",
  showPoints = false,
  className = "",
}: {
  stars: number;
  size?: "sm" | "md";
  showPoints?: boolean;
  className?: string;
}) {
  const n = clampStars(stars);
  const text = size === "md" ? "text-base" : "text-xs";
  return (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap ${className}`}
      title={`稀有度 ${n} 星 · ${n} 分`}
    >
      <span className={`${text} leading-none tracking-tight text-amber-500`} aria-hidden>
        {"★".repeat(n)}
        <span className="text-stone-300">{"★".repeat(5 - n)}</span>
      </span>
      <span className="sr-only">{n} 星</span>
      {showPoints && <span className="text-xs text-stone-500">{n} 分</span>}
    </span>
  );
}
