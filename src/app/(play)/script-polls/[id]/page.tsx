import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import CopyButton from "@/components/CopyButton";
import Flash from "@/components/Flash";
import NavIcon from "@/components/NavIcon";
import ScriptVoteForm from "@/components/ScriptVoteForm";
import {
  decideScriptPoll,
  deleteScriptOption,
  deleteScriptPoll,
  saveScriptOption,
  setScriptPollStatus,
} from "@/actions/script-polls";
import { getAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getScriptPollView } from "@/lib/queries";
import { playUrl } from "@/lib/urls";

const STATUS_LABEL: Record<string, string> = {
  open: "投票中",
  locked: "已锁定",
  decided: "已定下",
};

const STATUS_CLASS: Record<string, string> = {
  open: "bg-ok-soft text-ok border-ok/40",
  locked: "bg-surface-2 text-muted border-line",
  decided: "bg-brand-soft text-brand-bright border-brand-line",
};

export default async function ScriptPollPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const view = getScriptPollView(Number(id));
  if (!view) notFound();
  const admin = await getAdmin();
  const { poll, options, voterCount, best, event } = view;
  const decided = options.find((o) => o.id === poll.decidedOptionId);

  const shareText = [
    poll.title,
    event ? `${formatDate(event.date)} ${event.title}` : "",
    `投你想玩的本：${playUrl(`/script-polls/${poll.id}`)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />

      <section className="card">
        <div className="card-title">
          <span className="inline-flex items-center gap-2">
            <NavIcon name="book" className="size-[18px]" />
            {poll.title}
          </span>
          <span className={`badge ${STATUS_CLASS[poll.status] ?? "badge-plain"}`}>
            {STATUS_LABEL[poll.status] ?? poll.status}
          </span>
        </div>
        {poll.note && <p className="muted">{poll.note}</p>}
        {event && (
          <Link href={`/events/${event.id}`} className="link mt-1 inline-block text-sm">
            {formatDate(event.date)} · {event.title} →
          </Link>
        )}
        {decided && (
          <p className="mt-3 rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-sm">
            最终定下：<span className="font-medium text-brand-bright">{decided.name}</span>
          </p>
        )}
        <div className="mt-3">
          <CopyButton
            text={shareText}
            label="复制分享链接"
            className="btn btn-sm btn-primary"
            block={false}
          />
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <span>结果（{voterCount} 人投过）</span>
        </div>
        {options.length === 0 ? (
          <p className="muted">还没有候选剧本。</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((o) => {
              const top = o.votes === best && best > 0;
              return (
                <li
                  key={o.id}
                  className={`overflow-hidden rounded-xl border ${
                    top ? "border-brand-line" : "border-line"
                  }`}
                >
                  {/* 剧本图：没传图的先留一块占位，别让卡片高矮不齐 */}
                  {o.fileId ? (
                    <a href={`/files/${o.fileId}`} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/files/${o.fileId}?thumb=1`}
                        alt={o.name}
                        className="aspect-[4/3] w-full bg-surface-2 object-cover"
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-surface-2 text-xs text-faint">
                      还没有图
                    </div>
                  )}
                  <div className={`p-3 ${top ? "bg-brand-soft" : "bg-surface"}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-ink">{o.name}</span>
                      <span className={`shrink-0 text-sm ${top ? "text-brand-bright" : "text-muted"}`}>
                        {o.votes} 票
                      </span>
                    </div>
                    {o.note && <p className="muted mt-1">{o.note}</p>}
                    {/* 结果全程公开，谁投的也列出来 */}
                    {o.voters.length > 0 && (
                      <p className="mt-1 text-xs text-faint">{o.voters.join("、")}</p>
                    )}
                    {admin && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {poll.status !== "decided" && (
                          <form action={decideScriptPoll}>
                            <input type="hidden" name="pollId" value={poll.id} />
                            <input type="hidden" name="optionId" value={o.id} />
                            <button type="submit" className="btn btn-sm">
                              就玩这个
                            </button>
                          </form>
                        )}
                        <details className="w-full">
                          <summary className="cursor-pointer text-xs text-brand-bright">
                            编辑 / 换图
                          </summary>
                          <form action={saveScriptOption} className="mt-2 space-y-2">
                            <input type="hidden" name="pollId" value={poll.id} />
                            <input type="hidden" name="optionId" value={o.id} />
                            <input className="input" name="name" defaultValue={o.name} maxLength={60} required />
                            <textarea
                              className="input h-20"
                              name="note"
                              maxLength={300}
                              defaultValue={o.note ?? ""}
                              placeholder="剧本描述：什么角色、什么节奏、适合谁"
                            />
                            <input className="input" type="file" name="image" accept="image/*" />
                            <div className="flex gap-2">
                              <button type="submit" className="btn btn-sm btn-primary">
                                保存
                              </button>
                            </div>
                          </form>
                          <form action={deleteScriptOption} className="mt-2">
                            <input type="hidden" name="pollId" value={poll.id} />
                            <input type="hidden" name="optionId" value={o.id} />
                            <ConfirmSubmit
                              className="btn btn-sm btn-danger"
                              message={`删除候选「${o.name}」？投给它的票会一起删掉。`}
                            >
                              删除这个候选
                            </ConfirmSubmit>
                          </form>
                        </details>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {admin && (
          <details className="mt-3 rounded-lg border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-bright">
              ＋ 加一个候选剧本
            </summary>
            <form action={saveScriptOption} className="mt-3 space-y-2">
              <input type="hidden" name="pollId" value={poll.id} />
              <div>
                <label className="label">剧本名</label>
                <input className="input" name="name" maxLength={60} required />
              </div>
              <div>
                <label className="label">描述</label>
                <textarea
                  className="input h-20"
                  name="note"
                  maxLength={300}
                  placeholder="什么角色、什么节奏、适合谁"
                />
              </div>
              <div>
                <label className="label">剧本图（jpg / png / webp，10 MB 以内）</label>
                <input className="input" type="file" name="image" accept="image/*" />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                添加
              </button>
            </form>
          </details>
        )}
      </section>

      {poll.status === "open" ? (
        <section className="card">
          <div className="card-title">投我想玩的</div>
          <ScriptVoteForm
            pollId={poll.id}
            options={options.map((o) => ({ id: o.id, name: o.name, fileId: o.fileId }))}
          />
        </section>
      ) : (
        <section className="card">
          <p className="muted">
            {poll.status === "locked" ? "投票已锁定，不能再投了。" : "已经定下玩哪个本了。"}
          </p>
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
          <div className="flex flex-wrap gap-2">
            <form action={setScriptPollStatus}>
              <input type="hidden" name="pollId" value={poll.id} />
              <input type="hidden" name="status" value={poll.status === "open" ? "locked" : "open"} />
              <button type="submit" className="btn btn-sm">
                {poll.status === "open" ? "锁定投票" : "重新开放"}
              </button>
            </form>
            <form action={deleteScriptPoll}>
              <input type="hidden" name="pollId" value={poll.id} />
              <ConfirmSubmit
                className="btn btn-sm btn-danger"
                message={`删除「${poll.title}」？${voterCount} 个人的票会一起删掉。`}
              >
                删除
              </ConfirmSubmit>
            </form>
          </div>
          <p className="muted mt-2">锁定后不能再投；「就玩这个」会把投票标成已定下。</p>
        </section>
      )}
    </div>
  );
}
