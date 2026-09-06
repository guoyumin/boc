import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "sharp"],
  experimental: {
    // 文件上传走 Server Action，默认 1 MB 的限制装不下一张 10 MB 的板子图。
    // 要和 nginx 的 client_max_body_size 对上（deploy/nginx/play.zurich-boca.party.conf）。
    serverActions: { bodySizeLimit: "32mb" },
  },
};

export default nextConfig;
