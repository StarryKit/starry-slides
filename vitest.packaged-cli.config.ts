import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/cli/packaged-cli.test.ts"],
  },
});
