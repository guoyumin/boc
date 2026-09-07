import Link from "next/link";
import GrimoireLink from "@/components/GrimoireLink";
import NavIcon from "@/components/NavIcon";
import { notFound } from "next/navigation";
import AttendanceButtons from "@/components/AttendanceButtons";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import WaiveButton from "@/components/WaiveButton";
import CopyButton from "@/components/CopyButton";
import { playUrl } from "@/lib/urls";
import Flash from "@/components/Flash";
import NicknameInput from "@/components/NicknameInput";
import { deleteEvent, updateEvent } from "@/actions/events";
import { createGame } from "@/actions/games";
import { deleteEventFile, uploadEventFiles } from "@/actions/files";
import { addAttendee, cancelSignup, removeSignup, selfSignup } from "@/actions/signups";
import { createScriptPoll } from "@/actions/script-polls";
import { getAdmin } from "@/lib/auth";
import { formatDate, formatMd } from "@/lib/dates";
import { buildJielong } from "@/lib/jielong";
import {
  EVENT_STATUS_CLASS,
  EVENT_STATUS_LABEL,
  GAME_RESULT_CLASS,
  GAME_RESULT_LABEL,
  SESSION_LABEL,
  SESSION_OPTIONS,
  SIGNUP_LABEL,
  isFinished,
  isCancelled,
  isNoShow,
  isPartial,
  isWaived,
  isWalkIn,
} from "@/lib/labels";
import { claimsForEvent, getEvent, getEventFiles, getGames, getSignups, recentScripts, scriptPollsForEvent } from "@/lib/queries";
import { readFileText } from "@/lib/storage";
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

  const files = getEventFiles(eventId);
  const scriptPolls = scriptPollsForEvent(eventId);
  const images = files.filter((f) => f.kind === "board_image");
  const jsons = files.filter((f) => f.kind === "script_json");
  // 「复制 JSON」是客户端组件，内容要服务端读出来传过去。JSON 上限 1 MB，可以接受。
  const jsonText = new Map<number, string>();
  for (const f of jsons) {
    try {
      jsonText.set(f.id, await readFileText(f.storagePath));
    } catch {
      // 磁盘上文件没了：只是不显示「复制 JSON」，页面照常渲染
    }
  }
  const scriptFileOfGame = new Map(
    jsons.filter((f) => f.gameId != null).map((f) => [f.gameId as number, f]),
  );

  const finished = isFinished(event.date, event.status);
  const sessionOptions = SESSION_OPTIONS.filter(
    (o) =>
      (o.value === "afternoon" && event.hasAfternoon === 1) ||
      (o.value === "evening" && event.hasEvening === 1) ||
      (o.value === "full" && event.hasAfternoon === 1 && event.hasEvening === 1),
  );
  // 复制到微信的分享文案：一句话说清是哪一场，后面跟可点的链接
  const shareText = [
    `${formatDate(event.date)} ${event.title}`,
    [event.location, event.startTime].filter(Boolean).join(" · "),
    `报名：${playUrl(`/events/${event.id}`)}`,
  ]
    .filter(Boolean)
    .join("\n");

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
          <span className={`badge ${EVENT_STATUS_CLASS[event.status] ?? "badge-plain"}`}>
            {EVENT_STATUS_LABEL[event.status]}
          </span>
        </div>
        <p className="font-medium text-ink">{event.title}</p>
        <dl className="mt-2 space-y-1 text-sm text-ink-2">
          {event.location && <div>📍 {event.location}</div>}
          {event.startTime && <div>⏰ {event.startTime}</div>}
          <div>
            🕑 场次：
            {[event.hasAfternoon === 1 ? "下午" : null, event.hasEvening === 1 ? "晚上" : null]
              .filter(Boolean)
              .join(" + ") || "—"}
          </div>
          {event.note && <div className="text-muted">📝 {event.note}</div>}
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          {/* 分享到群里用的链接（issue #22） */}
          <CopyButton
            text={shareText}
            label="复制分享链接"
            className="btn btn-sm btn-primary"
            block={false}
          />
          <CopyButton text={jielongText} label="复制接龙" className="btn btn-sm" block={false} />
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
                  <th className="sticky left-0 bg-surface">昵称</th>
                  <th>报名</th>
                  <th>出席</th>
                  <th>备注</th>
                  {admin && <th />}
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => (
                  <tr key={s.id}>
                    <td className="sticky left-0 bg-surface">
                      <Link href={`/players/${s.playerId}`} className="font-medium">
                        {s.name}
                      </Link>
                      {finished && isNoShow(s) && (
                        <span className="badge ml-1 border-warn/30 bg-warn-soft text-warn">鸽</span>
                      )}
                      {finished && isWaived(s) && (
                        <span className="badge ml-1 border-ok/30 bg-ok-soft text-ok">
                          已免鸽
                        </span>
                      )}
                      {isCancelled(s) && <span className="badge ml-1 badge-plain">已取消</span>}
                      {finished && isPartial(s) && (
                        <span className="badge ml-1 badge-plain">只到一场</span>
                      )}
                      {finished && isWalkIn(s) && (
                        <span className="badge ml-1 badge-plain">未报名到场</span>
                      )}
                    </td>
                    <td className="text-ink-2">{SIGNUP_LABEL[s.signup as Session]}</td>
                    <td>
                      {admin ? (
                        <AttendanceButtons signupId={s.id} value={s.attended} />
                      ) : (
                        <span className={s.attended === "none" ? "text-faint" : "text-ink-2"}>
                          {SESSION_LABEL[s.attended as Session]}
                        </span>
                      )}
                    </td>
                    <td className="max-w-[9rem] truncate text-muted">{s.signupNote ?? ""}</td>
                    {admin && (
                      <td>
                        <div className="flex gap-1">
                          {(isNoShow(s) || isWaived(s)) && (
                            <WaiveButton signupId={s.id} waived={isWaived(s)} />
                          )}
                          <form action={removeSignup}>
                            <input type="hidden" name="signupId" value={s.id} />
                            <input type="hidden" name="eventId" value={event.id} />
                            <ConfirmSubmit message={`把 ${s.name} 从名单里移除？`} className="btn btn-sm btn-danger">
                              移除
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {event.status !== "cancelled" && (
          <details className="mt-4 rounded-lg border border-line p-3" open={signups.length === 0}>
            <summary className="cursor-pointer text-sm font-medium text-brand-bright">✍️ 我要报名</summary>
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
            <form action={cancelSignup} className="mt-3 space-y-2 border-t border-line pt-3">
              <input type="hidden" name="eventId" value={event.id} />
              <p className="muted">
                来不了的话可以取消。取消会记一次「鸽」，实在有事跟管理员说一声可以免掉。
              </p>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="label">要取消报名？填昵称</label>
                  <NicknameInput name="nickname" />
                </div>
                <ConfirmSubmit message="确定取消报名？这会记一次鸽。">取消报名</ConfirmSubmit>
              </div>
            </form>
          </details>
        )}

        {admin && (
          <details className="mt-3 rounded-lg border border-brand/30 p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-bright">🛠 添加临时来的玩家</summary>
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

      {/* 剧本投票（issue #4）：定日期用时间投票，定玩什么本用这个 */}
      {(scriptPolls.length > 0 || admin) && (
        <section className="card">
          <div className="card-title">
            <span className="inline-flex items-center gap-2">
              <NavIcon name="book" className="size-[18px]" />
              剧本投票
            </span>
          </div>
          {scriptPolls.length === 0 ? (
            <p className="muted">这场还没有剧本投票。</p>
          ) : (
            <ul className="space-y-2">
              {scriptPolls.map((sp2) => (
                <li key={sp2.id}>
                  <Link href={`/script-polls/${sp2.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
                    <span className="font-medium text-ink">{sp2.title}</span>
                    <span className="badge badge-plain shrink-0">
                      {sp2.status === "open" ? "投票中" : sp2.status === "locked" ? "已锁定" : "已定下"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {admin && (
            <details className="mt-3 rounded-lg border border-line p-3">
              <summary className="cursor-pointer text-sm font-medium text-brand-bright">
                ＋ 发起剧本投票
              </summary>
              <form action={createScriptPoll} className="mt-3 space-y-3">
                <input type="hidden" name="eventId" value={event.id} />
                <div>
                  <label className="label">标题</label>
                  <input className="input" name="title" maxLength={40} defaultValue="这场玩哪个本？" />
                </div>
                <div>
                  <label className="label">候选剧本（一行一个，可以写「名字 · 说明」）</label>
                  <textarea
                    className="input h-28"
                    name="options"
                    required
                    placeholder={"暗流涌动 · 新手友好\n黯月初升\n梦殒春宵"}
                  />
                </div>
                <div>
                  <label className="label">说明（可选）</label>
                  <input className="input" name="note" maxLength={100} placeholder="投票到周四晚上截止" />
                </div>
                <button type="submit" className="btn btn-primary btn-block">
                  发起投票
                </button>
              </form>
            </details>
          )}
        </section>
      )}

      {/* 游戏记录 */}
      <section className="card">
        <div className="card-title">
          <span>🎲 游戏记录（{games.length} 局）</span>
          <GrimoireLink />
        </div>
        {games.length === 0 ? (
          <p className="muted">还没有记录。谁说书谁来记一下。</p>
        ) : (
          <ul className="space-y-2">
            {games.map((g) => {
              const sf = scriptFileOfGame.get(g.id);
              return (
                <li key={g.id} className="rounded-lg border border-line p-3">
                  <Link href={`/games/${g.id}`} className="block">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink">
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
                  {sf && (
                    <a href={`/files/${sf.id}`} download className="link mt-1 inline-block text-xs">
                      📜 剧本文件：{sf.scriptName ?? sf.originalName}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <details className="mt-4 rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-brand-bright">＋ 添加一局</summary>
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

      {/* 文件 */}
      <section className="card">
        <div className="card-title">📎 文件（{files.length}）</div>

        {images.length === 0 && jsons.length === 0 && (
          <p className="muted">
            还没有文件。{admin ? "在下面上传板子图片或剧本 JSON。" : "等管理员上传板子图片和剧本。"}
          </p>
        )}

        {images.length > 0 && (
          <>
            <p className="label">🖼 板子图片</p>
            <ul className="grid grid-cols-3 gap-2">
              {images.map((f) => (
                <li key={f.id} className="space-y-1">
                  <a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/files/${f.id}?thumb=1`}
                      alt={f.originalName}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg border border-line object-cover"
                    />
                  </a>
                  <p className="truncate text-xs text-muted">
                    {f.session ? `${SESSION_LABEL[f.session as Session]} · ` : ""}
                    {f.originalName}
                  </p>
                  {admin && (
                    <form action={deleteEventFile}>
                      <input type="hidden" name="fileId" value={f.id} />
                      <ConfirmSubmit
                        message={`删除图片「${f.originalName}」？不能恢复。`}
                        className="btn btn-sm btn-danger w-full"
                      >
                        删除
                      </ConfirmSubmit>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {jsons.length > 0 && (
          <>
            <p className="label mt-4">📜 剧本 JSON</p>
            <ul className="space-y-2">
              {jsons.map((f) => (
                <li key={f.id} className="rounded-lg border border-line p-3">
                  <p className="font-medium text-ink">
                    {f.scriptName ?? f.originalName}
                    {f.session && (
                      <span className="badge badge-plain ml-2">
                        {SESSION_LABEL[f.session as Session]}
                      </span>
                    )}
                  </p>
                  <p className="muted mt-0.5">
                    {[
                      f.scriptAuthor ? `作者 ${f.scriptAuthor}` : null,
                      f.roleCount != null ? `${f.roleCount} 个角色` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "没有解析到剧本信息"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <a href={`/files/${f.id}`} className="btn btn-sm" download>
                      下载
                    </a>
                    {jsonText.get(f.id) && (
                      <CopyButton
                        text={jsonText.get(f.id)!}
                        label="复制 JSON"
                        className="btn btn-sm"
                      />
                    )}
                    {admin && (
                      <form action={deleteEventFile}>
                        <input type="hidden" name="fileId" value={f.id} />
                        <ConfirmSubmit message={`删除剧本「${f.scriptName ?? f.originalName}」？`}>
                          删除
                        </ConfirmSubmit>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {admin && (
          <details className="mt-4 rounded-lg border border-brand/30 p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-bright">⬆️ 上传文件</summary>
            <form action={uploadEventFiles} className="mt-3 space-y-3">
              <input type="hidden" name="eventId" value={event.id} />
              <div>
                <label className="label">选择文件（可多选）</label>
                <input
                  className="input"
                  type="file"
                  name="files"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/json,.json"
                />
                <p className="muted mt-1">
                  图片 jpg / png / webp ≤ 10 MB，剧本 JSON ≤ 1 MB。类型按文件内容自动判断。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">场次（可选）</label>
                  <select className="input" name="session" defaultValue="">
                    <option value="">不限</option>
                    {event.hasAfternoon === 1 && <option value="afternoon">下午</option>}
                    {event.hasEvening === 1 && <option value="evening">晚上</option>}
                  </select>
                </div>
                <div>
                  <label className="label">关联到某一局（可选）</label>
                  <select className="input" name="gameId" defaultValue="">
                    <option value="">不关联</option>
                    {games.map((g) => (
                      <option key={g.id} value={g.id}>
                        第 {g.seq} 局 · {g.scriptName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                上传
              </button>
            </form>
          </details>
        )}
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
                <Link href={`/players/${u.playerId}`} className="font-medium">
                  {u.playerName}
                </Link>
                <Link href={`/achievements/${u.achievementId}`} className="text-brand-bright">
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
            <summary className="cursor-pointer text-sm font-medium text-brand-bright">🛠 编辑活动</summary>
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
            <summary className="cursor-pointer text-sm font-medium text-danger">🗑 删除活动</summary>
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
