import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  getElementId,
  parseFixedPixelDimension,
  readBodyStyleValueFromHtmlSource,
} from "@starrykit/slides-core";
import { JSDOM, VirtualConsole } from "jsdom";

export type VerifyMode = "static" | "complete";
export type VerifyCheck = "structure" | "static-overflow" | "rendered-overflow";

export interface VerifyIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  slideFile?: string;
  selector?: string;
  details?: Record<string, unknown>;
}

export interface VerifySummary {
  errorCount: number;
  warningCount: number;
}

export interface VerifyResult {
  ok: boolean;
  deck: string;
  mode: VerifyMode;
  checks: VerifyCheck[];
  issues: VerifyIssue[];
  summary: VerifySummary;
}

export interface VerifyDeckSourceResult {
  deck: string;
  manifestPath: string;
  manifest: {
    deckTitle?: unknown;
    description?: unknown;
    generatedAt?: unknown;
    slides?: Array<{ file?: unknown; title?: unknown; hidden?: unknown }>;
  } | null;
  slideFiles: string[];
  issues: VerifyIssue[];
}

export function createVerifyIssue(
  severity: VerifyIssue["severity"],
  code: string,
  message: string,
  details?: VerifyIssue["details"]
): VerifyIssue {
  const slideFile = typeof details?.slideFile === "string" ? details.slideFile : undefined;
  const selector = typeof details?.selector === "string" ? details.selector : undefined;

  return {
    severity,
    code,
    message,
    ...(slideFile ? { slideFile } : {}),
    ...(selector ? { selector } : {}),
    ...(details ? { details } : {}),
  };
}

function issue(
  severity: VerifyIssue["severity"],
  code: string,
  message: string,
  details?: VerifyIssue["details"]
): VerifyIssue {
  return createVerifyIssue(severity, code, message, details);
}

function collectHtmlFiles(targetPath: string): string[] {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    return targetPath.endsWith(".html") ? [targetPath] : [];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function parseManifest(manifestPath: string): {
  deckTitle?: unknown;
  description?: unknown;
  generatedAt?: unknown;
  slides?: Array<{ file?: unknown; title?: unknown; hidden?: unknown }>;
} | null {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      deckTitle?: unknown;
      description?: unknown;
      generatedAt?: unknown;
      slides?: Array<{ file?: unknown; title?: unknown; hidden?: unknown }>;
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? `invalid manifest.json: ${error.message}` : "invalid manifest.json"
    );
  }
}

function validateSlideHtml(_filePath: string, slideFile: string, html: string): VerifyIssue[] {
  const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });
  const { document } = dom.window;
  const issues: VerifyIssue[] = [];

  const bodyWidthValue = readBodyStyleValueFromHtmlSource(html, "width");
  const bodyHeightValue = readBodyStyleValueFromHtmlSource(html, "height");
  const rootSize = {
    width: parseFixedPixelDimension(bodyWidthValue) ?? DEFAULT_SLIDE_WIDTH,
    height: parseFixedPixelDimension(bodyHeightValue) ?? DEFAULT_SLIDE_HEIGHT,
  };

  if (rootSize.width <= 0 || rootSize.height <= 0) {
    issues.push(
      issue("error", "structure.invalid-root-size", "slide body must resolve to a positive size", {
        slideFile,
      })
    );
  }

  const editableNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-editable]"));
  if (editableNodes.length === 0) {
    issues.push(
      issue("warning", "structure.empty-slide", "slide contains no editable nodes", {
        slideFile,
      })
    );
  }

  for (const node of editableNodes) {
    const editableType = node.getAttribute("data-editable") ?? "";
    if (!["text", "image", "block"].includes(editableType)) {
      issues.push(
        issue(
          "error",
          "structure.invalid-editable",
          `invalid data-editable value "${editableType}" on <${node.tagName.toLowerCase()}>`,
          {
            slideFile,
            selector: getElementId(node) ?? undefined,
          }
        )
      );
    }
  }

  return issues;
}

function allowsOverflow(node: HTMLElement): boolean {
  return Boolean(node.closest('[data-allow-overflow="true"]'));
}

function validateStaticOverflow(_filePath: string, slideFile: string, html: string): VerifyIssue[] {
  const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });
  const { document } = dom.window;
  const issues: VerifyIssue[] = [];
  const root = document.body;
  const candidates = [
    root,
    ...Array.from(document.querySelectorAll<HTMLElement>("[data-editable]")),
  ];

  for (const node of candidates) {
    const isRoot = node === root;
    if (!isRoot && allowsOverflow(node)) {
      continue;
    }

    const overflow = node.style.overflow.trim().toLowerCase();
    const overflowX = node.style.overflowX.trim().toLowerCase();
    const overflowY = node.style.overflowY.trim().toLowerCase();
    const hasExplicitOverflow = isRoot
      ? ["visible", "auto", "scroll"].includes(overflow) ||
        ["visible", "auto", "scroll"].includes(overflowX) ||
        ["visible", "auto", "scroll"].includes(overflowY)
      : ["auto", "scroll"].includes(overflow) ||
        ["auto", "scroll"].includes(overflowX) ||
        ["auto", "scroll"].includes(overflowY);

    if (!hasExplicitOverflow) {
      continue;
    }

    issues.push(
      issue(
        "error",
        isRoot ? "overflow.root-static" : "overflow.static",
        isRoot
          ? "slide root must not allow visible or scrolling overflow"
          : "explicit scrolling overflow is not allowed",
        {
          slideFile,
          selector: isRoot ? "body" : (getElementId(node) ?? undefined),
        }
      )
    );
  }

  return issues;
}

