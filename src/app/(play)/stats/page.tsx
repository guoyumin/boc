import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { winStats, type WinRow } from "@/lib/queries";

/** 一条红蓝比例条。没判出胜负的局不占条的长度，只在数字里单独写出来。 */
function WinBar({ row }: { row: WinRow }) {
  const decided = row.good + row.evil;
  if (decided === 0) return <div className="h-2 rounded-full bg-surface-2" />;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
      <div className="bg-rare" style={{ width: `${(row.good / decided) * 100}%` }} />
      <div className="bg-danger" style={{ width: `${(row.evil / decided) * 100}%` }} />
    </div>
  );
}

function rateText(row: WinRow): string {
  if (row.goodRate === null) return "还没有判出胜负的局";
  return `善良 ${row.goodRate}% · 邪恶 ${100 - row.goodRate}%`;
}

export default async function StatsPage() {
  const { overall, byScript } = winStats();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="page-title">战绩</h1>
        <Link href="/events" className="btn btn-sm">
          看活动
        </Link>
      </div>

      {overall.total === 0 ? (
        <div className="card">
          <EmptyState art="dice">还没有游戏记录，说书人记一局就有了。</EmptyState>
        </div>
      ) : (
        <>
          <section className="card">
            <p className="eyebrow">all games</p>
            <p className="display mt-1 text-2xl">
              共 {overall.total} 局 · {rateText(overall)}
            </p>
            <div className="mt-3">
              <WinBar row={overall} />
            </div>
            <p className="muted mt-2">
              善良胜 {overall.good} · 邪恶胜 {overall.evil}
              {overall.unknown > 0 && ` · 未记录 ${overall.unknown}`}
              。胜率只算判出胜负的局。
            </p>
          </section>

          <section>
            <h2 className="section-title">按板子</h2>
            <ul className="grid gap-2 lg:grid-cols-2">
              {byScript.map((r) => (
                <li key={r.scriptName} className="card">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-ink">{r.scriptName}</span>
                    <span className="muted shrink-0">{r.total} 局</span>
                  </div>
                  <div className="mt-2">
                    <WinBar row={r} />
                  </div>
                  <p className="muted mt-1.5">
                    {rateText(r)}
                    <span className="text-faint">
                      {" "}
                      · 善 {r.good} / 邪 {r.evil}
                      {r.unknown > 0 && ` / 未记录 ${r.unknown}`}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
