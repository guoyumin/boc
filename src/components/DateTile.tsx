import { parseYmd, weekdayCn } from "@/lib/dates";

/**
 * 小日历牌（issue #28）：血色月份条 + 衬线大号日期 + 星期。
 * 活动页顶部用，让「哪天」一眼就看到，不再是一行普通文字。
 */
export default function DateTile({ ymd, className = "" }: { ymd: string; className?: string }) {
  const d = parseYmd(ymd);
  return (
    <div className={`date-tile ${className}`} aria-hidden="true">
      <span className="date-tile-month">{d.getMonth() + 1} 月</span>
      <span className="date-tile-day">{d.getDate()}</span>
      <span className="date-tile-wd">{weekdayCn(ymd)}</span>
    </div>
  );
}
