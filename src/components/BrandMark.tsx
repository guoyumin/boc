/**
 * 站点标记：一滴血。原来是 🩸 emoji，各平台画风不一（iOS 是注射器味的、
 * 安卓又是另一种），换成自己的 SVG，颜色跟 currentColor 走。
 * 浏览器标签页的图标（src/app/icon.svg）画的是同一个形状。
 */
export default function BrandMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* 水滴：顶端收窄，下部浑圆 */}
      <path
        d="M12 2.2c0 0 7.2 8.4 7.2 13A7.2 7.2 0 0 1 4.8 15.2c0-4.6 7.2-13 7.2-13Z"
        fill="currentColor"
      />
      {/* 左上的高光，让它看起来是液体而不是一块色块 */}
      <path
        d="M9.4 12.6c-1 1.5-1.6 3-1.6 4.1a4.2 4.2 0 0 0 1.5 3.2c-.4-1.4-.4-2.9.1-4.4.2-.7.5-1.6 1-2.6a.6.6 0 0 0-1-.3Z"
        fill="#fff"
        opacity="0.35"
      />
    </svg>
  );
}
