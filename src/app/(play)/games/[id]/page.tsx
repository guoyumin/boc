import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import LineupEditor from "@/components/LineupEditor";
import NicknameInput from "@/components/NicknameInput";
import { deleteGame, updateGame } from "@/actions/games";
import { getUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { GAME_RESULT_CLASS, GAME_RESULT_LABEL, SESSION_LABEL } from "@/lib/labels";
import { getEvent, getGame, getSignups, recentScripts } from "@/lib/queries";
import type { Session } from "@/db/schema";

export default async function GameDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const game = getGame(Number(id));
  if (!game) notFound();
  const event = getEvent(game.eventId);
  if (!event) notFound();

  const signups = getSignups(event.id);
  const nameOptions = [...new Set([...signups.map((s) => s.name), ...game.lineup.map((l) => l.name)])];
  const scripts = recentScripts();
  const me = await getUser();
  const myName = me?.playerName ?? "";

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />

      <div className="flex items-center justify-between">
        <h1 className="page-title">
          第 {game.seq} 局 · {game.scriptName}
        </h1>
        <Link href={`/events/${event.id}`} className="btn btn-sm">
          返回活动
        </Link>
      </div>

      <section className="card">
        <div className="card-title">
          <span>{formatDate(event.date)} · {SESSION_LABEL[game.session as Session]}</span>
          <span className={`badge ${GAME_RESULT_CLASS[game.result]}`}>{GAME_RESULT_LABEL[game.result]}</span>
        </div>
        <p className="text-sm text-ink-2">
          说书人：
          {game.storytellers.length
            ? game.storytellers.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && "、"}
                  <Link href={`/players/${s.id}`} className="link">
                    {s.name}
                  </Link>
                </span>
              ))
            : "未记录"}
        </p>
        {game.note && <p className="muted mt-1">📝 {game.note}</p>}
        {game.recorderName && <p className="muted mt-1">记录者：{game.recorderName}</p>}
      </section>

      <section className="card">
        <div className="card-title">玩家与角色（{game.lineup.length} 人）</div>
        {game.lineup.length === 0 ? (
          <p className="muted">还没填玩家。</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>座</th>
                  <th>昵称</th>
                  <th>角色</th>
                </tr>
              </thead>
              <tbody>
                {game.lineup.map((l) => (
                  <tr key={l.id}>
                    <td className="text-faint">{l.seat ?? ""}</td>
                    <td>
                      <Link href={`/players/${l.playerId}`} className="font-medium">
                        {l.name}
                      </Link>
                    </td>
                    <td>{l.roleName || <span className="text-faint">未记录</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-brand-bright">✏️ 编辑这一局</summary>
          <form action={updateGame} className="mt-3 space-y-3">
            <input type="hidden" name="gameId" value={game.id} />
            <datalist id="script-names">
              {scripts.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">场次</label>
                <select className="input" name="session" defaultValue={game.session}>
                  <option value="afternoon">下午</option>
                  <option value="evening">晚上</option>
                </select>
              </div>
              <div>
                <label className="label">第几局</label>
                <input className="input" name="seq" type="number" min={1} defaultValue={game.seq} />
              </div>
            </div>
            <div>
              <label className="label">剧本名</label>
              <input className="input" name="scriptName" list="script-names" defaultValue={game.scriptName} required />
            </div>
            <div>
              <label className="label">说书人（逗号或换行分开）</label>
              <input
                className="input"
                name="storytellers"
                defaultValue={game.storytellers.map((s) => s.name).join("、")}
              />
            </div>
            <div>
              <label className="label">结果</label>
              <select className="input" name="result" defaultValue={game.result}>
                <option value="unknown">未记录</option>
                <option value="good">善良胜</option>
                <option value="evil">邪恶胜</option>
              </select>
            </div>
            <div>
              <label className="label">备注</label>
              <textarea className="input" name="note" rows={2} defaultValue={game.note ?? ""} />
            </div>
            <div>
              <span className="label">玩家与角色</span>
              <LineupEditor
                initial={game.lineup.map((l) => ({
                  name: l.name,
                  roleName: l.roleName,
                  seat: l.seat ? String(l.seat) : "",
                }))}
                nameOptions={nameOptions}
              />
            </div>
            <div>
              <label className="label">你的昵称（记录者本人或管理员才能改）</label>
              <NicknameInput defaultValue={myName} />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              保存
            </button>
          </form>
        </details>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-danger">🗑 删除这一局</summary>
          <form action={deleteGame} className="mt-3 space-y-2">
            <input type="hidden" name="gameId" value={game.id} />
            <div>
              <label className="label">你的昵称</label>
              <NicknameInput defaultValue={myName} />
            </div>
            <ConfirmSubmit message="确定删掉这一局？">确认删除</ConfirmSubmit>
          </form>
        </details>
      </section>
    </div>
  );
}
