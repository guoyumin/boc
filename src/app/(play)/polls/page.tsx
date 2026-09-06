import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { polls } from "@/db/schema";
import { formatMd } from "@/lib/dates";
import { POLL_STATUS_LABEL } from "@/lib/labels";
import { getAdmin } from "@/lib/auth";
import { getOpenPoll } from "@/lib/queries";

export default async function PollsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const sp = await searchParams;
  const open = getOpenPoll();
  if (open && sp.all !== "1") redirect(`/polls/${open.id}`);

  const admin = await getAdmin();
  const rows = db.select().from(polls).orderBy(desc(polls.saturday), desc(polls.id)).limit(50).all();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">时间投票</h1>
        {admin && (
          <Link href="/admin/polls/new" className="btn btn-primary btn-sm">
            ＋ 发起投票
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <p className="muted">还没有任何时间投票。</p>
        </div>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/polls/${p.id}`} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{p.title}</p>
                  <p className="muted">周末 {formatMd(p.saturday)} 起</p>
                </div>
                <span className={`badge ${p.status === "open" ? "badge-brand" : "badge-plain"}`}>
                  {POLL_STATUS_LABEL[p.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
