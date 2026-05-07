import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { exportPdf } from "./src/runtime/pdf-export";

const SAVE_ROUTE = "/__editor/save-generated-deck";
const RESET_ROUTE = "/__editor/reset-generated-deck";
const EXPORT_PDF_ROUTE = "/__editor/export-pdf";
const DECK_ROUTE_PREFIX = "/deck/";
const configDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = configDir;
const SAMPLE_SLIDES_DIR = path.resolve(workspaceRoot, "sample-slides");
const E2E_TEST_SLIDES_DIR = path.resolve(workspaceRoot, ".e2e-test-slides");
const CLI_DECK_DIR = process.env.STARRY_SLIDES_DECK_DIR
  ? path.resolve(process.env.STARRY_SLIDES_DECK_DIR)
  : "";
const GENERATED_RUNTIME_DIR =
  CLI_DECK_DIR ||
  (process.env.STARRY_SLIDES_DECK_SOURCE === "e2e" ? E2E_TEST_SLIDES_DIR : SAMPLE_SLIDES_DIR);
const GENERATED_PREVIEW_RUNTIME_DIR =
  CLI_DECK_DIR ||
  (process.env.STARRY_SLIDES_DECK_SOURCE === "e2e" ? E2E_TEST_SLIDES_DIR : SAMPLE_SLIDES_DIR);
const GENERATED_SAVE_TARGETS = CLI_DECK_DIR
  ? [CLI_DECK_DIR]
  : process.env.STARRY_SLIDES_DECK_SOURCE === "e2e"
    ? [E2E_TEST_SLIDES_DIR]
    : [SAMPLE_SLIDES_DIR];
const NOT_FOUND_ERROR_CODE = "ENOENT";

interface SaveGeneratedDeckPayload {
  clientLoadedAt?: number;
  manifest?: {
    topic?: string;
    slides?: Array<{
      file?: string;
      title?: string;
      hidden?: boolean;
    }>;
  };
  slides?: Array<{
    file?: string;
    htmlSource?: string;
    title?: string;
    hidden?: boolean;
  }>;
}

interface ExportPdfPayload {
  selection?: {
    mode?: "all" | "slide" | "slides";
    slideFile?: string;
    slideFiles?: string[];
  };
}

interface DeckFileSnapshot {
  relativePath: string;
  contents: Buffer;
}

