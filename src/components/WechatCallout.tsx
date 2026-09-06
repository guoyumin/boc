import { WECHAT_ID, WECHAT_NOTE } from "@/lib/contact";

/**
 * 加群提示。新人常常只在网站上报个名就以为完事了，实际时间地点是在群里通知的，
 * 所以主页顶部和「第一次来」各放一次。
 *
 * `bar` 是顶部通栏，`inline` 是段落里的一行。
 */
export default function WechatCallout({ variant = "inline" }: { variant?: "bar" | "inline" }) {
  const id = <span className="select-all font-medium text-brand-bright">{WECHAT_ID}</span>;

  if (variant === "bar") {
    return (
      <div className="border-b border-brand-line bg-brand-soft">
        <p className="mx-auto max-w-6xl px-4 py-2.5 text-center text-sm text-ink-2 sm:px-6">
          📣 想入群获取详细活动信息，加微信 {id}
          <span className="mt-0.5 block text-xs text-muted sm:mt-0 sm:ml-2 sm:inline">
            申请好友请备注「{WECHAT_NOTE}」
          </span>
        </p>
      </div>
    );
  }

  return (
    <p className="muted">
      想入群获取详细活动信息，加微信 {id} —— 申请好友请备注「{WECHAT_NOTE}」。
    </p>
  );
}
