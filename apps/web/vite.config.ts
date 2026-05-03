import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const SAVE_ROUTE = "/__editor/save-generated-deck";
const RESET_ROUTE = "/__editor/reset-generated-deck";
const configDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(configDir, "../..");
const GENERATED_PUBLIC_DIR = path.resolve(workspaceRoot, "apps/web/public/generated/current");
const GENERATED_DIST_DIR = path.resolve(workspaceRoot, "apps/web/dist/generated/current");
const GENERATED_SOURCE_ROOT = path.resolve(
  workspaceRoot,
  "generated/starry-slide-project-overview"
);
const GENERATED_BASELINE_DIR = path.resolve(workspaceRoot, ".tmp/generated-deck-baseline");
const NOT_FOUND_ERROR_CODE = "ENOENT";

interface SaveGeneratedDeckPayload {
  slides?: Array<{
    file?: string;
    htmlSource?: string;
  }>;
}

function createSaveGeneratedDeckPlugin() {
  let activeTargets = [GENERATED_PUBLIC_DIR, GENERATED_DIST_DIR, GENERATED_SOURCE_ROOT];

  async function resetDirectory(targetDir: string) {
    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });
  }

  async function copyDirectory(sourceDir: string, targetDir: string) {
    await fs.mkdir(targetDir, { recursive: true });
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);

        if (entry.isDirectory()) {
          await copyDirectory(sourcePath, targetPath);
          return;
        }

        await fs.copyFile(sourcePath, targetPath);
      })
    );
  }

  async function directoryExists(targetDir: string) {
    try {
      const stat = await fs.stat(targetDir);
      return stat.isDirectory();
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === NOT_FOUND_ERROR_CODE
      ) {
        return false;
      }

      throw error;
    }
  }

  async function ensureBaselineDeck() {
    const hasSourceDeck = await directoryExists(GENERATED_SOURCE_ROOT);
    const baselineSource = hasSourceDeck ? GENERATED_SOURCE_ROOT : GENERATED_PUBLIC_DIR;
    activeTargets = hasSourceDeck
      ? [GENERATED_PUBLIC_DIR, GENERATED_DIST_DIR, GENERATED_SOURCE_ROOT]
      : [GENERATED_PUBLIC_DIR, GENERATED_DIST_DIR];

    await fs.rm(GENERATED_BASELINE_DIR, { recursive: true, force: true });
    await copyDirectory(baselineSource, GENERATED_BASELINE_DIR);
  }

  async function handleSaveRequest(
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse
  ) {
    const chunks: Uint8Array[] = [];

    for await (const chunk of request) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }

    const body = Buffer.concat(chunks).toString("utf8");
    const payload = JSON.parse(body) as SaveGeneratedDeckPayload;
    const slides = payload.slides?.filter(
      (slide): slide is { file: string; htmlSource: string } =>
        typeof slide.file === "string" && typeof slide.htmlSource === "string"
    );

    if (!slides?.length) {
      response.statusCode = 400;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "Slides payload is required." }));
      return;
    }

    await Promise.all(
      slides.map(async (slide) => {
        await Promise.all(
          activeTargets.map(async (targetRoot) => {
            const targetPath = path.join(targetRoot, slide.file);
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.writeFile(targetPath, slide.htmlSource, "utf8");
          })
        );
      })
    );

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: true }));
  }

  async function handleResetRequest(response: import("node:http").ServerResponse) {
    await Promise.all(
      activeTargets.map(async (targetRoot) => {
        await resetDirectory(targetRoot);
        await copyDirectory(GENERATED_BASELINE_DIR, targetRoot);
      })
    );

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: true }));
  }

  return {
    name: "save-generated-deck",
    async buildStart() {
      await ensureBaselineDeck();
    },
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use(async (request, response, next) => {
        if (request.method === "POST" && request.url === RESET_ROUTE) {
          try {
            await handleResetRequest(response);
          } catch (error) {
            response.statusCode = 500;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : "Failed to reset generated deck.",
              })
            );
          }
          return;
        }

        if (request.method !== "POST" || request.url !== SAVE_ROUTE) {
          next();
          return;
        }

        try {
          await handleSaveRequest(request, response);
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Failed to save generated deck.",
            })
          );
        }
      });
    },
    configurePreviewServer(server: import("vite").PreviewServer) {
      server.middlewares.use(async (request, response, next) => {
        if (request.method === "POST" && request.url === RESET_ROUTE) {
          try {
            await handleResetRequest(response);
          } catch (error) {
            response.statusCode = 500;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : "Failed to reset generated deck.",
              })
            );
          }
          return;
        }

        if (request.method !== "POST" || request.url !== SAVE_ROUTE) {
          next();
          return;
        }

        try {
          await handleSaveRequest(request, response);
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Failed to save generated deck.",
            })
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), createSaveGeneratedDeckPlugin()],
});
