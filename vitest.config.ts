import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/._*"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
