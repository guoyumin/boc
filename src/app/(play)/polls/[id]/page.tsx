import Link from "next/link";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import NavIcon from "@/components/NavIcon";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import PollFillForm, { PollWithdrawForm } from "@/components/PollFillForm";
import { closePoll, decidePoll, deletePoll, reopenPoll } from "@/actions/polls";
import { getAdmin } from "@/lib/auth";
import { addDays, formatDate, formatMd } from "@/lib/dates";
import { POLL_STATUS_LABEL, SLOT_LABEL, SLOT_SHORT } from "@/lib/labels";
import { getPollView } from "@/lib/queries";
import { playUrl } from "@/lib/urls";

export default async function PollDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const view = getPollView(Number(id));
  if (!view) notFound();
  const admin = await getAdmin();
  const { poll, slots, responses, counts, best, filledCount } = view;

  // 复制到微信的分享文案：说清是哪一轮投票，后面跟可点的链接
  const shareText = [
    poll.title,
    `填你有空的时段：${playUrl(`/polls/${poll.id}`)}`,
  ].join("\n");

  const summary = [
    `${poll.title}（${filledCount} 人已填）`,
    ...slots.map(
      (s) =>
        `${SLOT_LABEL[s]}（${counts[s] ?? 0}人）：${
          responses.filter((r) => r.slots.includes(s)).map((r) => r.name).join("、") || "—"
        }`,
    ),
    best > 0 ? `人最多：${slots.filter((s) => counts[s] === best).map((s) => SLOT_LABEL[s]).join(" / ")}` : "",
    // 撤回的人也发出去，免得群里反复问「XX 填了没」
    responses.some((r) => r.withdrawn)
      ? `已取消：${responses.filter((r) => r.withdrawn).map((r) => r.name).join("、")}`
      : "",
    view.event ? `已定：${formatDate(view.event.date)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />

      <div className="card">
        <div className="card-title">
          <span className="inline-flex items-center gap-2">
            <NavIcon name="calendar" className="size-[18px]" />
            {poll.title}
          </span>
          <span className={`badge ${poll.status === "open" ? "badge-brand" : "badge-plain"}`}>
            {POLL_STATUS_LABEL[poll.status]}
          </span>
        </div>
        {poll.note && <p className="muted">{poll.note}</p>}
        {view.event && (
          <Link href={`/events/${view.event.id}`} className="btn btn-primary btn-block mt-3">
            已定在 {formatDate(view.event.date)} · 去活动页
          </Link>
        )}
      </div>

      <section className="card">
        <div className="card-title">
          <span>
            结果（{filledCount} 人已填
            {responses.length > filledCount && ` · ${responses.length - filledCount} 人已取消`}）
          </span>
        </div>
        {responses.length === 0 ? (
          <p className="muted">还没有人填。</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface">昵称</th>
                  {slots.map((s) => (
                    <th key={s} className={`text-center ${counts[s] === best && best > 0 ? "text-brand-bright" : ""}`}>
                      {SLOT_SHORT[s]}
                    </th>
                  ))}
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.id}>
                    <td className="sticky left-0 bg-surface font-medium">
                      <span className="flex items-center gap-1.5">
                        <Link href={`/players/${r.playerId}`} className={r.withdrawn ? "text-muted" : ""}>
                          {r.name}
                        </Link>
                        {r.withdrawn && <span className="badge badge-plain">已取消</span>}
                      </span>
                    </td>
                    {slots.map((s) => (
                      <td
                        key={s}
                        className={`text-center ${
                          counts[s] === best && best > 0 ? "bg-brand-soft" : ""
                        }`}
                      >
                        {r.withdrawn ? (
                          <span className="text-faint">—</span>
                        ) : r.slots.includes(s) ? (
                          <span className="text-brand-bright">✓</span>
                        ) : (
                          <span className="text-faint">·</span>
                        )}
                      </td>
                    ))}
                    <td className="max-w-[10rem] truncate text-muted">{r.note ?? ""}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="sticky left-0 bg-surface">合计</td>
                  {slots.map((s) => (
                    <td
                      key={s}
                      className={`text-center ${
                        counts[s] === best && best > 0 ? "bg-brand-soft text-brand-bright" : ""
                      }`}
                    >
                      {counts[s] ?? 0}
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {/* 分享到群里用的链接（issue #22） */}
          <CopyButton
            text={shareText}
            label="复制分享链接"
            className="btn btn-sm btn-primary"
            block={false}
          />
          <CopyButton text={summary} label="复制结果到微信" className="btn btn-sm" block={false} />
        </div>
      </section>

      {poll.status === "open" && (
        <section className="card">
          <div className="card-title">填我的时间</div>
          <PollFillForm pollId={poll.id} slots={slots} />
          <PollWithdrawForm pollId={poll.id} />
        </section>
      )}

      {admin && (
        <section className="card border-brand/30">
          <div className="card-title">
            <span className="inline-flex items-center gap-2">
              <NavIcon name="tools" className="size-[18px]" />
              管理员
            </span>
          </div>
          {poll.status !== "decided" && (
            <form action={decidePoll} className="space-y-3">
              <input type="hidden" name="pollId" value={poll.id} />
              <div>
                <label className="label">定在哪天</label>
                <select className="input" name="day" defaultValue="sat">
                  <option value="sat">周六 · {formatMd(poll.saturday)}</option>
                  <option value="sun">周日 · {formatMd(addDays(poll.saturday, 1))}</option>
                </select>
              </div>
              <div>
                <label className="label">场次</label>
                <select className="input" name="sessions" defaultValue="full">
                  <option value="full">下午 + 晚上</option>
                  <option value="afternoon">只有下午</option>
                  <option value="evening">只有晚上</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">地点（可选）</label>
                  <input className="input" name="location" placeholder="Oerlikon 桌游吧" />
                </div>
                <div>
                  <label className="label">开始时间（可选）</label>
                  <input className="input" name="startTime" placeholder="下午一点半" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                定下来并创建活动
              </button>
            </form>
          )}
          <div className="mt-3 flex gap-2">
            {poll.status === "open" ? (
              <form action={closePoll}>
                <input type="hidden" name="pollId" value={poll.id} />
                <button type="submit" className="btn">
                  关闭投票
                </button>
              </form>
            ) : (
              <form action={reopenPoll}>
                <input type="hidden" name="pollId" value={poll.id} />
                <button type="submit" className="btn">
                  重新打开
                </button>
              </form>
            )}
            <Link href="/admin/polls" className="btn">
              全部时间投票
            </Link>
            <form action={deletePoll}>
              <input type="hidden" name="pollId" value={poll.id} />
              <ConfirmSubmit
                className="btn btn-danger"
                message={`删除「${poll.title}」？${responses.length} 条填写记录会一起删掉。`}
              >
                删除
              </ConfirmSubmit>
            </form>
          </div>
        </section>
      )}

    </div>
  );
}
