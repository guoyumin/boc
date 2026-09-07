import Link from "next/link";
import NavIcon from "@/components/NavIcon";
import RarityBadge from "@/components/RarityBadge";
import { getUser } from "@/lib/auth";
import { formatMd, weekdayCn } from "@/lib/dates";
import {
  EVENT_STATUS_CLASS,
  EVENT_STATUS_LABEL,
  SLOT_SHORT,
  isFinished,
  isNoShow,
} from "@/lib/labels";
import {
  getOpenPoll,
  getPollView,
  getSignups,
  latestEvent,
  nextEvent,
  recentUnlocks,
} from "@/lib/queries";

/** "2026-09-06" → "09.06"，大字号的日期用 */
function bigDay(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${m}.${d}`;
}

export default async function HomePage() {
  const me = await getUser();
  const poll = getOpenPoll();
  const pollView = poll ? getPollView(poll.id) : null;
  const upcoming = nextEvent();
  const last = latestEvent();
  // 有下一场就展示下一场，没有就回顾最近一场
  const event = upcoming ?? last;
  const signups = event ? getSignups(event.id) : [];
  const unlocks = recentUnlocks(6);

  const attended = signups.filter((s) => s.attended !== "none").length;
  const noShow = signups.filter((s) => isNoShow(s)).length;
  const signedUp = signups.filter((s) => s.signup !== "none").length;
  const finished = event ? isFinished(event.date, event.status) : false;

  return (
    <div className="space-y-4">
      <header className="mb-2">
        <h1 className="display text-3xl sm:text-4xl">小镇广场</h1>
        <p className="muted mt-1">
          {me ? `欢迎回来，${me.playerName ?? me.username}。` : "填个昵称就能报名，不用注册。"}
        </p>
      </header>

      {/* 桌面上时间投票和活动并排，手机上依次往下排 */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="card">
          {pollView ? (
            <>
              <div className="card-title">
                <span className="inline-flex items-center gap-2">
                  <NavIcon name="calendar" className="size-[18px]" />
                  时间投票
                </span>
                <span className="badge bg-ok-soft text-ok border-ok/40">进行中</span>
              </div>
              <p className="display text-2xl">{pollView.poll.title}</p>
              {pollView.poll.note && <p className="muted mt-1">{pollView.poll.note}</p>}

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {pollView.slots.map((s) => {
                  const n = pollView.counts[s] ?? 0;
                  const top = n === pollView.best && pollView.best > 0;
                  return (
                    <div
                      key={s}
                      className={`rounded-lg border px-2 py-3 text-center ${
                        top ? "border-brand-line bg-brand-soft" : "border-line"
                      }`}
                    >
                      <p className={`text-xs ${top ? "text-brand-bright" : "text-muted"}`}>
                        {SLOT_SHORT[s]}
                      </p>
                      <p className="mt-1">
                        <span className={`display text-xl ${top ? "text-brand-bright" : ""}`}>{n}</span>
                        <span className="ml-0.5 text-xs text-faint">人</span>
                      </p>
                    </div>
                  );
                })}
              </div>

              <p className="muted mt-3">{pollView.filledCount} 人已填写</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Link href={`/polls/${pollView.poll.id}#fill`} className="btn btn-primary">
                  填写我的时间 →
                </Link>
                <Link href={`/polls/${pollView.poll.id}`} className="link text-sm">
                  查看完整结果 ↗
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="card-title">
                <span className="inline-flex items-center gap-2">
                  <NavIcon name="calendar" className="size-[18px]" />
                  时间投票
                </span>
              </div>
              <p className="muted">现在没有进行中的时间投票，等管理员发起。</p>
            </>
          )}
        </section>

        <section className="card">
          <div className="card-title">
            <span className="inline-flex items-center gap-2">
              <NavIcon name="dice" className="size-[18px]" />
              {upcoming ? "下一次活动" : "最近一次活动"}
            </span>
            {event && (
              <span className={`badge ${EVENT_STATUS_CLASS[event.status] ?? "badge-plain"}`}>
                {EVENT_STATUS_LABEL[event.status]}
              </span>
            )}
          </div>
          {event ? (
            <>
              <p className="flex items-baseline gap-2">
                <span className="display text-4xl">{bigDay(event.date)}</span>
                <span className="text-muted">{weekdayCn(event.date)}</span>
              </p>
              <p className="mt-1 font-medium text-ink">{event.title}</p>
              {event.location && <p className="muted mt-0.5">{event.location}</p>}

              <div className="mt-4 grid grid-cols-2 divide-x divide-line border-t border-line pt-3">
                <div className="text-center">
                  <p className="display text-2xl">{finished ? attended : signedUp}</p>
                  <p className="text-xs text-muted">{finished ? "到场人数" : "已报名"}</p>
                </div>
                <div className="text-center">
                  <p className="display text-2xl">{finished ? noShow : signups.length - signedUp}</p>
                  <p className="text-xs text-muted">{finished ? "鸽" : "未定"}</p>
                </div>
              </div>

              <Link href={`/events/${event.id}`} className="link mt-3 inline-block text-sm">
                {finished ? "查看活动详情" : "去报名"} ↗
              </Link>
            </>
          ) : (
            <p className="muted">还没有排下一场。</p>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-title">
          <span className="inline-flex items-center gap-2">
            <NavIcon name="trophy" className="size-[18px]" />
            最近解锁
          </span>
          <Link href="/achievements" className="text-xs text-brand-bright">
            成就墙 →
          </Link>
        </div>
        {unlocks.length === 0 ? (
          <p className="muted">还没有确认的成就。</p>
        ) : (
          <ul>
            {unlocks.map((u) => (
              <li key={u.claimId} className="border-b border-line/60 last:border-0">
                <Link
                  href={`/achievements/${u.achievementId}`}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs text-muted">
                    {u.playerName.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{u.playerName}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-2">{u.achievementName}</span>
                  <RarityBadge rarity={u.rarity} />
                  <span className="shrink-0 text-faint">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {last && upcoming && last.id !== upcoming.id && (
        <Link href={`/events/${last.id}`} className="muted block text-center">
          上一场：{formatMd(last.date)} {last.title} →
        </Link>
      )}
    </div>
  );
}
