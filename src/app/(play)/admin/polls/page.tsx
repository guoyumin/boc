import Link from "next/link";
import { redirect } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import { closePoll, deletePoll, reopenPoll } from "@/actions/polls";
import { getAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { POLL_STATUS_LABEL } from "@/lib/labels";
import { listPolls } from "@/lib/queries";

export default async function AdminPollsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/login?next=/admin/polls");
  const polls = listPolls();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">时间投票管理</h1>
        <Link href="/admin" className="btn btn-sm">
          返回后台
        </Link>
      </div>
      <Flash err={sp.err} ok={sp.ok} />
      <Link href="/admin/polls/new" className="btn btn-primary btn-block">
        发起新的时间投票
      </Link>

      {polls.length === 0 ? (
        <p className="card muted">还没有时间投票。</p>
      ) : (
        <ul className="space-y-2">
          {polls.map((p) => (
            <li key={p.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/polls/${p.id}`} className="font-medium">
                    {p.title}
                  </Link>
                  <p className="muted">
                    {formatDate(p.saturday)} 起 · {p.responseCount} 人已填
                  </p>
                </div>
                <span className="badge badge-plain shrink-0">{POLL_STATUS_LABEL[p.status]}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.status === "open" ? (
                  <form action={closePoll}>
                    <input type="hidden" name="pollId" value={p.id} />
                    <button type="submit" className="btn btn-sm">
                      关闭
                    </button>
                  </form>
                ) : (
                  <form action={reopenPoll}>
                    <input type="hidden" name="pollId" value={p.id} />
                    <button type="submit" className="btn btn-sm">
                      重新打开
                    </button>
                  </form>
                )}
                {p.eventId && (
                  <Link href={`/events/${p.eventId}`} className="btn btn-sm">
                    看活动
                  </Link>
                )}
                <form action={deletePoll}>
                  <input type="hidden" name="pollId" value={p.id} />
                  <ConfirmSubmit
                    className="btn btn-sm btn-danger"
                    message={`删除「${p.title}」？${p.responseCount} 条填写记录会一起删掉${
                      p.eventId ? "（已经定下的活动不受影响）" : ""
                    }。`}
                  >
                    删除
                  </ConfirmSubmit>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
