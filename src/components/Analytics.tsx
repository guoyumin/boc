import { GoogleAnalytics } from "@next/third-parties/google";
import { getUser, isAdminRole } from "@/lib/auth";

/**
 * Google Analytics（GA4）。两个站共用一个数据流：同一个应用、同一个根 layout，
 * `_ga` cookie 落在 `.zurich-boca.party`，www → play 的路径在一次会话里连得上。
 *
 * 两种情况不加载：
 * - 没配 `GA_MEASUREMENT_ID`（本地开发、演示库）——ID 是运行时读的，改 .env 重启就生效，
 *   不用 NEXT_PUBLIC_ 在构建期烧进镜像
 * - 当前登录的是管理员——录出席、改成就这些是我们自己的操作，别混进玩家行为里
 */
export default async function Analytics() {
  const gaId = process.env.GA_MEASUREMENT_ID;
  if (!gaId) return null;
  const me = await getUser();
  if (me && isAdminRole(me.role)) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
