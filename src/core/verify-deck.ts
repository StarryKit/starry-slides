import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const VALID_EDITABLE_TYPES = new Set(["text", "image", "block"]);

export interface VerifyDeckIssue {
  filePath: string;
  message: string;
  severity: "error" | "warning";
}

export interface VerifyDeckResult {
  deckDir: string;
  filesChecked: number;
  issues: VerifyDeckIssue[];
}

function collectHtmlFiles(targetPath: string): string[] {
  const resolvedPath = path.resolve(process.cwd(), targetPath);
  const stat = fs.statSync(resolvedPath);

  if (stat.isFile()) {
    return [resolvedPath];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(resolvedPath, { withFileTypes: true })) {
    const entryPath = path.join(resolvedPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function issue(filePath: string, severity: VerifyDeckIssue["severity"], message: string) {
  return { filePath, severity, message } satisfies VerifyDeckIssue;
}

function validateFile(filePath: string): VerifyDeckIssue[] {
  const html = fs.readFileSync(filePath, "utf8");
  const dom = new JSDOM(html, {
    virtualConsole: new VirtualConsole(),
  });
  const { document } = dom.window;
  const issues: VerifyDeckIssue[] = [];
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-slide-root="true"]'));

  if (roots.length === 0) {
    issues.push(issue(filePath, "error", 'missing required [data-slide-root="true"]'));
  }

  if (roots.length > 1) {
    issues.push(issue(filePath, "error", "found multiple slide roots"));
  }

  const root = roots[0] ?? null;
  if (root) {
    if (!root.getAttribute("data-slide-width")) {
      issues.push(
        issue(filePath, "warning", "missing data-slide-width, default 1920 will be assumed")
      );
    }
    if (!root.getAttribute("data-slide-height")) {
      issues.push(
        issue(filePath, "warning", "missing data-slide-height, default 1080 will be assumed")
      );
    }
    if (!root.getAttribute("data-archetype")) {
      issues.push(issue(filePath, "warning", "missing optional data-archetype hint"));
    }
  }

  const editableNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-editable]"));
  if (editableNodes.length === 0) {
    issues.push(issue(filePath, "warning", "slide contains no editable nodes"));
  }

  for (const node of editableNodes) {
    const editableType = node.getAttribute("data-editable") ?? "";
    if (!VALID_EDITABLE_TYPES.has(editableType)) {
      issues.push(
        issue(
          filePath,
          "error",
          `invalid data-editable value "${editableType}" on <${node.tagName.toLowerCase()}>`
        )
      );
      continue;
    }

    if (editableType === "image" && node.tagName.toLowerCase() !== "img") {
      issues.push(
        issue(
          filePath,
          "warning",
          `editable image is <${node.tagName.toLowerCase()}> instead of <img>; parser support may be limited`
        )
      );
    }
  }

  return issues;
}

export function verifyDeck(deckPath: string): VerifyDeckResult {
  const deckDir = path.resolve(process.cwd(), deckPath);
  const manifestPath = path.join(deckDir, "manifest.json");
  const issues: VerifyDeckIssue[] = [];

  if (!fs.existsSync(deckDir)) {
    return {
      deckDir,
      filesChecked: 0,
      issues: [issue(deckDir, "error", "deck path does not exist")],
    };
  }

  if (!fs.existsSync(manifestPath)) {
    return {
      deckDir,
      filesChecked: 0,
      issues: [issue(manifestPath, "error", "deck package is missing manifest.json")],
    };
  }

  let manifest: { slides?: Array<{ file?: unknown }> };
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      slides?: Array<{ file?: unknown }>;
    };
  } catch (error) {
    return {
      deckDir,
      filesChecked: 0,
      issues: [
        issue(
          manifestPath,
          "error",
          error instanceof Error
            ? `invalid manifest.json: ${error.message}`
            : "invalid manifest.json"
        ),
      ],
    };
  }

  if (!Array.isArray(manifest.slides) || manifest.slides.length === 0) {
    issues.push(issue(manifestPath, "error", "manifest.json must include at least one slide"));
  }

  for (const [index, slide] of manifest.slides?.entries() ?? []) {
    if (typeof slide.file !== "string" || !slide.file.trim()) {
      issues.push(issue(manifestPath, "error", `manifest slide ${index + 1} is missing file`));
      continue;
    }

    const slidePath = path.resolve(deckDir, slide.file);
    const normalizedDeckDir = `${deckDir}${path.sep}`;
    if (slidePath !== deckDir && !slidePath.startsWith(normalizedDeckDir)) {
      issues.push(
        issue(manifestPath, "error", `manifest slide escapes deck directory: ${slide.file}`)
      );
      continue;
    }

    if (!fs.existsSync(slidePath)) {
      issues.push(
        issue(manifestPath, "error", `manifest slide file does not exist: ${slide.file}`)
      );
    }
  }

  const htmlFiles = collectHtmlFiles(deckDir);
  for (const filePath of htmlFiles) {
    issues.push(...validateFile(filePath));
  }

  return {
    deckDir,
    filesChecked: htmlFiles.length,
    issues,
  };
}

export function formatVerifyDeckResult(result: VerifyDeckResult): string {
  const lines: string[] = [];
  const errorCount = result.issues.filter((item) => item.severity === "error").length;
  const warningCount = result.issues.filter((item) => item.severity === "warning").length;

  for (const item of result.issues) {
    lines.push(`${item.severity.toUpperCase()} ${item.filePath}`);
    lines.push(`  ${item.message}`);
  }

  lines.push(
    `Validated ${result.filesChecked} file(s); ${errorCount} error(s), ${warningCount} warning(s).`
  );

  return lines.join("\n");
}

export function hasVerifyErrors(result: VerifyDeckResult): boolean {
  return result.issues.some((item) => item.severity === "error");
}
