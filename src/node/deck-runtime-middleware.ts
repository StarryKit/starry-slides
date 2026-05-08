import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import type { PdfExportSelection } from "../core";
import { exportHtml } from "./html-export";
import { exportPdf } from "./pdf-export";

const SAVE_ROUTE = "/__editor/save-generated-deck";
const RESET_ROUTE = "/__editor/reset-generated-deck";
const EXPORT_PDF_ROUTE = "/__editor/export-pdf";
const EXPORT_HTML_ROUTE = "/__editor/export-html";
const DECK_ROUTE_PREFIX = "/deck/";
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
  selection?: PdfExportSelection;
}

interface DeckFileSnapshot {
  relativePath: string;
  contents: Buffer;
}

interface DeckRuntimeMiddlewareOptions {
  runtimeDeckDir: string;
  previewDeckDir: string;
  saveTargetDirs: string[];
}

export function createDeckRuntimeMiddlewarePlugin({
  runtimeDeckDir,
  previewDeckDir,
  saveTargetDirs,
}: DeckRuntimeMiddlewareOptions): Plugin {
  const runtime = createDeckRuntimeMiddleware({
    runtimeDeckDir,
    previewDeckDir,
    saveTargetDirs,
  });

  return {
    name: "deck-runtime-middleware",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(runtime.handleDevRequest);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(runtime.handlePreviewRequest);
    },
  };
}

function createDeckRuntimeMiddleware({
  runtimeDeckDir,
  previewDeckDir,
  saveTargetDirs,
}: DeckRuntimeMiddlewareOptions) {
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
      resetSnapshotPromise = readDeckSnapshot(runtimeDeckDir).then((snapshot) => {
        resetSnapshot = snapshot;
      });
    }

    await resetSnapshotPromise;
  }

  async function handleSaveRequest(request: IncomingMessage, response: ServerResponse) {
    const payload = JSON.parse(await readRequestBody(request)) as SaveGeneratedDeckPayload;
    const clientLoadedAt =
      typeof payload.clientLoadedAt === "number" && Number.isFinite(payload.clientLoadedAt)
        ? payload.clientLoadedAt
        : Number.POSITIVE_INFINITY;

    if (clientLoadedAt <= lastResetCompletedAt) {
      writeJsonResponse(response, 200, { ok: true, stale: true });
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
      writeJsonResponse(response, 400, { error: "Slides payload is required." });
      return;
    }

    await Promise.all(
      slides.map(async (slide) => {
        await Promise.all(
          saveTargetDirs.map(async (targetRoot) => {
            const targetPath = path.join(targetRoot, slide.file);
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.writeFile(targetPath, slide.htmlSource, "utf8");
          })
        );
      })
    );

    if (payload.manifest?.slides?.length) {
      const manifestPath = path.join(saveTargetDirs[0] ?? runtimeDeckDir, "manifest.json");
      const nextManifest = {
        ...payload.manifest,
        slides: payload.manifest.slides.filter(
          (slide): slide is { file: string; title?: string; hidden?: boolean } =>
            typeof slide.file === "string"
        ),
      };
      const contents = JSON.stringify(nextManifest, null, 2);
      await fs.writeFile(manifestPath, contents, "utf8");
      await Promise.all(
        saveTargetDirs
          .slice(1)
          .map((targetRoot) =>
            fs.writeFile(path.join(targetRoot, "manifest.json"), contents, "utf8")
          )
      );
    }

    writeJsonResponse(response, 200, { ok: true });
  }

  async function handleResetRequest(response: ServerResponse) {
    await ensureResetSnapshot();
    lastResetCompletedAt = Date.now();
    await Promise.all(saveTargetDirs.map((targetRoot) => restoreDeckSnapshot(targetRoot)));
    writeJsonResponse(response, 200, { ok: true });
  }

  async function handleExportPdfRequest(request: IncomingMessage, response: ServerResponse) {
    const body = await readRequestBody(request);
    const payload = body ? (JSON.parse(body) as ExportPdfPayload) : {};
    const outFile = path.join(runtimeDeckDir, ".starry-slides", "export", "deck.pdf");
    const result = await exportPdf({
      deckPath: runtimeDeckDir,
      outFile,
      selection: payload.selection,
    });
    const contents = await fs.readFile(result.path);

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", 'attachment; filename="starry-slides.pdf"');
    response.end(contents);
  }

  async function handleExportHtmlRequest(response: ServerResponse) {
    const outFile = path.join(runtimeDeckDir, ".starry-slides", "export", "deck.html");
    const result = await exportHtml({
      deckPath: runtimeDeckDir,
      outFile,
    });
    const contents = await fs.readFile(result.path);

    response.statusCode = 200;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="starry-slides.html"');
    response.end(contents);
  }

  async function handleGeneratedAssetRequest(
    request: IncomingMessage,
    response: ServerResponse,
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

  async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
    assetDeckDir: string
  ) {
    try {
      if (await handleGeneratedAssetRequest(request, response, assetDeckDir)) {
        return;
      }
    } catch (error) {
      writeJsonError(response, error, "Failed to read generated deck asset.");
      return;
    }

    if (request.method === "POST" && request.url === RESET_ROUTE) {
      await runQueuedResponse(
        response,
        () => handleResetRequest(response),
        "Failed to reset generated deck."
      );
      return;
    }

    if (request.method === "POST" && request.url === EXPORT_PDF_ROUTE) {
      await runQueuedResponse(
        response,
        () => handleExportPdfRequest(request, response),
        "Failed to export PDF."
      );
      return;
    }

    if (request.method === "POST" && request.url === EXPORT_HTML_ROUTE) {
      await runQueuedResponse(
        response,
        () => handleExportHtmlRequest(response),
        "Failed to export HTML."
      );
      return;
    }

    if (request.method !== "POST" || request.url !== SAVE_ROUTE) {
      next();
      return;
    }

    await runQueuedResponse(
      response,
      () => handleSaveRequest(request, response),
      "Failed to save generated deck."
    );
  }

  async function runQueuedResponse(
    response: ServerResponse,
    operation: () => Promise<void>,
    fallbackMessage: string
  ) {
    try {
      await runDeckOperation(operation);
    } catch (error) {
      writeJsonError(response, error, fallbackMessage);
    }
  }

  return {
    handleDevRequest(request: IncomingMessage, response: ServerResponse, next: () => void) {
      void handleRequest(request, response, next, runtimeDeckDir);
    },
    handlePreviewRequest(request: IncomingMessage, response: ServerResponse, next: () => void) {
      void handleRequest(request, response, next, previewDeckDir);
    },
  };
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function writeJsonResponse(response: ServerResponse, statusCode: number, value: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(value));
}

function writeJsonError(response: ServerResponse, error: unknown, fallbackMessage: string) {
  writeJsonResponse(response, 500, {
    error: error instanceof Error ? error.message : fallbackMessage,
  });
}
