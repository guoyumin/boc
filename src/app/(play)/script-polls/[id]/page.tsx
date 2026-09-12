import Link from "next/link";
import Zoomable from "@/components/Zoomable";
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
  updateScriptPoll,
} from "@/actions/script-polls";
import { getAdmin, getUser } from "@/lib/auth";
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
  const myName = (await getUser())?.playerName ?? "";
  const { poll, options, voterCount, best, event } = view;
  const decided = options.find((o) => o.id === poll.decidedOptionId);
  const missingImages = options.filter((o) => !o.imageFileId).length;

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
          <span>{admin ? `结果（${voterCount} 人投过）` : `候选板子（${voterCount} 人投过）`}</span>
          {admin && missingImages > 0 && (
            <span className="badge badge-plain">{missingImages} 个本还没配图</span>
          )}
        </div>
        {options.length === 0 ? (
          <p className="muted">还没有候选板子。</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((o) => {
              // 非管理员看不到票数，自然也不能靠高亮猜出谁领先
              const top = admin && o.votes === best && best > 0;
              return (
                <li
                  key={o.id}
                  className={`overflow-hidden rounded-xl border ${
                    top ? "border-brand-line" : "border-line"
                  }`}
                >
                  {/* 板子图片：没传图的先留一块占位，别让卡片高矮不齐 */}
                  {o.imageFileId ? (
                    <Zoomable
                      src={`/files/${o.imageFileId}`}
                      thumb={`/files/${o.imageFileId}?thumb=1`}
                      alt={o.name}
                      className="aspect-[4/3] w-full bg-surface-2 object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-surface-2 text-xs text-faint">
                      还没有图
                    </div>
                  )}
                  <div className={`p-3 ${top ? "bg-brand-soft" : "bg-surface"}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-ink">{o.name}</span>
                      {admin && (
                        <span className={`shrink-0 text-sm ${top ? "text-brand-bright" : "text-muted"}`}>
                          {o.votes} 票
                        </span>
                      )}
                    </div>
                    {o.note && <p className="muted mt-1">{o.note}</p>}
                    {o.scriptFileId && (
                      <a href={`/files/${o.scriptFileId}`} download className="link mt-1 inline-block text-xs">
                        剧本 JSON
                      </a>
                    )}
                    {/* 谁投了什么只有管理员看得到（issue #44） */}
                    {admin && o.voters.length > 0 && (
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
                          <summary className="btn btn-sm w-full list-none">
                            {o.imageFileId ? "编辑 / 换图" : "＋ 传图 / 写描述"}
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
                              placeholder="板子描述：什么角色、什么节奏、适合谁"
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
          <details className="mt-3 rounded-lg border border-line p-3" open={options.length === 0}>
            <summary className="btn btn-sm list-none">＋ 加一个候选板子</summary>
            <form action={saveScriptOption} className="mt-3 space-y-2">
              <input type="hidden" name="pollId" value={poll.id} />
              <div>
                <label className="label">板子名</label>
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
                <label className="label">板子图片（jpg / png / webp，10 MB 以内）</label>
                <input className="input" type="file" name="image" accept="image/*" />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                添加
              </button>
            </form>
          </details>
        )}
      </section>

      {!admin && (
        <p className="muted -mt-1">
          票数只有管理员看得到，免得大家跟着票走。投完可以随时回来改。
        </p>
      )}

      {poll.status === "open" ? (
        <section className="card">
          <div className="card-title">投我想玩的</div>
          <ScriptVoteForm
            pollId={poll.id}
            options={options.map((o) => ({ id: o.id, name: o.name, imageFileId: o.imageFileId }))}
            defaultNickname={myName}
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
          <details className="mb-3 rounded-lg border border-line p-3">
            <summary className="btn btn-sm list-none">编辑标题 / 说明</summary>
            <form action={updateScriptPoll} className="mt-3 space-y-2">
              <input type="hidden" name="pollId" value={poll.id} />
              <div>
                <label className="label">标题</label>
                <input className="input" name="title" defaultValue={poll.title} maxLength={40} required />
              </div>
              <div>
                <label className="label">说明</label>
                <input
                  className="input"
                  name="note"
                  defaultValue={poll.note ?? ""}
                  maxLength={100}
                  placeholder="投票到周四晚上截止"
                />
              </div>
              <button type="submit" className="btn btn-sm btn-primary">
                保存
              </button>
            </form>
          </details>

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
