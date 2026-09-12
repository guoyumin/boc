/**
 * 空状态（issue #28）：一张同画风的小线图 + 一句话，比干写「暂无记录」有点意思。
 * 线图和 NavIcon 一个路子：1.2px 描边、颜色跟 currentColor 走，深浅色都不用管。
 */
const ART: Record<string, React.ReactNode> = {
  /* 小幽灵：没记录的地方飘一只 */
  ghost: (
    <>
      <path d="M6.5 21V11a5.5 5.5 0 0 1 11 0v10l-2.75-2-2.75 2-2.75-2L6.5 21Z" />
      <path d="M10 10.5h.01M14 10.5h.01" strokeWidth="2.2" />
      <path d="M10.5 14.5c.5.5 2.5.5 3 0" />
    </>
  ),
  /* 空奖章架：一条搁板、三个挂钩，什么都还没挂上 */
  shelf: (
    <>
      <path d="M3 15.5h18M5.5 15.5v3M18.5 15.5v3" />
      <path d="M7.5 5v6.5a1.2 1.2 0 0 0 2.4 0M12 4v7.5a1.2 1.2 0 0 0 2.4 0M16.5 5v6.5a1.2 1.2 0 0 0 2.4 0" />
      <path d="M3 8.5h1M20 8.5h1" strokeDasharray="1 2" />
    </>
  ),
  /* 两颗没点数的骰子：还没开过局 */
  dice: (
    <>
      <rect x="3" y="10" width="10" height="10" rx="2" />
      <rect x="11.5" y="3" width="8.5" height="8.5" rx="1.8" transform="rotate(10 15.75 7.25)" />
      <path d="M8 15h.01" strokeWidth="2.2" />
    </>
  ),
  /* 空日历：一格都没圈 */
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M8 13.5h2M14 13.5h2M8 17h2" strokeDasharray="1.5 1.5" />
    </>
  ),
};

export type EmptyArt = keyof typeof ART;

export default function EmptyState({
  art,
  children,
  compact = false,
}: {
  art: EmptyArt;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "gap-1.5 py-3" : "gap-2.5 py-6"}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`text-faint ${compact ? "size-10" : "size-14"}`}
      >
        {ART[art]}
      </svg>
      <p className="muted max-w-xs">{children}</p>
    </div>
  );
}
