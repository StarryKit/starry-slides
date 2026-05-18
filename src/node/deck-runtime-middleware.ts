import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { type PdfExportSelection, createSafeExportFilenameBase } from "@starrykit/slides-core";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import { exportHtml } from "./html-export";
import { exportPdf } from "./pdf-export";
import { exportSourceFiles } from "./source-files-export";

const SAVE_ROUTE = "/__editor/save-generated-deck";
const RESET_ROUTE = "/__editor/reset-generated-deck";
const DECKS_ROUTE = "/__editor/decks";
const SELECT_DECK_ROUTE = "/__editor/select-deck";
const IMPORT_DECK_ROUTE = "/__editor/import-deck";
const PICK_DECK_PATH_ROUTE = "/__editor/pick-deck-path";
const EXPORT_PDF_ROUTE = "/__editor/export-pdf";
const EXPORT_HTML_ROUTE = "/__editor/export-html";
const EXPORT_SOURCE_FILES_ROUTE = "/__editor/export-source-files";
const DECK_ROUTE_PREFIX = "/deck/";
const NOT_FOUND_ERROR_CODE = "ENOENT";
const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".htm": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const execFileAsync = promisify(execFile);

interface SaveGeneratedDeckPayload {
  clientLoadedAt?: number;
  manifest?: {
    deckTitle?: string;
    description?: string;
    generatedAt?: string;
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

interface ImportDeckPayload {
  path?: unknown;
  files?: Array<{
    path?: string;
    contentsBase64?: string;
  }>;
}

interface DeckFileSnapshot {
  relativePath: string;
  contents: Buffer;
}

interface DeckRuntimeMiddlewareOptions {
  runtimeDeckDir: string;
  previewDeckDir: string;
  saveTargetDirs: string[];
  deckLibraryDir?: string;
  deckPathPicker?: () => Promise<string | null>;
}

export interface DeckRuntimeMiddleware {
  handleDevRequest(request: IncomingMessage, response: ServerResponse, next: () => void): void;
  handlePreviewRequest(request: IncomingMessage, response: ServerResponse, next: () => void): void;
}

export function createDeckRuntimeMiddlewarePlugin({
  runtimeDeckDir,
  previewDeckDir,
  saveTargetDirs,
  deckLibraryDir,
  deckPathPicker,
}: DeckRuntimeMiddlewareOptions): Plugin {
  const runtime = createDeckRuntimeMiddleware({
    runtimeDeckDir,
    previewDeckDir,
    saveTargetDirs,
    deckLibraryDir,
    deckPathPicker,
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

export function createDeckRuntimeMiddleware({
  runtimeDeckDir,
  previewDeckDir,
  saveTargetDirs,
  deckLibraryDir,
  deckPathPicker = pickDeckPath,
}: DeckRuntimeMiddlewareOptions): DeckRuntimeMiddleware {
  const initialRuntimeDeckDir = path.resolve(runtimeDeckDir);
  const initialPreviewDeckDir = path.resolve(previewDeckDir);
  const initialSaveTargetDirs = saveTargetDirs.map((targetDir) => path.resolve(targetDir));
  const resolvedDeckLibraryDir = path.resolve(
    deckLibraryDir ?? path.dirname(initialRuntimeDeckDir)
  );
  let selectedDeckDir = initialRuntimeDeckDir;
  let lastResetCompletedAt = 0;
  let deckOperationQueue: Promise<void> = Promise.resolve();
  let resetSnapshot: DeckFileSnapshot[] = [];
  let resetSnapshotPromise: Promise<void> | null = null;

  function getActiveDeckDir(defaultAssetDeckDir = initialRuntimeDeckDir) {
    if (selectedDeckDir === initialRuntimeDeckDir) {
      return defaultAssetDeckDir;
    }

    return selectedDeckDir;
  }

  function getActiveSaveTargetDirs() {
    if (selectedDeckDir === initialRuntimeDeckDir && initialSaveTargetDirs.length > 0) {
      return initialSaveTargetDirs;
    }

    return [selectedDeckDir];
  }

  async function getDeckListResponse() {
    const decks = await discoverLocalDecks({
      libraryDir: resolvedDeckLibraryDir,
      currentDeckDir: selectedDeckDir,
    });
    const currentDeck = decks.find((deck) => deck.isCurrent) ?? null;

    return {
      decks: decks.map(({ deckDir: _deckDir, ...deck }) => deck),
      currentDeckId: currentDeck?.id ?? null,
    };
  }

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
      resetSnapshotPromise = readDeckSnapshot(initialRuntimeDeckDir).then((snapshot) => {
        resetSnapshot = snapshot;
      });
    }

    await resetSnapshotPromise;
  }

  async function handleSaveRequest(request: IncomingMessage, response: ServerResponse) {
    const payload = JSON.parse(await readRequestBody(request)) as SaveGeneratedDeckPayload;
    const activeDeckDir = getActiveDeckDir();
    const activeSaveTargetDirs = getActiveSaveTargetDirs();
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
          activeSaveTargetDirs.map(async (targetRoot) => {
            const targetPath = path.join(targetRoot, slide.file);
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.writeFile(targetPath, slide.htmlSource, "utf8");
          })
        );
      })
    );