export function loadVerifyDeckSource(deckPath: string): VerifyDeckSourceResult {
  const deck = path.resolve(process.cwd(), deckPath);
  const manifestPath = path.join(deck, "manifest.json");
  const issues: VerifyIssue[] = [];

  if (!fs.existsSync(deck)) {
    return {
      deck,
      manifestPath,
      manifest: null,
      slideFiles: [],
      issues: [issue("error", "structure.missing-deck", "deck path does not exist")],
    };
  }

  if (!fs.existsSync(manifestPath)) {
    return {
      deck,
      manifestPath,
      manifest: null,
      slideFiles: [],
      issues: [
        issue("error", "structure.missing-manifest", "deck package is missing manifest.json"),
      ],
    };
  }

  let manifest: VerifyDeckSourceResult["manifest"] = null;
  try {
    manifest = parseManifest(manifestPath);
  } catch (error) {
    return {
      deck,
      manifestPath,
      manifest: null,
      slideFiles: [],
      issues: [
        issue(
          "error",
          "structure.invalid-manifest",
          error instanceof Error ? error.message : "invalid manifest.json"
        ),
      ],
    };
  }

  const slideFiles: string[] = [];
  const manifestSlidePaths = new Set<string>();
  if (typeof manifest?.deckTitle !== "string" || !manifest.deckTitle.trim()) {
    issues.push(
      issue("error", "structure.missing-deck-title", "manifest.json must include deckTitle")
    );
  }
  if (typeof manifest?.description !== "string" || !manifest.description.trim()) {
    issues.push(
      issue("error", "structure.missing-description", "manifest.json must include description")
    );
  }
  if (!Array.isArray(manifest?.slides) || !manifest?.slides?.length) {
    issues.push(
      issue("error", "structure.empty-manifest", "manifest.json must include at least one slide")
    );
  } else {
    for (const [index, slide] of manifest.slides.entries()) {
      if ("hidden" in slide && typeof slide.hidden !== "boolean") {
        issues.push(
          issue(
            "error",
            "structure.invalid-slide-hidden",
            `manifest slide ${index + 1} hidden must be a boolean when present`,
            {
              slideIndex: index,
              ...(typeof slide.file === "string" ? { slideFile: slide.file } : {}),
            }
          )
        );
      }

      if (typeof slide.title !== "string" || !slide.title.trim()) {
        issues.push(
          issue(
            "error",
            "structure.missing-slide-title",
            `manifest slide ${index + 1} is missing title`,
            {
              slideIndex: index,
              ...(typeof slide.file === "string" ? { slideFile: slide.file } : {}),
            }
          )
        );
      }

      if (typeof slide.file !== "string" || !slide.file.trim()) {
        issues.push(
          issue(
            "error",
            "structure.missing-slide-file",
            `manifest slide ${index + 1} is missing file`,
            { slideIndex: index }
          )
        );
        continue;
      }

      const slidePath = path.resolve(deck, slide.file);
      if (slidePath !== deck && !slidePath.startsWith(`${deck}${path.sep}`)) {
        issues.push(
          issue(
            "error",
            "structure.slide-escape",
            `manifest slide escapes deck directory: ${slide.file}`,
            {
              slideFile: slide.file,
            }
          )
        );
        continue;
      }

      if (!fs.existsSync(slidePath)) {
        issues.push(
          issue(
            "error",
            "structure.missing-slide",
            `manifest slide file does not exist: ${slide.file}`,
            {
              slideFile: slide.file,
            }
          )
        );
        continue;
      }

      slideFiles.push(slide.file);
      manifestSlidePaths.add(slidePath);
      const html = fs.readFileSync(slidePath, "utf8");
      issues.push(...validateSlideHtml(slidePath, slide.file, html));
      issues.push(...validateStaticOverflow(slidePath, slide.file, html));
    }
  }

  for (const filePath of collectHtmlFiles(deck)) {
    if (manifestSlidePaths.has(filePath)) {
      continue;
    }
    // Keep the manifest-driven contract the source of truth, but still validate
    // additional HTML fixtures inside the deck package for structural hygiene.
    const slideFile = path.relative(deck, filePath);
    const html = fs.readFileSync(filePath, "utf8");
    issues.push(...validateSlideHtml(filePath, slideFile, html));
  }

  return {
    deck,
    manifestPath,
    manifest,
    slideFiles,
    issues,
  };
}

export function createVerifyResult({
  deck,
  mode,
  checks,
  issues,
}: {
  deck: string;
  mode: VerifyMode;
  checks: VerifyCheck[];
  issues: VerifyIssue[];
}): VerifyResult {
  const errorCount = issues.filter((item) => item.severity === "error").length;
  const warningCount = issues.filter((item) => item.severity === "warning").length;

  return {
    ok: errorCount === 0,
    deck,
    mode,
    checks,
    issues,
    summary: {
      errorCount,
      warningCount,
    },
  };
}

export function verifyDeck(
  deckPath: string,
  options: { mode?: VerifyMode; renderedIssues?: VerifyIssue[] } = {}
): VerifyResult {
  const source = loadVerifyDeckSource(deckPath);
  const mode = options.mode ?? "static";
  const renderedIssues = mode === "complete" ? (options.renderedIssues ?? []) : [];
  const issues = [...source.issues, ...renderedIssues];
  return createVerifyResult({
    deck: source.deck,
    mode,
    checks:
      mode === "complete"
        ? ["structure", "static-overflow", "rendered-overflow"]
        : ["structure", "static-overflow"],
    issues,
  });
}
