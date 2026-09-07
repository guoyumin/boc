import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { isWwwHost } from "@/lib/hosts";
import { THEME_INIT } from "@/lib/theme";
import "./globals.css";

export const dynamic = "force-dynamic";

// 两个站共用这一层：只负责 html/body 和全局样式。
// 各自的外壳（导航、页脚）在 (play)/layout.tsx 和 (www)/layout.tsx 里。
export const metadata: Metadata = {
  title: "苏黎世血染钟楼",
  description: "苏黎世《血染钟楼》玩家社群。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a090c", // 手机浏览器地址栏也跟着变暗
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 浅色主题只给功能站用，社团主页固定深色（hero 是暗色夜景，浅底会碎）
  const host = (await headers()).get("host");
  const site = isWwwHost(host) ? "www" : "play";
  return (
    // suppressHydrationWarning：主题脚本会在 hydration 前给 <html> 加 data-theme，
    // 服务端渲染的 HTML 上没有这个属性，不压掉 React 会报不匹配
    <html lang="zh-CN" className="h-full" data-site={site} suppressHydrationWarning>
      <body className="min-h-full">
        {site === "play" && (
          <Script id="theme-init" strategy="beforeInteractive">
            {THEME_INIT}
          </Script>
        )}
        {children}
      </body>
    </html>
  );
}
