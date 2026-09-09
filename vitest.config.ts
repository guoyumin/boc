import path from "node:path";
import { defineConfig } from "vitest/config";

// 测试跑的是 src/lib 下的纯函数，但那些文件按项目约定用 @/ 引别的模块，
// vitest 不读 tsconfig 的 paths，所以在这儿把别名补上。
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
