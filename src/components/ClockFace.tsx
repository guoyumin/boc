/**
 * 成就卡中央的钟盘水印。纯 SVG，跟着卡片皮肤的 currentColor 走，
 * 不用图片文件，深浅两种皮肤下都能看。
 */
export default function ClockFace({ className = "" }: { className?: string }) {
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="100" cy="100" r="58" fill="none" stroke="currentColor" strokeWidth="0.4" />
      {ticks.map((deg) => (
        <g key={deg} transform={`rotate(${deg} 100 100)`}>
          <line
            x1="100"
            y1="14"
            x2="100"
            y2={deg % 90 === 0 ? "30" : "24"}
            stroke="currentColor"
            strokeWidth={deg % 90 === 0 ? 2 : 1}
          />
        </g>
      ))}
      {/* 指针停在快到十二点：钟声将响 */}
      <line x1="100" y1="100" x2="100" y2="46" stroke="currentColor" strokeWidth="2.5" />
      <line x1="100" y1="100" x2="139" y2="118" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="100" cy="100" r="3.5" fill="currentColor" />
    </svg>
  );
}
