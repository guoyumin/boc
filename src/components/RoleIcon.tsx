import { roleIconSrc } from "@/lib/roles";

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
  return (
    // 图标是固定 128px 的 webp（8KB 上下），next/image 那层优化在这儿只会添乱
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={roleIconSrc(role)}
      alt=""
      aria-hidden="true"
      className={`inline-block shrink-0 object-contain ${dimmed ? "opacity-45 grayscale" : ""} ${className}`}
    />
  );
}
