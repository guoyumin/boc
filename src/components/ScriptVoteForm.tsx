import NicknameInput from "@/components/NicknameInput";
import { submitScriptVote, withdrawScriptVote } from "@/actions/script-polls";

/**
 * 剧本投票的填写表单。多选、可改票：同一个昵称再投一次会覆盖上一次。
 */
export default function ScriptVoteForm({
  pollId,
  options,
}: {
  pollId: number;
  options: { id: number; name: string }[];
}) {
  return (
    <>
      <form action={submitScriptVote} className="space-y-3">
        <input type="hidden" name="pollId" value={pollId} />
        <div>
          <label className="label">你的昵称</label>
          <NicknameInput />
        </div>
        <div>
          <span className="label">想玩哪些（可多选）</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((o) => (
              <label
                key={o.id}
                className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
              >
                <input type="checkbox" name="options" value={o.id} className="h-4 w-4 accent-[#b3352f]" />
                {o.name}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          提交 / 更新我的票
        </button>
        <p className="muted">同一个昵称再投一次会覆盖上一次；至少要选一个。</p>
      </form>

      <details className="mt-3 rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm text-muted">不想投了？撤掉我的票</summary>
        <form action={withdrawScriptVote} className="mt-3 space-y-2">
          <input type="hidden" name="pollId" value={pollId} />
          <input className="input" name="nickname" maxLength={20} required placeholder="你投票用的昵称" />
          <button type="submit" className="btn btn-block">
            撤掉我的票
          </button>
        </form>
      </details>
    </>
  );
}
