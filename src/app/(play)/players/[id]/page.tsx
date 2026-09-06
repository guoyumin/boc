import Link from "next/link";
import { notFound } from "next/navigation";
import RarityBadge from "@/components/RarityBadge";
import { formatDate, formatMd } from "@/lib/dates";
import {
  GAME_RESULT_LABEL,
  SESSION_LABEL,
  SIGNUP_LABEL,
  isFinished,
  isNoShow,
} from "@/lib/labels";
import { getPlayerProfile } from "@/lib/queries";
import { parseAliases } from "@/lib/players";
import type { Session } from "@/db/schema";

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

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="card-title">
          <span className="text-lg">👤 {player.name}</span>
          {player.archived === 1 && <span className="badge badge-plain">已归档</span>}
        </div>
        {aliases.length > 0 && (
          <p className="mb-3 text-sm text-ink-2">
            也可以叫：
            {aliases.map((a) => (
              <span key={a} className="badge badge-plain ml-1">
                {a}
              </span>
            ))}
          </p>
        )}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xl font-semibold text-brand-bright">{attended}</p>
            <p className="muted">到场</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-ink-2">{played.length}</p>
            <p className="muted">局数</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-ink-2">{unlocks.length}</p>
            <p className="muted">成就</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-warn">{points}</p>
            <p className="muted">积分</p>
          </div>
        </div>
        {noShow > 0 && <p className="muted mt-2">报名没到 {noShow} 次 🕊️</p>}
      </section>

      <section className="card">
        <div className="card-title">📅 出席记录</div>
        {attendance.length === 0 ? (
          <p className="muted">还没有记录。</p>
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
                          ? "text-warn"
                          : "text-ink-2"
                      }
                    >
                      {SESSION_LABEL[a.attended as Session]}
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
          <p className="muted">还没有对局记录。</p>
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
          <p className="muted">还没有成就，去成就墙看看能干点什么。</p>
        ) : (
          <ul className="space-y-2">
            {unlocks.map((u) => (
              <li key={u.claimId}>
                <Link href={`/achievements/${u.achievementId}`} className="flex items-center gap-2 text-sm">
                  <span className="text-lg">{u.icon}</span>
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
