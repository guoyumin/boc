/**
 * 导航用的线性图标。原来是 emoji，各平台画风不一，跟站点的哥特风也不搭（issue #15）。
 * 统一成 1.5px 描边的线图，颜色跟 currentColor 走，大小由 className 控制。
 */
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 9h.01M15 15h.01M12 12h.01" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4Z" />
      <path d="M7.5 5.5H5a2.5 2.5 0 0 0 2.5 4M16.5 5.5H19a2.5 2.5 0 0 1-2.5 4M12 13.5V17M8.5 20h7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
    </>
  ),
  tools: (
    <>
      <path d="M14.5 6.5a3.5 3.5 0 0 0 4.6 4.6l-8 8a2.3 2.3 0 0 1-3.2-3.2l8-8Z" />
      <path d="M5 5l3 3" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" />
      <path d="M8 8h7M8 11.5h5" />
    </>
  ),
};

export type NavIconName = keyof typeof PATHS;

export default function NavIcon({
  name,
  className = "size-5",
}: {
  name: NavIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
