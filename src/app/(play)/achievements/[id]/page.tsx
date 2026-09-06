import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/Flash";
import MyPending from "@/components/MyPending";
import NicknameInput from "@/components/NicknameInput";
import { claimAchievement, editClaimTime, grantAchievement } from "@/actions/achievements";
import { reviewClaim } from "@/actions/achievements";
import { getAdmin } from "@/lib/auth";
import RarityBadge from "@/components/RarityBadge";
import { formatDay, formatMd } from "@/lib/dates";
import RoleIcon from "@/components/RoleIcon";
import { claimsForAchievement, compareUnlock, getAchievement, listEvents } from "@/lib/queries";

export default async function AchievementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ach = getAchievement(Number(id));
  if (!ach) notFound();
  const admin = await getAdmin();
  const claims = claimsForAchievement(ach.id);
  const confirmed = claims
    .filter((c) => c.status === "confirmed")
    .sort(compareUnlock);
  const pending = claims.filter((c) => c.status === "pending");
  const events = listEvents(30);
  const masked = ach.hidden === 1 && confirmed.length === 0 && !admin;

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />

      <section className="card">
        <div className="flex items-start gap-3">
          <span className="text-4xl leading-none">{masked ? "❓" : ach.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-title text-ink">{masked ? "???" : ach.name}</h1>
              <RarityBadge rarity={ach.rarity} showPoints />
              <span className="badge badge-plain gap-1.5">
                <RoleIcon role={ach.role} className="size-4" />
                {ach.role}
              </span>
              {ach.scriptName && <span className="badge badge-plain">📕 {ach.scriptName}</span>}
              {ach.hidden === 1 && <span className="badge badge-plain">隐藏</span>}
            </div>
            <p className="mt-1 text-sm text-ink-2">
              <span className="text-faint">达成条件：</span>
              {masked ? "隐藏成就，解锁后才会显示。" : ach.description}
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-title">已解锁（{confirmed.length} 人）</div>
        {confirmed.length === 0 ? (
          <p className="muted">还没有人解锁。</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {confirmed.map((c, i) => (
              <li key={c.claimId} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Link href={`/players/${c.playerId}`} className="font-medium">
                    {c.playerName}
                  </Link>
                  {/* 名单按解锁时间升序，第一个就是首解 */}
                  {i === 0 && <span className="badge badge-brand">首解</span>}
                </span>
                <span className="muted shrink-0">
                  {c.unlockedAtText ?? formatDay(c.unlockedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <MyPending names={pending.map((p) => p.playerName)} />
      </section>

      {ach.active === 1 && (
        <section className="card">
          <div className="card-title">🙋 我达成了</div>
          <form action={claimAchievement} className="space-y-3">
            <input type="hidden" name="achievementId" value={ach.id} />
            <div>
              <label className="label">你的昵称</label>
              <NicknameInput />
            </div>
            <div>
              <label className="label">哪次活动（可选）</label>
              <select className="input" name="eventId" defaultValue="">
                <option value="">不指定</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {formatMd(e.date)} · {e.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">说明（可选）</label>
              <input className="input" name="note" maxLength={200} placeholder="当时发生了什么" />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              提交宣告
            </button>
            <p className="muted">提交后要管理员确认才会上墙。</p>
          </form>
        </section>
      )}

      {admin && (
        <section className="card border-brand/30">
          <div className="card-title">🛠 管理员</div>
          {pending.length > 0 && (
            <div className="mb-4">
              <p className="label">待确认的宣告</p>
              <ul className="space-y-2">
                {pending.map((c) => (
                  <li key={c.claimId} className="rounded-lg border border-line p-2">
                    <p className="text-sm font-medium">{c.playerName}</p>
                    {c.note && <p className="muted">{c.note}</p>}
                    <div className="mt-2 flex gap-2">
                      <form action={reviewClaim}>
                        <input type="hidden" name="claimId" value={c.claimId} />
                        <input type="hidden" name="decision" value="confirm" />
                        <input type="hidden" name="back" value={`/achievements/${ach.id}`} />
                        <button type="submit" className="btn btn-sm btn-primary">
                          确认
                        </button>
                      </form>
                      <form action={reviewClaim}>
                        <input type="hidden" name="claimId" value={c.claimId} />
                        <input type="hidden" name="decision" value="reject" />
                        <input type="hidden" name="back" value={`/achievements/${ach.id}`} />
                        <button type="submit" className="btn btn-sm btn-danger">
                          驳回
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {confirmed.length > 0 && (
            <div className="mb-4">
              <p className="label">改解锁时间</p>
              <ul className="space-y-2">
                {confirmed.map((c) => (
                  <li key={c.claimId} className="rounded-lg border border-line p-2">
                    <details>
                      <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{c.playerName}</span>
                        <span className="muted">{c.unlockedAtText ?? formatDay(c.unlockedAt)}</span>
                      </summary>
                      <form action={editClaimTime} className="mt-2 space-y-2">
                        <input type="hidden" name="claimId" value={c.claimId} />
                        <input type="hidden" name="back" value={`/achievements/${ach.id}`} />
                        <div className="flex flex-wrap gap-2">
                          <input
                            className="input flex-1"
                            type="date"
                            name="unlockedDay"
                            defaultValue={c.unlockedAt.slice(0, 10)}
                          />
                          <input
                            className="input flex-1"
                            name="unlockedAtText"
                            maxLength={20}
                            defaultValue={c.unlockedAtText ?? ""}
                            placeholder="日期不可考就写一句话"
                          />
                        </div>
                        <button type="submit" className="btn btn-sm btn-primary">
                          保存
                        </button>
                        <p className="muted">
                          写了右边那句话就以它为准，日期本身仍然留着；清空它就回到按日期显示。
                        </p>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form action={grantAchievement} className="space-y-2">
            <input type="hidden" name="achievementId" value={ach.id} />
            <input type="hidden" name="back" value={`/achievements/${ach.id}`} />
            <label className="label">直接授予给（昵称）</label>
            <div className="flex gap-2">
              <input className="input flex-1" name="nickname" maxLength={20} required />
              <button type="submit" className="btn btn-primary">
                授予
              </button>
            </div>
          </form>
        </section>
      )}

      <Link href="/achievements" className="btn btn-block">
        返回成就墙
      </Link>
    </div>
  );
}
