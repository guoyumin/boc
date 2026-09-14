import Script from "next/script";
import { getUser, isAdminRole } from "@/lib/auth";

/**
 * Google Analytics（GA4）。两个站共用一个数据流：同一个应用、同一个根 layout，
 * `_ga` cookie 落在 `.zurich-boca.party`，www → play 的路径在一次会话里连得上。
 *
 * 两种情况不加载：
 * - 没配 `GA_MEASUREMENT_ID`（本地开发、演示库）——ID 是运行时读的，改 .env 重启就生效，
 *   不用 NEXT_PUBLIC_ 在构建期烧进镜像
 * - 当前登录的是管理员——录出席、改成就这些是我们自己的操作，别混进玩家行为里
 *
 * 没用 @next/third-parties 的 <GoogleAnalytics>：它把 gtag('config') 放在 afterInteractive
 * 的脚本里，页面 hydrate 时 <Track> 发的事件会排在 config 前面，gtag.js 回放队列时
 * 那些事件没有目标、直接丢掉。这里把初始化放到 beforeInteractive（和主题脚本一样，
 * 根 layout 里才允许），只有加载 gtag.js 本身是异步的。
 */
export default async function Analytics() {
  const gaId = process.env.GA_MEASUREMENT_ID;
  // 要写进内联脚本，只认 G-XXXX 这种形状，别的当没配
  if (!gaId || !/^G-[A-Z0-9]+$/.test(gaId)) return null;
  const me = await getUser();
  if (me && isAdminRole(me.role)) return null;
  return (
    <>
      {/* 这个组件只从根 layout 渲染，beforeInteractive 是生效的；eslint 那条规则只看文件路径 */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script id="ga-init" strategy="beforeInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
    </>
  );
}
