import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import CopyButton from "@/components/CopyButton";
import Flash from "@/components/Flash";
import NavIcon from "@/components/NavIcon";
import ScriptVoteForm from "@/components/ScriptVoteForm";
import {
  decideScriptPoll,
  deleteScriptPoll,
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
          <ul className="space-y-2">
            {options.map((o) => {
              const top = o.votes === best && best > 0;
              return (
                <li
                  key={o.id}
                  className={`rounded-lg border p-3 ${
                    top ? "border-brand-line bg-brand-soft" : "border-line"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-ink">{o.name}</span>
                    <span className={`shrink-0 text-sm ${top ? "text-brand-bright" : "text-muted"}`}>
                      {o.votes} 票
                    </span>
                  </div>
                  {o.note && <p className="muted mt-0.5">{o.note}</p>}
                  {/* 结果全程公开，谁投的也一并列出来 */}
                  {o.voters.length > 0 && (
                    <p className="mt-1 text-xs text-faint">{o.voters.join("、")}</p>
                  )}
                  {admin && poll.status !== "decided" && (
                    <form action={decideScriptPoll} className="mt-2">
                      <input type="hidden" name="pollId" value={poll.id} />
                      <input type="hidden" name="optionId" value={o.id} />
                      <button type="submit" className="btn btn-sm">
                        就玩这个
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {poll.status === "open" ? (
        <section className="card">
          <div className="card-title">投我想玩的</div>
          <ScriptVoteForm pollId={poll.id} options={options.map((o) => ({ id: o.id, name: o.name }))} />
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
