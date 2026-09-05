import Link from "next/link";
import { notFound } from "next/navigation";
import AttendanceButtons from "@/components/AttendanceButtons";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import CopyButton from "@/components/CopyButton";
import Flash from "@/components/Flash";
import NicknameInput from "@/components/NicknameInput";
import { deleteEvent, updateEvent } from "@/actions/events";
import { createGame } from "@/actions/games";
import { addAttendee, cancelSignup, removeSignup, selfSignup } from "@/actions/signups";
import { getAdmin } from "@/lib/auth";
import { formatDate, formatMd } from "@/lib/dates";
import { buildJielong } from "@/lib/jielong";
import {
  EVENT_STATUS_LABEL,
  GAME_RESULT_CLASS,
  GAME_RESULT_LABEL,
  SESSION_LABEL,
  SESSION_OPTIONS,
  SIGNUP_LABEL,
  isFinished,
  isNoShow,
  isPartial,
  isWalkIn,
} from "@/lib/labels";
import { claimsForEvent, getEvent, getGames, getSignups, recentScripts } from "@/lib/queries";
import type { Session } from "@/db/schema";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const eventId = Number(id);
  const event = getEvent(eventId);
  if (!event) notFound();

  const admin = await getAdmin();
  const signups = getSignups(eventId);
  const games = getGames(eventId);
  const unlocked = claimsForEvent(eventId);
  const scripts = recentScripts();

  const finished = isFinished(event.date, event.status);
  const sessionOptions = SESSION_OPTIONS.filter(
    (o) =>
      (o.value === "afternoon" && event.hasAfternoon === 1) ||
      (o.value === "evening" && event.hasEvening === 1) ||
      (o.value === "full" && event.hasAfternoon === 1 && event.hasEvening === 1),
  );
  const jielongText = buildJielong(
    `${formatMd(event.date)} 血染钟楼接龙${event.startTime ? `（${event.startTime}）` : ""}`,
    signups
      .filter((s) => s.signup !== "none")
      .map((s) => ({ name: s.name, note: s.signupNote ?? SIGNUP_LABEL[s.signup as Session] })),
  );

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />

      {/* 基本信息 */}
      <section className="card">
        <div className="card-title">
          <span>{formatDate(event.date)}</span>
          <span className="badge badge-plain">{EVENT_STATUS_LABEL[event.status]}</span>
        </div>
        <p className="font-medium text-stone-800">{event.title}</p>
        <dl className="mt-2 space-y-1 text-sm text-stone-600">
          {event.location && <div>📍 {event.location}</div>}
          {event.startTime && <div>⏰ {event.startTime}</div>}
          <div>
            🕑 场次：
            {[event.hasAfternoon === 1 ? "下午" : null, event.hasEvening === 1 ? "晚上" : null]
              .filter(Boolean)
              .join(" + ") || "—"}
          </div>
          {event.note && <div className="text-stone-500">📝 {event.note}</div>}
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={jielongText} label="复制接龙" className="btn btn-sm" />
          {admin && (
            <Link href={`/events/${event.id}/jielong`} className="btn btn-sm btn-primary">
              粘贴接龙
            </Link>
          )}
        </div>
      </section>

      {/* 报名 / 出席 */}
      <section className="card">
        <div className="card-title">
          <span>
            👥 报名 / 出席（报名 {signups.filter((s) => s.signup !== "none").length} · 到场{" "}
            {signups.filter((s) => s.attended !== "none").length}）
          </span>
        </div>
        {signups.length === 0 ? (
          <p className="muted">还没有人报名。</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white">昵称</th>
                  <th>报名</th>
                  <th>出席</th>
                  <th>备注</th>
                  {admin && <th />}
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => (
                  <tr key={s.id}>
                    <td className="sticky left-0 bg-white">
                      <Link href={`/players/${s.playerId}`} className="font-medium">
                        {s.name}
                      </Link>
                      {finished && isNoShow(s.signup, s.attended) && (
                        <span className="badge ml-1 border-amber-200 bg-amber-50 text-amber-700">鸽</span>
                      )}
                      {finished && isPartial(s.signup, s.attended) && (
                        <span className="badge ml-1 badge-plain">只到一场</span>
                      )}
                      {finished && isWalkIn(s.signup, s.attended) && (
                        <span className="badge ml-1 badge-plain">未报名到场</span>
                      )}
                    </td>
                    <td className="text-stone-600">{SIGNUP_LABEL[s.signup as Session]}</td>
                    <td>
                      {admin ? (
                        <AttendanceButtons signupId={s.id} value={s.attended} />
                      ) : (
                        <span className={s.attended === "none" ? "text-stone-400" : "text-stone-700"}>
                          {SESSION_LABEL[s.attended as Session]}
                        </span>
                      )}
                    </td>
                    <td className="max-w-[9rem] truncate text-stone-500">{s.signupNote ?? ""}</td>
                    {admin && (
                      <td>
                        <form action={removeSignup}>
                          <input type="hidden" name="signupId" value={s.id} />
                          <input type="hidden" name="eventId" value={event.id} />
                          <ConfirmSubmit message={`把 ${s.name} 从名单里移除？`} className="btn btn-sm btn-danger">
                            移除
                          </ConfirmSubmit>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {event.status !== "cancelled" && (
          <details className="mt-4 rounded-lg border border-stone-200 p-3" open={signups.length === 0}>
            <summary className="cursor-pointer text-sm font-medium text-brand">✍️ 我要报名</summary>
            <form action={selfSignup} className="mt-3 space-y-3">
              <input type="hidden" name="eventId" value={event.id} />
              <div>
                <label className="label">你的昵称</label>
                <NicknameInput />
              </div>
              <div>
                <label className="label">来哪场</label>
                <select className="input" name="session" defaultValue={sessionOptions.at(-1)?.value ?? "full"}>
                  {sessionOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">备注（可选）</label>
                <input className="input" name="note" maxLength={100} placeholder="晚上补位 / 会迟到半小时" />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                报名 / 更新
              </button>
            </form>
            <form action={cancelSignup} className="mt-3 flex items-end gap-2">
              <input type="hidden" name="eventId" value={event.id} />
              <div className="flex-1">
                <label className="label">要取消报名？填昵称</label>
                <NicknameInput name="nickname" />
              </div>
              <ConfirmSubmit message="确定取消报名？">取消报名</ConfirmSubmit>
            </form>
          </details>
        )}

        {admin && (
          <details className="mt-3 rounded-lg border border-brand/30 p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand">🛠 添加临时来的玩家</summary>
            <form action={addAttendee} className="mt-3 space-y-3">
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="signup" value="none" />
              <div>
                <label className="label">昵称</label>
                <input className="input" name="nickname" maxLength={20} required />
              </div>
              <div>
                <label className="label">出席</label>
                <select className="input" name="attended" defaultValue="full">
                  {SESSION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                加入出席表
              </button>
            </form>
          </details>
        )}
      </section>

      {/* 游戏记录 */}
      <section className="card">
        <div className="card-title">🎲 游戏记录（{games.length} 局）</div>
        {games.length === 0 ? (
          <p className="muted">还没有记录。谁说书谁来记一下。</p>
        ) : (
          <ul className="space-y-2">
            {games.map((g) => (
              <li key={g.id}>
                <Link href={`/games/${g.id}`} className="block rounded-lg border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-stone-800">
                      第 {g.seq} 局 · {g.scriptName}
                    </span>
                    <span className={`badge ${GAME_RESULT_CLASS[g.result]}`}>
                      {GAME_RESULT_LABEL[g.result]}
                    </span>
                  </div>
                  <p className="muted mt-1">
                    {SESSION_LABEL[g.session as Session]} · 说书人{" "}
                    {g.storytellers.map((s) => s.name).join("、") || "未记录"} · {g.lineup.length} 人
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 rounded-lg border border-stone-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-brand">＋ 添加一局</summary>
          <form action={createGame} className="mt-3 space-y-3">
            <input type="hidden" name="eventId" value={event.id} />
            <datalist id="script-names">
              {scripts.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <div>
              <label className="label">场次</label>
              <select className="input" name="session" defaultValue={event.hasAfternoon ? "afternoon" : "evening"}>
                {event.hasAfternoon === 1 && <option value="afternoon">下午</option>}
                {event.hasEvening === 1 && <option value="evening">晚上</option>}
              </select>
            </div>
            <div>
              <label className="label">剧本名</label>
              <input className="input" name="scriptName" list="script-names" required placeholder="暗流涌动" />
            </div>
            <div>
              <label className="label">说书人（多人用逗号或换行分开）</label>
              <input className="input" name="storytellers" placeholder="清扬, Crystal🍀" />
            </div>
            <div>
              <label className="label">结果</label>
              <select className="input" name="result" defaultValue="unknown">
                <option value="unknown">未记录</option>
                <option value="good">善良胜</option>
                <option value="evil">邪恶胜</option>
              </select>
            </div>
            <div>
              <label className="label">备注（可选）</label>
              <input className="input" name="note" maxLength={200} />
            </div>
            <div>
              <label className="label">记录者昵称</label>
              <NicknameInput />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              建这一局，然后填玩家和角色
            </button>
          </form>
        </details>
      </section>

      {/* 文件（MVP 再做） */}
      <section className="card">
        <div className="card-title">📎 文件</div>
        <p className="muted">
          板子图片和剧本 JSON 的上传功能在 MVP 阶段补充。现在先在微信群里传。
        </p>
      </section>

      {/* 本次解锁的成就 */}
      <section className="card">
        <div className="card-title">🏆 本次解锁的成就</div>
        {unlocked.length === 0 ? (
          <p className="muted">这次还没有确认的成就。</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {unlocked.map((u) => (
              <li key={u.claimId} className="flex items-center gap-2">
                <span>{u.icon}</span>
                <Link href={`/players/${u.playerId}`} className="font-medium">
                  {u.playerName}
                </Link>
                <Link href={`/achievements/${u.achievementId}`} className="text-brand">
                  {u.achievementName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 管理员：编辑 / 删除 */}
      {admin && (
        <section className="card border-brand/30">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-brand">🛠 编辑活动</summary>
            <form action={updateEvent} className="mt-3 space-y-3">
              <input type="hidden" name="eventId" value={event.id} />
              <div>
                <label className="label">日期</label>
                <input className="input" type="date" name="date" defaultValue={event.date} required />
              </div>
              <div>
                <label className="label">标题</label>
                <input className="input" name="title" defaultValue={event.title} maxLength={60} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">地点</label>
                  <input className="input" name="location" defaultValue={event.location ?? ""} />
                </div>
                <div>
                  <label className="label">开始时间</label>
                  <input className="input" name="startTime" defaultValue={event.startTime ?? ""} />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="hasAfternoon"
                    value="1"
                    defaultChecked={event.hasAfternoon === 1}
                    className="h-4 w-4 accent-[#8b1e2d]"
                  />
                  下午场
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="hasEvening"
                    value="1"
                    defaultChecked={event.hasEvening === 1}
                    className="h-4 w-4 accent-[#8b1e2d]"
                  />
                  晚上场
                </label>
              </div>
              <div>
                <label className="label">状态</label>
                <select className="input" name="status" defaultValue={event.status}>
                  <option value="planned">计划中</option>
                  <option value="done">已结束</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
              <div>
                <label className="label">备注</label>
                <textarea className="input" name="note" defaultValue={event.note ?? ""} rows={2} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                保存
              </button>
            </form>
          </details>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-red-700">🗑 删除活动</summary>
            <form action={deleteEvent} className="mt-3 space-y-2">
              <input type="hidden" name="eventId" value={event.id} />
              <p className="muted">会连同报名、出席、游戏记录一起删掉，不能恢复。</p>
              <input className="input" name="confirm" placeholder="输入「删除」两个字确认" />
              <ConfirmSubmit message="真的要删掉整个活动？" className="btn btn-danger btn-block">
                确认删除
              </ConfirmSubmit>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}
