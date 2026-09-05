import { redirect } from "next/navigation";
import Flash from "@/components/Flash";
import { createPoll } from "@/actions/polls";
import { getAdmin } from "@/lib/auth";
import { addDays, formatDate, nextSaturday, pollTitle } from "@/lib/dates";
import { SLOT_LABEL } from "@/lib/labels";
import { POLL_SLOTS } from "@/db/schema";
import { getOpenPoll } from "@/lib/queries";

export default async function NewPollPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/admin/login");
  const sat = nextSaturday();
  const open = getOpenPoll();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">发起时间预填</h1>
      <Flash err={sp.err} ok={sp.ok} />
      {open && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          现在还有一个进行中的预填「{open.title}」，发起新的会把它关掉。
        </div>
      )}
      <form action={createPoll} className="card space-y-3">
        <div>
          <label className="label" htmlFor="saturday">
            这个周末的周六
          </label>
          <input id="saturday" className="input" type="date" name="saturday" defaultValue={sat} required />
          <p className="muted mt-1">
            默认下一个周六：{formatDate(sat)}，周日是 {formatDate(addDays(sat, 1))}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="title">
            标题（留空用默认）
          </label>
          <input id="title" className="input" name="title" placeholder={pollTitle(sat)} maxLength={40} />
        </div>
        <div>
          <span className="label">开放的时段</span>
          <div className="grid grid-cols-2 gap-2">
            {POLL_SLOTS.map((s) => (
              <label
                key={s}
                className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="slots"
                  value={s}
                  defaultChecked
                  className="h-4 w-4 accent-[#8b1e2d]"
                />
                {SLOT_LABEL[s]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="note">
            备注（可选）
          </label>
          <input id="note" className="input" name="note" maxLength={100} placeholder="老规矩，周三定" />
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          发起
        </button>
      </form>
    </div>
  );
}
