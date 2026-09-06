import Link from "next/link";
import { redirect } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import { deleteEvent, setEventStatus } from "@/actions/events";
import { getAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { EVENT_STATUS_CLASS, EVENT_STATUS_LABEL } from "@/lib/labels";
import { listEvents } from "@/lib/queries";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/login?next=/admin/events");
  const events = listEvents(200);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">活动管理</h1>
        <Link href="/admin" className="btn btn-sm">
          返回后台
        </Link>
      </div>
      <Flash err={sp.err} ok={sp.ok} />
      <Link href="/admin/events/new" className="btn btn-primary btn-block">
        新建活动
      </Link>

      {events.length === 0 ? (
        <p className="card muted">还没有活动。</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/events/${e.id}`} className="font-medium">
                    {formatDate(e.date)}
                  </Link>
                  <p className="muted truncate">{e.title}</p>
                  <p className="text-xs text-muted">
                    报名 {e.signupCount} · 到场 {e.attendCount}
                    {e.noShowCount > 0 && ` · 鸽 ${e.noShowCount}`}
                  </p>
                </div>
                <span className={`badge shrink-0 ${EVENT_STATUS_CLASS[e.status]}`}>
                  {EVENT_STATUS_LABEL[e.status]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["planned", "done", "cancelled"] as const)
                  .filter((s) => s !== e.status)
                  .map((s) => (
                    <form key={s} action={setEventStatus}>
                      <input type="hidden" name="eventId" value={e.id} />
                      <input type="hidden" name="status" value={s} />
                      <button type="submit" className="btn btn-sm">
                        标为{EVENT_STATUS_LABEL[s]}
                      </button>
                    </form>
                  ))}
                <form action={deleteEvent}>
                  <input type="hidden" name="eventId" value={e.id} />
                  <input type="hidden" name="back" value="/admin/events" />
                  <input type="hidden" name="confirm" value="1" />
                  <ConfirmSubmit
                    className="btn btn-sm btn-danger"
                    message={`删除「${formatDate(e.date)} ${e.title}」？报名、对局记录和上传的文件都会一起删掉，不能恢复。`}
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
