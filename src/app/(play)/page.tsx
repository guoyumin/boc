import Link from "next/link";
import PollFillForm from "@/components/PollFillForm";
import { formatDate, formatMd } from "@/lib/dates";
import RarityBadge from "@/components/RarityBadge";
import {
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

export default async function HomePage() {
  const poll = getOpenPoll();
  const pollView = poll ? getPollView(poll.id) : null;
  const upcoming = nextEvent();
  const last = latestEvent();
  const recent = last && last.id !== upcoming?.id ? last : null;
  const unlocks = recentUnlocks(6);

  const upcomingSignups = upcoming ? getSignups(upcoming.id) : [];
  const lastSignups = recent ? getSignups(recent.id) : [];

  return (
    <div className="space-y-4">
      {pollView ? (
        <section className="card">
          <div className="card-title">
            <span>🗓 {pollView.poll.title}</span>
            <span className="badge badge-brand">进行中</span>
          </div>
          {pollView.poll.note && <p className="muted mb-3">{pollView.poll.note}</p>}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {pollView.slots.map((s) => (
              <span
                key={s}
                className={`badge ${
                  pollView.counts[s] === pollView.best && pollView.best > 0 ? "badge-brand" : "badge-plain"
                }`}
              >
                {SLOT_SHORT[s]} {pollView.counts[s] ?? 0}人
              </span>
            ))}
          </div>
          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-bright">
              ✍️ 填我的时间（{pollView.responses.length} 人已填）
            </summary>
            <div className="mt-3">
              <PollFillForm pollId={pollView.poll.id} slots={pollView.slots} />
            </div>
          </details>
          <Link href={`/polls/${pollView.poll.id}`} className="btn btn-block mt-3">
            看完整结果表
          </Link>
        </section>
      ) : (
        <section className="card">
          <div className="card-title">🗓 时间投票</div>
          <p className="muted">现在没有进行中的时间投票，等管理员发起。</p>
        </section>
      )}

      {upcoming && (
        <section className="card">
          <div className="card-title">
            <span>🎲 下一次活动</span>
            <span className="badge badge-plain">{EVENT_STATUS_LABEL[upcoming.status]}</span>
          </div>
          <Link href={`/events/${upcoming.id}`} className="block">
            <p className="text-lg font-semibold text-ink">{formatDate(upcoming.date)}</p>
            <p className="muted mt-0.5">
              {[upcoming.location, upcoming.startTime].filter(Boolean).join(" · ") || upcoming.title}
            </p>
            <p className="mt-2 text-sm text-ink-2">
              已报名 {upcomingSignups.filter((s) => s.signup !== "none").length} 人
            </p>
          </Link>
          <Link href={`/events/${upcoming.id}`} className="btn btn-primary btn-block mt-3">
            去报名
          </Link>
        </section>
      )}

      {recent && (
        <section className="card">
          <div className="card-title">
            <span>📋 最近一次活动</span>
            <span className="badge badge-plain">{EVENT_STATUS_LABEL[recent.status]}</span>
          </div>
          <Link href={`/events/${recent.id}`} className="block">
            <p className="font-semibold text-ink">{formatMd(recent.date)} · {recent.title}</p>
            <p className="muted mt-1">
              到场 {lastSignups.filter((s) => s.attended !== "none").length} 人
              {isFinished(recent.date, recent.status) &&
                ` · 鸽 ${lastSignups.filter((s) => isNoShow(s)).length} 人`}
            </p>
          </Link>
        </section>
      )}

      <section className="card">
        <div className="card-title">
          <span>🏆 最近解锁</span>
          <Link href="/achievements" className="text-xs text-brand-bright">
            成就墙 →
          </Link>
        </div>
        {unlocks.length === 0 ? (
          <p className="muted">还没有确认的成就。</p>
        ) : (
          <ul className="space-y-2">
            {unlocks.map((u) => (
              <li key={u.claimId} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{u.icon}</span>
                <Link href={`/players/${u.playerId}`} className="font-medium text-ink">
                  {u.playerName}
                </Link>
                <span className="text-muted">解锁了</span>
                <Link href={`/achievements/${u.achievementId}`} className="text-brand-bright">
                  {u.achievementName}
                </Link>
                <RarityBadge rarity={u.rarity} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
