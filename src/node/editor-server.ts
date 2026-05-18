import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDeckRuntimeMiddleware } from "./deck-runtime-middleware";

export interface EditorServer {
  close(): Promise<void>;
}

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function startEditorServer({
  deckPath,
  deckLibraryDir,
  port,
}: {
  deckPath: string;
  deckLibraryDir?: string;
  port: number;
}): Promise<EditorServer> {
  const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const runtime = createDeckRuntimeMiddleware({
    runtimeDeckDir: deckPath,
    previewDeckDir: deckPath,
    saveTargetDirs: [deckPath],
    deckLibraryDir,
  });

  const server = http.createServer((request, response) => {
    runtime.handlePreviewRequest(request, response, () => {
      serveAppFile(appDir, request.url ?? "/", response);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function serveAppFile(appDir: string, requestUrl: string, response: http.ServerResponse) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://127.0.0.1").pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const targetPath = path.resolve(appDir, relativePath);
  const normalizedAppDir = `${appDir}${path.sep}`;

  if (targetPath !== appDir && !targetPath.startsWith(normalizedAppDir)) {
    response.statusCode = 403;
    response.end("Forbidden");
    return;
  }

  const filePath =
    fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()
      ? targetPath
      : path.join(appDir, "index.html");

  response.statusCode = 200;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Type",
    MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream"
  );
  response.end(fs.readFileSync(filePath));
}
