import { redirect } from "next/navigation";
import Flash from "@/components/Flash";
import { createEvent } from "@/actions/events";
import { getAdmin } from "@/lib/auth";
import { formatMd, nextSaturday } from "@/lib/dates";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/admin/login");
  const sat = nextSaturday();

  return (
    <div className="space-y-4">
      <h1 className="page-title">新建活动</h1>
      <Flash err={sp.err} ok={sp.ok} />
      <form action={createEvent} className="card space-y-3">
        <div>
          <label className="label" htmlFor="date">
            日期
          </label>
          <input id="date" className="input" type="date" name="date" defaultValue={sat} required />
        </div>
        <div>
          <label className="label" htmlFor="title">
            标题（留空用默认）
          </label>
          <input id="title" className="input" name="title" placeholder={`${formatMd(sat)} 血染`} maxLength={60} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="location">
              地点
            </label>
            <input id="location" className="input" name="location" placeholder="Oerlikon 桌游吧" />
          </div>
          <div>
            <label className="label" htmlFor="startTime">
              开始时间
            </label>
            <input id="startTime" className="input" name="startTime" placeholder="下午一点半" />
          </div>
          <div>
            <label className="label" htmlFor="capacity">
              报名人数上限
            </label>
            <input
              id="capacity"
              className="input"
              type="number"
              name="capacity"
              min={1}
              placeholder="留空 = 不限"
            />
            <p className="muted mt-1">先报先得，满了之后新报名进候补；有人取消会自动补上。</p>
          </div>
        </div>
        <div>
          <span className="label">场次</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="hasAfternoon" value="1" defaultChecked className="h-4 w-4 accent-[#8b1e2d]" />
              下午场
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="hasEvening" value="1" defaultChecked className="h-4 w-4 accent-[#8b1e2d]" />
              晚上场
            </label>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="note">
            备注
          </label>
          <textarea id="note" className="input" name="note" rows={2} maxLength={200} />
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          创建
        </button>
      </form>
    </div>
  );
}
