import type { Metadata, Viewport } from "next";
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
  themeColor: "#8b1e2d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
