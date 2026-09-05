import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import Flash from "@/components/Flash";
import { reviewClaim } from "@/actions/achievements";
import { db } from "@/db";
import { achievementClaims, achievements, players } from "@/db/schema";
import { getAdmin } from "@/lib/auth";
import { CLAIM_STATUS_LABEL } from "@/lib/labels";
import { pendingClaims } from "@/lib/queries";

export default async function AdminClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/admin/login");
  const pending = pendingClaims();
  const handled = db
    .select({
      id: achievementClaims.id,
      status: achievementClaims.status,
      name: achievements.name,
      icon: achievements.icon,
      playerName: players.name,
      reviewNote: achievementClaims.reviewNote,
    })
    .from(achievementClaims)
    .innerJoin(achievements, eq(achievements.id, achievementClaims.achievementId))
    .innerJoin(players, eq(players.id, achievementClaims.playerId))
    .where(eq(achievementClaims.status, "rejected"))
    .orderBy(desc(achievementClaims.id))
    .limit(20)
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">成就宣告</h1>
      <Flash err={sp.err} ok={sp.ok} />

      <section className="card">
        <div className="card-title">⏳ 待确认（{pending.length}）</div>
        {pending.length === 0 ? (
          <p className="muted">没有待办。</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((c) => (
              <li key={c.claimId} className="rounded-lg border border-stone-200 p-3">
                <p className="text-sm">
                  <Link href={`/players/${c.playerId}`} className="font-medium">
                    {c.playerName}
                  </Link>{" "}
                  宣告了{" "}
                  <Link href={`/achievements/${c.achievementId}`} className="font-medium text-brand">
                    {c.icon} {c.achievementName}
                  </Link>
                </p>
                {c.note && <p className="muted mt-1">{c.note}</p>}
                {c.eventId && (
                  <p className="muted">
                    关联活动：<Link href={`/events/${c.eventId}`} className="link">#{c.eventId}</Link>
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <form action={reviewClaim} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="claimId" value={c.claimId} />
                    <input type="hidden" name="decision" value="reject" />
                    <input type="hidden" name="back" value="/admin/claims" />
                    <input className="input flex-1 py-1 text-sm" name="reviewNote" placeholder="驳回理由（可选）" />
                    <button type="submit" className="btn btn-sm btn-danger">
                      驳回
                    </button>
                  </form>
                  <form action={reviewClaim}>
                    <input type="hidden" name="claimId" value={c.claimId} />
                    <input type="hidden" name="decision" value="confirm" />
                    <input type="hidden" name="back" value="/admin/claims" />
                    <button type="submit" className="btn btn-sm btn-primary">
                      确认
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-title">最近驳回</div>
        {handled.length === 0 ? (
          <p className="muted">没有驳回记录。</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {handled.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2">
                <span>
                  {h.icon} {h.name} · {h.playerName}
                </span>
                <span className="badge badge-plain">{CLAIM_STATUS_LABEL[h.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