    if (payload.manifest?.slides?.length) {
      const manifestPath = path.join(activeSaveTargetDirs[0] ?? activeDeckDir, "manifest.json");
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
        activeSaveTargetDirs
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
    selectedDeckDir = initialRuntimeDeckDir;
    lastResetCompletedAt = Date.now();
    await Promise.all(initialSaveTargetDirs.map((targetRoot) => restoreDeckSnapshot(targetRoot)));
    writeJsonResponse(response, 200, { ok: true });
  }

  async function handleDecksRequest(response: ServerResponse) {
    writeJsonResponse(response, 200, await getDeckListResponse());
  }

  async function handleSelectDeckRequest(request: IncomingMessage, response: ServerResponse) {
    const payload = JSON.parse(await readRequestBody(request)) as { deckId?: unknown };
    const deckId = typeof payload.deckId === "string" ? payload.deckId : "";

    if (!deckId) {
      writeJsonResponse(response, 400, { error: "deckId is required." });
      return;
    }

    const decks = await discoverLocalDecks({
      libraryDir: resolvedDeckLibraryDir,
      currentDeckDir: selectedDeckDir,
    });
    const deck = decks.find((candidate) => candidate.id === deckId);

    if (!deck) {
      writeJsonResponse(response, 404, { error: "Deck was not found in the configured library." });
      return;
    }

    selectedDeckDir = deck.deckDir;
    writeJsonResponse(response, 200, await getDeckListResponse());
  }

  async function handleImportDeckRequest(request: IncomingMessage, response: ServerResponse) {
    const payload = JSON.parse(await readRequestBody(request)) as ImportDeckPayload;
    if (typeof payload.path === "string") {
      const deckDir = await resolveImportDeckDir(payload.path);
      if (!deckDir) {
        writeJsonResponse(response, 400, {
          error: "Deck path must point to a folder with manifest.json or to manifest.json.",
        });
        return;
      }

      selectedDeckDir = deckDir;
      writeJsonResponse(response, 200, await getDeckListResponse());
      return;
    }

    const files = payload.files?.filter(
      (file): file is { path: string; contentsBase64: string } =>
        typeof file.path === "string" && typeof file.contentsBase64 === "string"
    );

    if (!files?.length) {
      writeJsonResponse(response, 400, { error: "Deck files are required." });
      return;
    }

    const manifestEntry = files
      .map((file) => ({
        file,
        segments: getSafeImportPathSegments(file.path),
      }))
      .find((entry) => entry.segments[entry.segments.length - 1] === "manifest.json");
    const manifestFile = manifestEntry?.file;
    if (!manifestFile) {
      writeJsonResponse(response, 400, { error: "Imported deck must include manifest.json." });
      return;
    }
    const importRootSegments = manifestEntry.segments.slice(0, -1);

    let manifestTitle = "";
    try {
      const manifest = JSON.parse(
        Buffer.from(manifestFile.contentsBase64, "base64").toString("utf8")
      ) as { deckTitle?: unknown };
      manifestTitle = typeof manifest.deckTitle === "string" ? manifest.deckTitle : "";
    } catch {
      writeJsonResponse(response, 400, { error: "Imported manifest.json is invalid." });
      return;
    }

    const deckSlug = createDeckDirectorySlug(manifestTitle || path.dirname(manifestFile.path));
    const importedDeckDir = await createAvailableDeckDirectory(resolvedDeckLibraryDir, deckSlug);

    for (const file of files) {
      const normalizedPath = normalizeImportPath(file.path, importRootSegments);
      if (!normalizedPath || normalizedPath.startsWith(".starry-slides/")) {
        continue;
      }

      const targetPath = path.resolve(importedDeckDir, normalizedPath);
      const normalizedRoot = `${importedDeckDir}${path.sep}`;
      if (targetPath !== importedDeckDir && !targetPath.startsWith(normalizedRoot)) {
        writeJsonResponse(response, 400, { error: "Imported deck contains an unsafe file path." });
        return;
      }

      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, Buffer.from(file.contentsBase64, "base64"));
    }

