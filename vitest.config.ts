import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@starrykit/slides-core": path.resolve(__dirname, "packages/slides-core/src/index.ts"),
      "@starrykit/slides-editor": path.resolve(__dirname, "packages/slides-editor/src/index.tsx"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "packages/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "tests/cli/packaged-cli.test.ts"],
    fileParallelism: false,
  },
});
