import Link from "next/link";
import { notFound } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import RarityBadge from "@/components/RarityBadge";
import RoleIcon from "@/components/RoleIcon";
import { formatDate, formatMd } from "@/lib/dates";
import {
  GAME_RESULT_LABEL,
  SESSION_LABEL,
  SIGNUP_LABEL,
  isFinished,
  isLate,
  isNoShow,
} from "@/lib/labels";
import { getPlayerProfile } from "@/lib/queries";
import { parseAliases } from "@/lib/players";
import { RARITIES, type Session } from "@/db/schema";

/** 代表成就：稀有度最高的那个，同档取最早解锁的（issue #28） */
function signature<T extends { rarity: string; unlockedAt: string }>(unlocks: T[]): T | null {
  const rank = (r: string) => RARITIES.indexOf(r as (typeof RARITIES)[number]);
  return (
    [...unlocks].sort((a, b) => rank(b.rarity) - rank(a.rarity) || a.unlockedAt.localeCompare(b.unlockedAt))[0] ??
    null
  );
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getPlayerProfile(Number(id));
  if (!profile) notFound();
  const { player, attendance, played, unlocks, points } = profile;
  const aliases = parseAliases(player.aliases);

  const attended = attendance.filter((a) => a.attended !== "none").length;
  const noShow = attendance.filter(
    (a) => isFinished(a.date, a.eventStatus) && isNoShow(a),
  ).length;
  // 鸽和迟到分开数：迟到的人到了，不算鸽（issue #1）
  const late = attendance.filter((a) => isLate(a)).length;
  const sig = signature(unlocks);

  return (
    <div className="space-y-4">
      {/* 镇民档案（issue #28）：蜡封头像 + 名字 + 代表成就，双线边框像一张档案卡 */}
      <section className="dossier">
        <div className="flex items-start gap-4">
          <div className="seal" aria-hidden="true">
            {[...player.name][0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Townsfolk Dossier · 镇民档案 No. {String(player.id).padStart(3, "0")}</p>
            <h1 className="display text-2xl leading-tight">
              {player.name}
              {player.archived === 1 && <span className="badge badge-plain ml-2 align-middle">已归档</span>}
            </h1>
            {aliases.length > 0 && (
              <p className="mt-1 text-sm text-ink-2">
                也可以叫：
                {aliases.map((a) => (
                  <span key={a} className="badge badge-plain ml-1">
                    {a}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 rounded-lg border border-line bg-surface-2/60 py-3 text-center">
          <div>
            <p className="font-serif text-xl font-semibold text-brand-bright">{attended}</p>
            <p className="text-xs text-muted">到场</p>
          </div>
          <div>
            <p className="font-serif text-xl font-semibold text-ink">{played.length}</p>
            <p className="text-xs text-muted">局数</p>
          </div>
          <div>
            <p className="font-serif text-xl font-semibold text-ink">{unlocks.length}</p>
            <p className="text-xs text-muted">成就</p>
          </div>
          <div>
            <p className="font-serif text-xl font-semibold text-legend">{points}</p>
            <p className="text-xs text-muted">积分</p>
          </div>
        </div>

        {(sig || noShow > 0 || late > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {sig && (
              <Link
                href={`/achievements/${sig.achievementId}`}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2/60 py-1.5 pr-3 pl-2 text-sm"
              >
                <RoleIcon role={sig.role} className="size-6" />
                <span>
                  <span className="text-xs text-faint">代表成就 · </span>
                  <span className="font-medium text-ink">{sig.achievementName}</span>
                </span>
                <RarityBadge rarity={sig.rarity} />
              </Link>
            )}
            {noShow > 0 && (
              <span className="badge border-danger/30 bg-danger-soft text-danger">鸽 {noShow} 次</span>
            )}
            {late > 0 && (
              <span className="badge border-warn/30 bg-warn-soft text-warn">迟到 {late} 次</span>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-title">📅 出席记录</div>
        {attendance.length === 0 ? (
          <EmptyState art="ghost">还没有出席记录，这位镇民尚未现身。</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>报名</th>
                  <th>出席</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/events/${a.eventId}`} className="font-medium">
                        {formatDate(a.date)}
                      </Link>
                    </td>
                    <td className="text-ink-2">{SIGNUP_LABEL[a.signup as Session]}</td>
                    <td
                      className={
                        a.attended === "none" && isFinished(a.date, a.eventStatus)
                          ? "text-danger"
                          : "text-ink-2"
                      }
                    >
                      {SESSION_LABEL[a.attended as Session]}
                      {isLate(a) && <span className="ml-1 text-warn">迟到</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-title">🎲 参与的局</div>
        {played.length === 0 ? (
          <EmptyState art="dice">还没有对局记录，骰子还没掷过。</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>剧本</th>
                  <th>角色</th>
                  <th>结果</th>
                </tr>
              </thead>
              <tbody>
                {played.map((g) => (
                  <tr key={`${g.gameId}-${g.asStoryteller ? "st" : "p"}`}>
                    <td>
                      <Link href={`/games/${g.gameId}`}>{formatMd(g.date)}</Link>
                    </td>
                    <td>{g.scriptName}</td>
                    <td className={g.asStoryteller ? "text-brand-bright" : ""}>{g.roleName || "—"}</td>
                    <td className="text-muted">{GAME_RESULT_LABEL[g.result]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-title">🏆 已解锁成就（共 {points} 分）</div>
        {unlocks.length === 0 ? (
          <EmptyState art="shelf">
            奖章架还空着。
            <Link href="/achievements" className="link ml-1">
              去成就墙看看能干点什么
            </Link>
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {unlocks.map((u) => (
              <li key={u.claimId}>
                <Link href={`/achievements/${u.achievementId}`} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">
                    {u.achievementName}
                  </span>
                  <RarityBadge rarity={u.rarity} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
