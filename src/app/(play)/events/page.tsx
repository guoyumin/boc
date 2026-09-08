import Link from "next/link";
import GrimoireLink from "@/components/GrimoireLink";
import Flash from "@/components/Flash";
import { getAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { EVENT_STATUS_CLASS, EVENT_STATUS_LABEL, signupSummary } from "@/lib/labels";
import { listEvents } from "@/lib/queries";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const admin = await getAdmin();
  const rows = listEvents();

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

      {rows.length === 0 ? (
        <div className="card">
          <p className="muted">还没有活动。</p>
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
                  <span>到场 {e.attendCount}</span>
                  {e.noShowCount > 0 && <span className="text-warn">鸽 {e.noShowCount}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