function createSaveGeneratedDeckPlugin() {
  let lastResetCompletedAt = 0;
  let deckOperationQueue: Promise<void> = Promise.resolve();
  let resetSnapshot: DeckFileSnapshot[] = [];
  let resetSnapshotPromise: Promise<void> | null = null;

  async function resetDirectory(targetDir: string) {
    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });
  }

  async function readDeckSnapshot(
    sourceDir: string,
    relativeDir = ""
  ): Promise<DeckFileSnapshot[]> {
    const sourceRoot = path.join(sourceDir, relativeDir);
    const entries = await fs.readdir(sourceRoot, { withFileTypes: true });

    const nestedSnapshots = await Promise.all(
      entries.map(async (entry): Promise<DeckFileSnapshot[]> => {
        const relativePath = path.join(relativeDir, entry.name);
        const sourcePath = path.join(sourceDir, relativePath);

        if (entry.isDirectory()) {
          return readDeckSnapshot(sourceDir, relativePath);
        }

        return [
          {
            relativePath,
            contents: await fs.readFile(sourcePath),
          },
        ];
      })
    );

    return nestedSnapshots.flat();
  }

  async function restoreDeckSnapshot(targetDir: string) {
    await resetDirectory(targetDir);
    await Promise.all(
      resetSnapshot.map(async (file) => {
        const targetPath = path.join(targetDir, file.relativePath);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, file.contents);
      })
    );
  }

  async function ensureResetSnapshot() {
    if (!resetSnapshotPromise) {
      resetSnapshotPromise = readDeckSnapshot(GENERATED_RUNTIME_DIR).then((snapshot) => {
        resetSnapshot = snapshot;
      });
    }

    await resetSnapshotPromise;
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
    const clientLoadedAt =
      typeof payload.clientLoadedAt === "number" && Number.isFinite(payload.clientLoadedAt)
        ? payload.clientLoadedAt
        : Number.POSITIVE_INFINITY;

    if (clientLoadedAt <= lastResetCompletedAt) {
      response.statusCode = 200;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ ok: true, stale: true }));
      return;
    }

    const slides = payload.slides?.filter(
      (
        slide
      ): slide is {
        file: string;
        htmlSource: string;
        title?: string;
        hidden?: boolean;
      } => typeof slide.file === "string" && typeof slide.htmlSource === "string"
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
          GENERATED_SAVE_TARGETS.map(async (targetRoot) => {
            const targetPath = path.join(targetRoot, slide.file);
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.writeFile(targetPath, slide.htmlSource, "utf8");
          })
        );
      })
    );

    if (payload.manifest?.slides?.length) {
      const manifestPath = path.join(
        GENERATED_SAVE_TARGETS[0] ?? GENERATED_RUNTIME_DIR,
        "manifest.json"
      );
      const nextManifest = {
        ...payload.manifest,
        slides: payload.manifest.slides.filter(
          (slide): slide is { file: string; title?: string; hidden?: boolean } =>
            typeof slide.file === "string"
        ),
      };
      await fs.writeFile(manifestPath, JSON.stringify(nextManifest, null, 2), "utf8");
      await Promise.all(
        GENERATED_SAVE_TARGETS.slice(1).map((targetRoot) =>
          fs.writeFile(
            path.join(targetRoot, "manifest.json"),
            JSON.stringify(nextManifest, null, 2),
            "utf8"
          )
        )
      );
    }

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: true }));
  }

  async function handleResetRequest(response: import("node:http").ServerResponse) {
    await ensureResetSnapshot();
    lastResetCompletedAt = Date.now();
    await Promise.all(GENERATED_SAVE_TARGETS.map((targetRoot) => restoreDeckSnapshot(targetRoot)));

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: true }));
  }

  async function handleExportPdfRequest(
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse
  ) {
    const chunks: Uint8Array[] = [];

    for await (const chunk of request) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }

    const body = Buffer.concat(chunks).toString("utf8");
    const payload = body ? (JSON.parse(body) as ExportPdfPayload) : {};
    const outFile = path.join(GENERATED_RUNTIME_DIR, ".starry-slides", "export", "deck.pdf");
    const result = await exportPdf({
      deckPath: GENERATED_RUNTIME_DIR,
      outFile,
      selection: payload.selection,
    });
    const contents = await fs.readFile(result.path);

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", 'attachment; filename="starry-slides.pdf"');
    response.end(contents);
  }

  async function handleGeneratedAssetRequest(
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse,
    targetRoot: string
  ) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return false;
    }

    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    if (!requestUrl.pathname.startsWith(DECK_ROUTE_PREFIX)) {
      return false;
    }

    const relativePath = decodeURIComponent(requestUrl.pathname.slice(DECK_ROUTE_PREFIX.length));
    const targetPath = path.resolve(targetRoot, relativePath);
    const normalizedRoot = `${targetRoot}${path.sep}`;
    if (targetPath !== targetRoot && !targetPath.startsWith(normalizedRoot)) {
      response.statusCode = 403;
      response.end("Forbidden");
      return true;
    }

    try {
      const contents = await fs.readFile(targetPath);
      response.statusCode = 200;
      response.setHeader("Cache-Control", "no-store");
      response.setHeader(
        "Content-Type",
        targetPath.endsWith(".json")
          ? "application/json; charset=utf-8"
          : "text/html; charset=utf-8"
      );
      response.end(request.method === "HEAD" ? undefined : contents);
      return true;
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

  async function runDeckOperation(operation: () => Promise<void>) {
    const nextOperation = deckOperationQueue.then(operation, operation);
    deckOperationQueue = nextOperation.then(
      () => undefined,
      () => undefined
    );
    await nextOperation;
  }

  return {
    name: "save-generated-deck",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use(async (request, response, next) => {
        try {
          if (await handleGeneratedAssetRequest(request, response, GENERATED_RUNTIME_DIR)) {
            return;
          }
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : "Failed to read generated deck asset.",
            })
          );
          return;
        }

        if (request.method === "POST" && request.url === RESET_ROUTE) {
          try {
            await runDeckOperation(() => handleResetRequest(response));
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

        if (request.method === "POST" && request.url === EXPORT_PDF_ROUTE) {
          try {
            await runDeckOperation(() => handleExportPdfRequest(request, response));
          } catch (error) {
            response.statusCode = 500;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : "Failed to export PDF.",
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
          await runDeckOperation(() => handleSaveRequest(request, response));
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
        try {
          if (await handleGeneratedAssetRequest(request, response, GENERATED_PREVIEW_RUNTIME_DIR)) {
            return;
          }
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : "Failed to read generated deck asset.",
            })
          );
          return;
        }

        if (request.method === "POST" && request.url === RESET_ROUTE) {
          try {
            await runDeckOperation(() => handleResetRequest(response));
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

        if (request.method === "POST" && request.url === EXPORT_PDF_ROUTE) {
          try {
            await runDeckOperation(() => handleExportPdfRequest(request, response));
          } catch (error) {
            response.statusCode = 500;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : "Failed to export PDF.",
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
          await runDeckOperation(() => handleSaveRequest(request, response));
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
  build: {
    emptyOutDir: false,
  },
  plugins: [react(), tailwindcss(), createSaveGeneratedDeckPlugin()],
});