    selectedDeckDir = importedDeckDir;
    writeJsonResponse(response, 200, await getDeckListResponse());
  }

  async function handlePickDeckPathRequest(response: ServerResponse) {
    const pickedPath = await deckPathPicker();
    if (!pickedPath) {
      writeJsonResponse(response, 200, { path: null });
      return;
    }

    const deckDir = await resolveImportDeckDir(pickedPath);
    if (!deckDir) {
      writeJsonResponse(response, 400, {
        error: "Selected path must point to a folder with manifest.json or to manifest.json.",
      });
      return;
    }

    writeJsonResponse(response, 200, { path: deckDir });
  }

  async function handleExportPdfRequest(request: IncomingMessage, response: ServerResponse) {
    const body = await readRequestBody(request);
    const payload = body ? (JSON.parse(body) as ExportPdfPayload) : {};
    const activeDeckDir = getActiveDeckDir();
    const outFile = path.join(activeDeckDir, ".starry-slides", "export", "deck.pdf");
    const exportFilenameBase = await getExportFilenameBase(activeDeckDir);
    const result = await exportPdf({
      deckPath: activeDeckDir,
      outFile,
      selection: payload.selection,
    });
    const contents = await fs.readFile(result.path);

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${exportFilenameBase}.pdf"`);
    response.end(contents);
  }

  async function handleExportHtmlRequest(response: ServerResponse) {
    const activeDeckDir = getActiveDeckDir();
    const outFile = path.join(activeDeckDir, ".starry-slides", "export", "deck.html");
    const exportFilenameBase = await getExportFilenameBase(activeDeckDir);
    const result = await exportHtml({
      deckPath: activeDeckDir,
      outFile,
    });
    const contents = await fs.readFile(result.path);

    response.statusCode = 200;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="${exportFilenameBase}.html"`);
    response.end(contents);
  }

  async function handleExportSourceFilesRequest(response: ServerResponse) {
    const activeDeckDir = getActiveDeckDir();
    const outFile = path.join(activeDeckDir, ".starry-slides", "export", "deck-source-files.zip");
    const exportFilenameBase = await getExportFilenameBase(activeDeckDir);
    const result = await exportSourceFiles({
      deckPath: activeDeckDir,
      outFile,
    });
    const contents = await fs.readFile(result.path);

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/zip");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${exportFilenameBase}-source-files.zip"`
    );
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
      response.setHeader("Content-Type", getContentType(targetPath));
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

    if (request.method === "GET" && request.url === DECKS_ROUTE) {
      await runQueuedResponse(
        response,
        () => handleDecksRequest(response),
        "Failed to list decks."
      );
      return;
    }

    if (request.method === "POST" && request.url === SELECT_DECK_ROUTE) {
      await runQueuedResponse(
        response,
        () => handleSelectDeckRequest(request, response),
        "Failed to select deck."
      );
      return;
    }

    if (request.method === "POST" && request.url === IMPORT_DECK_ROUTE) {
      await runQueuedResponse(
        response,
        () => handleImportDeckRequest(request, response),
        "Failed to import deck."
      );
      return;
    }

    if (request.method === "POST" && request.url === PICK_DECK_PATH_ROUTE) {
      await runQueuedResponse(
        response,
        () => handlePickDeckPathRequest(response),
        "Failed to pick a deck path."
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

    if (request.method === "POST" && request.url === EXPORT_SOURCE_FILES_ROUTE) {
      await runQueuedResponse(
        response,
        () => handleExportSourceFilesRequest(response),
        "Failed to export source files."
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
      void handleRequest(request, response, next, getActiveDeckDir(initialRuntimeDeckDir));
    },
    handlePreviewRequest(request: IncomingMessage, response: ServerResponse, next: () => void) {
      void handleRequest(request, response, next, getActiveDeckDir(initialPreviewDeckDir));
    },
  };
}

interface DiscoveredLocalDeck {
  id: string;
  title: string;
  description?: string;
  directoryName: string;
  relativePath: string;
  isCurrent: boolean;
  deckDir: string;
}

async function getManifestDeckTitle(deckDir: string) {
  const manifest = JSON.parse(await fs.readFile(path.join(deckDir, "manifest.json"), "utf8")) as {
    deckTitle?: unknown;
    description?: unknown;
  };

  return {
    title:
      typeof manifest.deckTitle === "string" && manifest.deckTitle.trim()
        ? manifest.deckTitle
        : path.basename(deckDir),
    description: typeof manifest.description === "string" ? manifest.description : undefined,
  };
}

async function pathContainsManifest(deckDir: string) {
  try {
    const stat = await fs.stat(path.join(deckDir, "manifest.json"));
    return stat.isFile();
  } catch {
    return false;
  }
}

async function resolveImportDeckDir(rawPath: string) {
  const trimmedPath = rawPath.trim();
  if (!trimmedPath) {
    return null;
  }

  const resolvedPath = path.resolve(expandHomePath(trimmedPath));

  try {
    const stat = await fs.stat(resolvedPath);
    const deckDir = stat.isFile() ? path.dirname(resolvedPath) : resolvedPath;
    const manifestPath = stat.isFile() ? resolvedPath : path.join(deckDir, "manifest.json");

    if (path.basename(manifestPath) !== "manifest.json") {
      return null;
    }

    if (!(await pathContainsManifest(deckDir))) {
      return null;
    }

    return deckDir;
  } catch {
    return null;
  }
}

function expandHomePath(value: string) {
  if (value === "~") {
    return os.homedir();
  }

  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(os.homedir(), value.slice(2));
  }

  return value;
}

