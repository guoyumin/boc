import NicknameInput from "@/components/NicknameInput";
import { submitPollResponse, withdrawPollResponse } from "@/actions/polls";
import { SLOT_LABEL } from "@/lib/labels";
import type { PollSlot } from "@/db/schema";

export default function PollFillForm({ pollId, slots }: { pollId: number; slots: PollSlot[] }) {
  return (
    <form action={submitPollResponse} className="space-y-3">
      <input type="hidden" name="pollId" value={pollId} />
      <div>
        <label className="label">你的昵称</label>
        <NicknameInput />
      </div>
      <div>
        <span className="label">哪些时段有空（可多选）</span>
        <div className="grid grid-cols-2 gap-2">
          {slots.map((s) => (
            <label
              key={s}
              className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
            >
              <input type="checkbox" name="slots" value={s} className="h-4 w-4 accent-[#8b1e2d]" />
              {SLOT_LABEL[s]}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">备注（可选）</label>
        <input className="input" name="note" maxLength={100} placeholder="晚上只能到九点" />
      </div>
      <button type="submit" className="btn btn-primary btn-block">
        提交 / 更新我的时间
      </button>
      <p className="muted">同一个昵称再次提交会覆盖上一次；至少要选一个时段。</p>
    </form>
  );
}

/**
 * 「我这次没空」：撤掉自己已填的记录。
 * 单独一个表单，因为它不需要勾时段，只要昵称。
 */
export function PollWithdrawForm({ pollId }: { pollId: number }) {
  return (
    <details className="mt-3 rounded-lg border border-line p-3">
      <summary className="cursor-pointer text-sm text-muted">这次都没空？撤掉我的记录</summary>
      <form action={withdrawPollResponse} className="mt-3 space-y-2">
        <input type="hidden" name="pollId" value={pollId} />
        <input
          className="input"
          name="nickname"
          maxLength={20}
          required
          placeholder="你填时用的昵称"
        />
        <button type="submit" className="btn btn-block">
          我这次没空
        </button>
        <p className="muted">
          记录不会消失，名单上会把你标成「已取消」，这样大家知道你是填过又撤掉的，不用再催。
        </p>
      </form>
    </details>
  );
}
