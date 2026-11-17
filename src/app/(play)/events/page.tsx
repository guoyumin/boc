import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import GrimoireLink from "@/components/GrimoireLink";
import Flash from "@/components/Flash";
import { getAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { EVENT_STATUS_CLASS, EVENT_STATUS_LABEL, signupSummary } from "@/lib/labels";
import { listEvents, winStats } from "@/lib/queries";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const admin = await getAdmin();
  const rows = listEvents();
  const { overall } = winStats();

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />
      <div className="flex items-center justify-between">
        <h1 className="page-title">活动</h1>
        <div className="flex items-center gap-2">
          <GrimoireLink />
          {admin && (
            <Link href="/admin/events/new" className="btn btn-primary btn-sm">
              ＋ 新建活动
            </Link>
          )}
        </div>
      </div>

      {/* 全站战绩摘要，点进去按板子拆（issue #66） */}
      {overall.total > 0 && (
        <Link href="/stats" className="card block transition hover:border-brand-line">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium text-ink">
              共 {overall.total} 局
              {overall.goodRate !== null && (
                <span className="muted">
                  {" "}
                  · 善良 {overall.goodRate}% · 邪恶 {100 - overall.goodRate}%
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-brand-bright">按板子看 →</span>
          </div>
          {overall.good + overall.evil > 0 && (
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="bg-rare"
                style={{ width: `${(overall.good / (overall.good + overall.evil)) * 100}%` }}
              />
              <div
                className="bg-danger"
                style={{ width: `${(overall.evil / (overall.good + overall.evil)) * 100}%` }}
              />
            </div>
          )}
        </Link>
      )}

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState art="calendar">还没有活动。</EmptyState>
        </div>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {rows.map((e) => (
            <li key={e.id}>
              <Link href={`/events/${e.id}`} className="card block">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{formatDate(e.date)}</p>
                    <p className="muted truncate">
                      {e.scripts.length > 0 ? e.scripts.join(" / ") : e.location || e.title}
                    </p>
                  </div>
                  <span className={`badge ${EVENT_STATUS_CLASS[e.status] ?? "badge-plain"}`}>
                    {EVENT_STATUS_LABEL[e.status]}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                  <span className={e.capacity !== null && e.signupCount >= e.capacity ? "text-warn" : ""}>
                    {signupSummary(e)}
                  </span>
                  {/* 两场都开的活动顺带给出分场次人数，排桌子一眼看清（issue #57） */}
                  {e.hasAfternoon === 1 && e.hasEvening === 1 && e.signupCount > 0 && (
                    <span>
                      下午 {e.afternoonCount} · 晚上 {e.eveningCount}
                    </span>
                  )}
                  <span>到场 {e.attendCount}</span>
                  {e.noShowCount > 0 && <span className="text-danger">鸽 {e.noShowCount}</span>}
                  {e.lateCount > 0 && <span className="text-warn">迟到 {e.lateCount}</span>}
                  {e.leftEarlyCount > 0 && <span className="text-warn">早退 {e.leftEarlyCount}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