async function pickDeckPath() {
  if (process.env.STARRY_SLIDES_PICK_DECK_PATH) {
    return process.env.STARRY_SLIDES_PICK_DECK_PATH;
  }

  if (process.platform === "darwin") {
    return pickDeckPathMac();
  }

  if (process.platform === "win32") {
    return pickDeckPathWindows();
  }

  return pickDeckPathLinux();
}

async function pickDeckPathMac() {
  const script = [
    'set pickedFolder to choose folder with prompt "Choose a Starry Slides deck folder"',
    "POSIX path of pickedFolder",
  ].join("\n");

  return runPickerCommand("osascript", ["-e", script]);
}

async function pickDeckPathWindows() {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Choose a Starry Slides deck folder"
$dialog.ShowNewFolderButton = $false
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.SelectedPath)
}
`.trim();

  return runPickerCommand("powershell.exe", [
    "-NoProfile",
    "-STA",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ]);
}

async function pickDeckPathLinux() {
  const zenityPath = await runPickerCommand("sh", ["-c", "command -v zenity"]).catch(() => null);
  if (zenityPath) {
    return runPickerCommand(zenityPath, [
      "--file-selection",
      "--directory",
      "--title=Choose a Starry Slides deck folder",
    ]);
  }

  const kdialogPath = await runPickerCommand("sh", ["-c", "command -v kdialog"]).catch(() => null);
  if (kdialogPath) {
    return runPickerCommand(kdialogPath, ["--getexistingdirectory", os.homedir()]);
  }

  throw new Error("No supported system folder picker was found.");
}

async function runPickerCommand(command: string, args: string[]) {
  try {
    const { stdout } = await execFileAsync(command, args, {
      windowsHide: false,
    });
    const pickedPath = stdout.trim();
    return pickedPath || null;
  } catch (error) {
    if (isCancelledPickerError(error)) {
      return null;
    }

    throw error;
  }
}

function isCancelledPickerError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return error.code === 1;
}

export async function discoverLocalDecks({
  libraryDir,
  currentDeckDir,
}: {
  libraryDir: string;
  currentDeckDir: string;
}): Promise<DiscoveredLocalDeck[]> {
  const candidates = new Map<string, string>();
  const addCandidate = async (deckDir: string) => {
    const resolvedDeckDir = path.resolve(deckDir);
    if (await pathContainsManifest(resolvedDeckDir)) {
      candidates.set(resolvedDeckDir, resolvedDeckDir);
    }
  };

  await addCandidate(libraryDir);

  try {
    const entries = await fs.readdir(libraryDir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isDirectory()) {
          await addCandidate(path.join(libraryDir, entry.name));
        }
      })
    );
  } catch {
    // A missing or unreadable library simply yields the current deck below if it is valid.
  }

  await addCandidate(currentDeckDir);

  const decks = await Promise.all(
    Array.from(candidates.values()).map(async (deckDir): Promise<DiscoveredLocalDeck | null> => {
      try {
        const manifestInfo = await getManifestDeckTitle(deckDir);
        const relativeFromLibrary = path.relative(libraryDir, deckDir);
        const isInsideLibrary =
          relativeFromLibrary === "" ||
          (!relativeFromLibrary.startsWith("..") && !path.isAbsolute(relativeFromLibrary));
        const relativePath = isInsideLibrary ? relativeFromLibrary || "." : path.basename(deckDir);

        return {
          id: isInsideLibrary ? relativePath.split(path.sep).join("/") : "__current__",
          title: manifestInfo.title,
          description: manifestInfo.description,
          directoryName: path.basename(deckDir),
          relativePath,
          isCurrent: deckDir === path.resolve(currentDeckDir),
          deckDir,
        };
      } catch {
        return null;
      }
    })
  );

  return decks
    .filter((deck): deck is DiscoveredLocalDeck => Boolean(deck))
    .sort(
      (left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
    );
}

function getContentType(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function getSafeImportPathSegments(filePath: string) {
  const segments = filePath
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== ".");

  if (segments.includes("..")) {
    return [];
  }

  return segments;
}

function normalizeImportPath(filePath: string, rootSegments: string[]) {
  const segments = getSafeImportPathSegments(filePath);
  const normalizedSegments = rootSegments.every((segment, index) => segments[index] === segment)
    ? segments.slice(rootSegments.length)
    : segments;

  return normalizedSegments.join("/");
}

function createDeckDirectorySlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "imported-deck";
}

async function createAvailableDeckDirectory(libraryDir: string, baseName: string) {
  await fs.mkdir(libraryDir, { recursive: true });

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const directoryName = suffix === 0 ? baseName : `${baseName}-${suffix + 1}`;
    const candidate = path.resolve(libraryDir, directoryName);
    const normalizedLibraryDir = `${path.resolve(libraryDir)}${path.sep}`;

    if (candidate !== path.resolve(libraryDir) && !candidate.startsWith(normalizedLibraryDir)) {
      continue;
    }

    try {
      await fs.mkdir(candidate);
      return candidate;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not create a unique deck directory.");
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

async function getExportFilenameBase(deckDir: string) {
  const manifestPath = path.join(deckDir, "manifest.json");

  try {
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
      deckTitle?: unknown;
    };
    return createSafeExportFilenameBase(
      typeof manifest.deckTitle === "string" ? manifest.deckTitle : path.basename(deckDir)
    );
  } catch {
    return createSafeExportFilenameBase(path.basename(deckDir));
  }
}
