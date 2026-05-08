import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createDeckRuntimeMiddlewarePlugin } from "./src/node/deck-runtime-middleware";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = configDir;
const sampleSlidesDir = path.resolve(workspaceRoot, "sample-slides");
const e2eTestSlidesDir = path.resolve(workspaceRoot, ".e2e-test-slides");
const cliDeckDir = process.env.STARRY_SLIDES_DECK_DIR
  ? path.resolve(process.env.STARRY_SLIDES_DECK_DIR)
  : "";
const selectedLocalDeckDir =
  process.env.STARRY_SLIDES_DECK_SOURCE === "e2e" ? e2eTestSlidesDir : sampleSlidesDir;
const runtimeDeckDir = cliDeckDir || selectedLocalDeckDir;
const previewDeckDir = cliDeckDir || selectedLocalDeckDir;
const saveTargetDirs = cliDeckDir ? [cliDeckDir] : [selectedLocalDeckDir];

export default defineConfig({
  build: {
    emptyOutDir: false,
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
