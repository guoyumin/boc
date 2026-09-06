import Link from "next/link";
import Flash from "@/components/Flash";
import GuestMe from "@/components/GuestMe";
import RarityBadge from "@/components/RarityBadge";
import { cancelAdminRequest, logoutAction, requestAdmin, updateMyProfile } from "@/actions/account";
import { getUser } from "@/lib/auth";
import { formatDate, formatDay } from "@/lib/dates";
import {
  ATTEND_OPTIONS,
  SESSION_LABEL,
  SIGNUP_LABEL,
  isCancelled,
  isFinished,
  isNoShow,
  isWaived,
} from "@/lib/labels";
import { getPlayerProfile } from "@/lib/queries";
import { parseAliases } from "@/lib/players";

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const me = await getUser();

  // 没登录：保持原来的「填昵称找到自己」的路子，注册完全是可选的
  if (!me) return <GuestMe err={sp.err} ok={sp.ok} />;

  const profile = me.playerId ? getPlayerProfile(me.playerId) : null;
  const aliases = profile ? parseAliases(profile.player.aliases) : [];
  const noShows = (profile?.attendance ?? []).filter(
    (a) => isFinished(a.date, a.eventStatus) && isNoShow(a),
  );
  const attended = (profile?.attendance ?? []).filter((a) => a.attended !== "none");
  const upcoming = (profile?.attendance ?? []).filter(
    (a) => !isFinished(a.date, a.eventStatus) && a.signup !== "none" && !isCancelled(a),
  );

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />

      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{profile?.player.name ?? me.username}</h1>
            <p className="muted">
              账号 {me.username}
              {me.role !== "member" && ` · ${me.role === "owner" ? "初始管理员" : "管理员"}`}
            </p>
          </div>
          {profile && (
            <Link href={`/players/${profile.player.id}`} className="btn btn-sm shrink-0">
              我的主页
            </Link>
          )}
        </div>
        {profile && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-stone-50 p-2">
              <div className="text-lg font-semibold">{attended.length}</div>
              <div className="text-xs text-stone-500">到场</div>
            </div>
            <div className="rounded-lg bg-stone-50 p-2">
              <div className="text-lg font-semibold">{profile.unlocks.length}</div>
              <div className="text-xs text-stone-500">成就 · {profile.points} 分</div>
            </div>
            <div className="rounded-lg bg-stone-50 p-2">
              <div className="text-lg font-semibold">{noShows.length}</div>
              <div className="text-xs text-stone-500">鸽</div>
            </div>
          </div>
        )}
      </div>

      {me.role !== "member" && (
        <Link href="/admin" className="card block border-brand/30 bg-brand-light/40">
          <p className="font-semibold text-brand">进入管理后台 →</p>
          <p className="muted mt-0.5">发起时间投票、建活动、录出席、确认成就。</p>
        </Link>
      )}

      {/* 昵称与别名（需求 f） */}
      {profile && (
        <section className="card">
          <div className="card-title">🏷 昵称与别名</div>
          <p className="muted mb-2">
            别名是给别人认你用的：真名、英文名、群里的旧昵称都可以写进来。
            接龙里出现这些名字时会自动认到你头上。
          </p>
          <form action={updateMyProfile} className="space-y-3">
            <div>
              <label className="label" htmlFor="nickname">
                昵称（主要显示的名字）
              </label>
              <input
                id="nickname"
                className="input"
                name="nickname"
                defaultValue={profile.player.name}
                maxLength={20}
                required
              />
            </div>
            <div>
              <label className="label">别名（最多 5 个，留空就是不要）</label>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <input
                    key={i}
                    className="input"
                    name="alias"
                    defaultValue={aliases[i] ?? ""}
                    maxLength={20}
                    placeholder={i === 0 ? "比如你的真名，方便大家称呼" : "别名"}
                  />
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              保存
            </button>
          </form>
        </section>
      )}

      {/* 我的报名 */}
      <section className="card">
        <div className="card-title">📋 我报名的活动</div>
        {upcoming.length === 0 ? (
          <p className="muted">
            还没有报名中的活动。<Link href="/events" className="link">去看看</Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id}>
                <Link href={`/events/${a.eventId}`} className="flex items-center justify-between gap-2">
                  <span className="truncate">{formatDate(a.date)} · {a.title}</span>
                  <span className="badge badge-plain shrink-0">{SIGNUP_LABEL[a.signup as never]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 历史 */}
      <section className="card">
        <div className="card-title">🕘 出勤记录</div>
        {(profile?.attendance.length ?? 0) === 0 ? (
          <p className="muted">还没有记录。</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {profile!.attendance.slice(0, 15).map((a) => {
              const finished = isFinished(a.date, a.eventStatus);
              return (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <Link href={`/events/${a.eventId}`} className="truncate">
                    {formatDate(a.date)}
                  </Link>
                  <span className="shrink-0 text-xs text-stone-500">
                    报名 {SIGNUP_LABEL[a.signup as never]} · 到场{" "}
                    {ATTEND_OPTIONS.find((o) => o.value === a.attended)?.label ?? SESSION_LABEL.none}
                    {finished && isNoShow(a) && <span className="ml-1 text-amber-600">鸽</span>}
                    {finished && isWaived(a) && <span className="ml-1 text-emerald-600">已免</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 成就 */}
      <section className="card">
        <div className="card-title">
          <span>🏆 我的成就（{profile?.unlocks.length ?? 0}）</span>
          <Link href="/achievements" className="text-xs text-brand">
            成就墙 →
          </Link>
        </div>
        {(profile?.unlocks.length ?? 0) === 0 ? (
          <p className="muted">还没有已确认的成就。去成就墙上宣告一个。</p>
        ) : (
          <ul className="space-y-1">
            {profile!.unlocks.map((u) => (
              <li key={u.claimId} className="flex items-center gap-2 text-sm">
                <span>{u.icon}</span>
                <Link href={`/achievements/${u.achievementId}`} className="min-w-0 flex-1 truncate">
                  {u.achievementName}
                </Link>
                <RarityBadge rarity={u.rarity} />
                <span className="shrink-0 text-xs text-stone-400">
                  {u.unlockedAtText || formatDay(u.unlockedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 管理员申请 */}
      {me.role === "member" && (
        <section className="card">
          <div className="card-title">👮 申请当管理员</div>
          {me.adminRequest ? (
            <div className="space-y-2">
              <p className="muted">申请已提交，等初始管理员批准：「{me.adminRequest}」</p>
              <form action={cancelAdminRequest}>
                <button type="submit" className="btn btn-sm">
                  撤回申请
                </button>
              </form>
            </div>
          ) : (
            <form action={requestAdmin} className="space-y-2">
              <p className="muted">
                管理员可以发起时间投票、建活动、录出席、确认成就。批准后你这个账号就有权限了。
              </p>
              <textarea
                className="input"
                name="note"
                rows={2}
                maxLength={200}
                placeholder="你是谁，为什么需要管理权限"
                required
              />
              <button type="submit" className="btn btn-block">
                提交申请
              </button>
            </form>
          )}
        </section>
      )}

      <section className="card">
        <div className="card-title">账号</div>
        <div className="flex gap-2">
          <Link href="/me/password" className="btn">
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
