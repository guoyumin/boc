import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Flash from "@/components/Flash";
import { logoutAction } from "@/actions/admin";
import { reviewClaim } from "@/actions/achievements";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { getAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { ADMIN_ROLE_LABEL } from "@/lib/labels";
import { getOpenPoll, getPollView, nextEvent, pendingClaims } from "@/lib/queries";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const claims = pendingClaims();
  const pendingAdmins = db.select().from(admins).where(eq(admins.status, "pending")).all();
  const poll = getOpenPoll();
  const pollView = poll ? getPollView(poll.id) : null;
  const upcoming = nextEvent();

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">管理后台</h1>
        <span className="badge badge-plain">
          {admin.username} · {ADMIN_ROLE_LABEL[admin.role]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/admin/polls/new" className="btn btn-primary">
          发起时间预填
        </Link>
        <Link href="/admin/events/new" className="btn btn-primary">
          新建活动
        </Link>
        <Link href="/admin/players" className="btn">
          名册
        </Link>
        <Link href="/admin/claims" className="btn">
          成就宣告 {claims.length > 0 && `(${claims.length})`}
        </Link>
        {admin.role === "owner" && (
          <Link href="/admin/admins" className="btn col-span-2">
            管理员 {pendingAdmins.length > 0 && `(${pendingAdmins.length})`}
          </Link>
        )}
      </div>

      {/* 成就管理入口单独拎出来：上一版做成小按钮，管理员找不到 */}
      <Link
        href="/admin/achievements"
        className="card block border-brand/30 bg-brand-light/40 transition active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">🏆</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-brand">成就管理 →</p>
            <p className="muted mt-0.5">
              改成就的名称、达成条件、角色、星级和图标，或直接把成就授予某个玩家。
            </p>
          </div>
        </div>
      </Link>

      <section className="card">
        <div className="card-title">
          <span>⏳ 待确认成就（{claims.length}）</span>
          <Link href="/admin/claims" className="text-xs text-brand">
            全部 →
          </Link>
        </div>
        {claims.length === 0 ? (
          <p className="muted">没有待办。</p>
        ) : (
          <ul className="space-y-2">
            {claims.slice(0, 5).map((c) => (
              <li key={c.claimId} className="rounded-lg border border-stone-200 p-2">
                <p className="text-sm">
                  <span className="font-medium">{c.playerName}</span> 宣告了{" "}
                  <span className="font-medium">
                    {c.icon} {c.achievementName}
                  </span>
                </p>
                {c.note && <p className="muted">{c.note}</p>}
                <div className="mt-2 flex gap-2">
                  <form action={reviewClaim}>
                    <input type="hidden" name="claimId" value={c.claimId} />
                    <input type="hidden" name="decision" value="confirm" />
                    <input type="hidden" name="back" value="/admin" />
                    <button type="submit" className="btn btn-sm btn-primary">
                      确认
                    </button>
                  </form>
                  <form action={reviewClaim}>
                    <input type="hidden" name="claimId" value={c.claimId} />
                    <input type="hidden" name="decision" value="reject" />
                    <input type="hidden" name="back" value="/admin" />
                    <button type="submit" className="btn btn-sm btn-danger">
                      驳回
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {admin.role === "owner" && (
        <section className="card">
          <div className="card-title">
            <span>👮 待审管理员（{pendingAdmins.length}）</span>
            <Link href="/admin/admins" className="text-xs text-brand">
              去审批 →
            </Link>
          </div>
          {pendingAdmins.length === 0 ? (
            <p className="muted">没有待审申请。</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {pendingAdmins.map((a) => (
                <li key={a.id}>
                  {a.username}
                  {a.note && <span className="muted"> · {a.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="card">
        <div className="card-title">🗓 进行中的预填</div>
        {pollView ? (
          <Link href={`/polls/${pollView.poll.id}`} className="block">
            <p className="font-medium">{pollView.poll.title}</p>
            <p className="muted">{pollView.responses.length} 人已填，最多的时段 {pollView.best} 人</p>
          </Link>
        ) : (
          <p className="muted">
            没有进行中的预填。<Link href="/admin/polls/new" className="link">现在发起一个</Link>
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-title">🎲 下一次活动</div>
        {upcoming ? (
          <Link href={`/events/${upcoming.id}`} className="block">
            <p className="font-medium">{formatDate(upcoming.date)}</p>
            <p className="muted">{upcoming.title}</p>
          </Link>
        ) : (
          <p className="muted">还没排下一次活动。</p>
        )}
      </section>

      <section className="card">
        <div className="card-title">账号</div>
        <div className="flex gap-2">
          <Link href="/admin/password" className="btn">
            改密码
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-danger">
              退出登录
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
