import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createDeckRuntimeMiddlewarePlugin } from "./src/node/deck-runtime-middleware";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = __dirname;
const e2eTestSlidesDir = path.resolve(workspaceRoot, ".e2e-test-slides");
const cliDeckDir = process.env.STARRY_SLIDES_DECK_DIR
  ? path.resolve(process.env.STARRY_SLIDES_DECK_DIR)
  : "";
const runtimeDeckDir = cliDeckDir || e2eTestSlidesDir;
const previewDeckDir = cliDeckDir || e2eTestSlidesDir;
const saveTargetDirs = cliDeckDir ? [cliDeckDir] : [e2eTestSlidesDir];

export default defineConfig({
  build: {
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      "@starrykit/slides-core": path.resolve(__dirname, "packages/slides-core/src/index.ts"),
      "@starrykit/slides-editor": path.resolve(__dirname, "packages/slides-editor/src/index.tsx"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    createDeckRuntimeMiddlewarePlugin({
      runtimeDeckDir,
      previewDeckDir,
      saveTargetDirs,
    }),
  ],
});
