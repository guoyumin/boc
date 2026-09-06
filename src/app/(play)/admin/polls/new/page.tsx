import { redirect } from "next/navigation";
import Flash from "@/components/Flash";
import { createPoll } from "@/actions/polls";
import { getAdmin } from "@/lib/auth";
import PollDateTitle from "@/components/PollDateTitle";
import { nextSaturday } from "@/lib/dates";
import { SLOT_LABEL } from "@/lib/labels";
import { POLL_SLOTS } from "@/db/schema";

export default async function NewPollPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/login?next=/admin/polls/new");
  const sat = nextSaturday();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">发起时间投票</h1>
      <Flash err={sp.err} ok={sp.ok} />
      <form action={createPoll} className="card space-y-3">
        <PollDateTitle defaultSaturday={sat} />
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
