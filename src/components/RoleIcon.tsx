import { isMaskIcon, roleIconSrc } from "@/lib/roles";

/**
 * 角色图标。官方美术，深色底上直接用原图。
 * 尺寸走 className，默认跟一行文字差不多高。
 */
export default function RoleIcon({
  role,
  className = "size-5",
  dimmed = false,
}: {
  role: string;
  className?: string;
  dimmed?: boolean;
}) {
  const src = roleIconSrc(role);

  // 单色线稿走遮罩，颜色跟 currentColor 走（卡里是金色，导航里是正文色）
  if (isMaskIcon(role)) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 bg-current ${dimmed ? "opacity-40" : ""} ${className}`}
        style={{
          maskImage: `url(${src})`,
          WebkitMaskImage: `url(${src})`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    );
  }

  return (
    // 图标是固定 128px 的 webp（8KB 上下），next/image 那层优化在这儿只会添乱
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`inline-block shrink-0 object-contain ${dimmed ? "opacity-45 grayscale" : ""} ${className}`}
    />
  );
}
