import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import {
  isEditableElement,
  isBlockEditableElement,
} from "./editable-dom";
import { parseDeckDocument } from "./slide-document";
import { SELECTOR_ATTR, SLIDE_ROOT_ATTR } from "./slide-contract";

export type VerifyMode = "static" | "complete";
export type VerifyCheck = "structure" | "css" | "static-overflow" | "rendered-overflow";

export interface VerifyIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  slideId?: string;
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
  deckFilePath: string;
  slides: VerifyDeckSlideSource[];
  issues: VerifyIssue[];
}

export interface VerifyDeckSlideSource {
  index: number;
  id: string;
  title?: string;
  hidden?: boolean;
  htmlSource: string;
}

export function createVerifyIssue(
  severity: VerifyIssue["severity"],
  code: string,
  message: string,
  details?: VerifyIssue["details"]
): VerifyIssue {
  const slideId = typeof details?.slideId === "string" ? details.slideId : undefined;
  const selector = typeof details?.selector === "string" ? details.selector : undefined;

  return {
    severity,
    code,
    message,
    ...(slideId ? { slideId } : {}),
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

function parseDeckDocumentWithNodeFallback(
  html: string,
  options: { primaryFileName?: string } = {}
): ReturnType<typeof parseDeckDocument> {
  if (typeof DOMParser !== "undefined") {
    return parseDeckDocument(html, options);
  }

  const globalScope = globalThis as unknown as Record<string, unknown>;
  const window = new JSDOM("").window;
  const originalGlobals = {
    DOMParser: globalScope.DOMParser,
    HTMLElement: globalScope.HTMLElement,
    HTMLImageElement: globalScope.HTMLImageElement,
    HTMLVideoElement: globalScope.HTMLVideoElement,
  };

  try {
    globalScope.DOMParser = window.DOMParser;
    globalScope.HTMLElement = window.HTMLElement;
    globalScope.HTMLImageElement = window.HTMLImageElement;
    globalScope.HTMLVideoElement = window.HTMLVideoElement;
    return parseDeckDocument(html, options);
  } finally {
    globalScope.DOMParser = originalGlobals.DOMParser;
    globalScope.HTMLElement = originalGlobals.HTMLElement;
    globalScope.HTMLImageElement = originalGlobals.HTMLImageElement;
    globalScope.HTMLVideoElement = originalGlobals.HTMLVideoElement;
  }
}

// ---------------------------------------------------------------------------
// CSS validation helpers
// ---------------------------------------------------------------------------

type CssRule = { selectors: string; body: string };

function extractCssRules(html: string): CssRule[] {
  const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });
  const { document } = dom.window;
  const rules: CssRule[] = [];

  for (const style of Array.from(document.querySelectorAll("style"))) {
    const text = style.textContent || "";
    const rulePattern = /([^{}]+)\{([^}]*)\}/g;
    let match: RegExpExecArray | null;

    while ((match = rulePattern.exec(text)) !== null) {
      rules.push({
        selectors: (match[1] ?? "").trim(),
        body: (match[2] ?? "").trim(),
      });
    }
  }

  return rules;
}

function hasPropertyInRuleBody(ruleBody: string, property: string): boolean {
  const pattern = new RegExp(`(?:^|;)\\s*${property}\\s*:`, "i");
  return pattern.test(ruleBody);
}

function isSelectorForTarget(selectorList: string, target: string): boolean {
  const normalizedTarget = target.toLowerCase();
  return selectorList
    .split(",")
    .some((s) => s.trim().toLowerCase() === normalizedTarget);
}

function hasPropertyForTarget(
  rules: CssRule[],
  target: string,
  property: string
): boolean {
  return rules.some(
    (r) =>
      isSelectorForTarget(r.selectors, target) &&
      hasPropertyInRuleBody(r.body, property)
  );
}

interface RequiredCssCheck {
  target: string;
  property: string;
  code: string;
  message: string;
}

const REQUIRED_CSS_CHECKS: RequiredCssCheck[] = [
  {
    target: "slides",
    property: "display",
    code: "css.slides-missing-display",
    message: "`slides` must have `display: block`",
  },
  {
    target: "slide",
    property: "display",
    code: "css.slide-missing-display",
    message: "`slide` must have `display: block`",
  },
  {
    target: "slide",
    property: "width",
    code: "css.slide-missing-width",
    message: "`slide` must have a CSS `width` (e.g. `1920px`)",
  },
  {
    target: "slide",
    property: "height",
    code: "css.slide-missing-height",
    message: "`slide` must have a CSS `height` (e.g. `1080px`)",
  },
  {
    target: "slide",
    property: "overflow",
    code: "css.slide-missing-overflow",
    message: "`slide` must have `overflow: hidden`",
  },
  {
    target: "slide",
    property: "position",
    code: "css.slide-missing-position",
    message: "`slide` must have `position: relative`",
  },
  {
    target: "body",
    property: "margin",
    code: "css.body-missing-margin",
    message: "`body` must have `margin: 0`",
  },
];

function validateCss(
  _filePath: string,
  slideId: string,
  html: string
): VerifyIssue[] {
  const rules = extractCssRules(html);
  const issues: VerifyIssue[] = [];

  const hasStyleTag = /<style[\s>]/i.test(html) || /<style\s*\/>/i.test(html);
  if (!hasStyleTag) {
    issues.push(
      issue("error", "css.missing-style-block", "deck must include a <style> block", {
        slideId,
      })
    );
    return issues;
  }

  for (const check of REQUIRED_CSS_CHECKS) {
    if (!hasPropertyForTarget(rules, check.target, check.property)) {
      issues.push(issue("error", check.code, check.message, { slideId }));
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Structure validation
// ---------------------------------------------------------------------------

function validateSlideHtml(_filePath: string, slideId: string, html: string): VerifyIssue[] {
  const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });
  const { document } = dom.window;
  const issues: VerifyIssue[] = [];

  const editableNodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[${SLIDE_ROOT_ATTR}] *`)
  ).filter(isEditableElement);
  if (editableNodes.length === 0) {
    issues.push(
      issue("warning", "structure.empty-slide", "slide contains no editable nodes", {
        slideId,
      })
    );
  }

  for (const node of Array.from(document.querySelectorAll<HTMLElement>("[data-editable]"))) {
    if (node.hasAttribute("data-editable")) {
      issues.push(
        issue(
          "error",
          "structure.legacy-editable-attr",
          "data-editable is not allowed in authored deck HTML",
          {
            slideId,
            selector: node.getAttribute(SELECTOR_ATTR) ?? undefined,
          }
        )
      );
    }
  }

  for (const node of Array.from(document.querySelectorAll<HTMLElement>('[data-group="true"]'))) {
    const isBlockEditable = isBlockEditableElement(node);
    if (!isBlockEditable) {
      issues.push(
        issue(
          "error",
          "structure.invalid-group",
          'data-group="true" is only allowed on block editables',
          {
            slideId,
            selector: node.getAttribute(SELECTOR_ATTR) ?? undefined,
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

function validateStaticOverflow(_filePath: string, slideId: string, html: string): VerifyIssue[] {
  const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });
  const { document } = dom.window;
  const issues: VerifyIssue[] = [];
  const candidates = [
    document.querySelector<HTMLElement>(`[${SLIDE_ROOT_ATTR}]`),
    ...Array.from(document.querySelectorAll<HTMLElement>(`[${SLIDE_ROOT_ATTR}] *`)).filter(
      isEditableElement
    ),
  ].filter((node): node is HTMLElement => Boolean(node));

  for (const node of candidates) {
    if (allowsOverflow(node)) {
      continue;
    }

    const overflow = node.style.overflow.trim().toLowerCase();
    const overflowX = node.style.overflowX.trim().toLowerCase();
    const overflowY = node.style.overflowY.trim().toLowerCase();
    const hasExplicitOverflow =
      ["auto", "scroll"].includes(overflow) ||
      ["auto", "scroll"].includes(overflowX) ||
      ["auto", "scroll"].includes(overflowY);

    if (!hasExplicitOverflow) {
      continue;
    }

    issues.push(
      issue("error", "overflow.static", "explicit scrolling overflow is not allowed", {
        slideId,
        selector: node.getAttribute(SELECTOR_ATTR) ?? undefined,
      })
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Deck loading and verification
// ---------------------------------------------------------------------------

export function loadVerifyDeckSource(deckPath: string): VerifyDeckSourceResult {
  const resolvedPath = path.resolve(process.cwd(), deckPath);
  const deckStat = fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath) : null;
  const deck =
    deckStat?.isFile() && resolvedPath.endsWith(".html")
      ? path.dirname(resolvedPath)
      : resolvedPath;
  const deckFilePath =
    deckStat?.isFile() && resolvedPath.endsWith(".html")
      ? resolvedPath
      : path.join(deck, "deck.html");
  const issues: VerifyIssue[] = [];

  if (!deckStat && !fs.existsSync(deck)) {
    return {
      deck,
      deckFilePath,
      slides: [],
      issues: [issue("error", "structure.missing-deck", "deck path does not exist")],
    };
  }

  if (!fs.existsSync(deckFilePath)) {
    return {
      deck,
      deckFilePath,
      slides: [],
      issues: [issue("error", "structure.missing-deck", "deck.html does not exist")],
    };
  }

  const html = fs.readFileSync(deckFilePath, "utf8");
  const parsedDeck = parseDeckDocumentWithNodeFallback(html, {
    primaryFileName: path.basename(deckFilePath),
  });
  if (!parsedDeck) {
    return {
      deck,
      deckFilePath,
      slides: [],
      issues: [
        issue(
          "error",
          "structure.invalid-deck",
          "deck.html must contain a valid <slides>/<slide> document"
        ),
      ],
    };
  }

  const slides = parsedDeck.slides.map((slide, index) => ({
    index,
    id: slide.id,
    title: slide.title,
    hidden: slide.hidden === true,
    htmlSource: slide.htmlSource,
  }));

  if (slides.length === 0) {
    issues.push(
      issue("error", "structure.empty-deck", "deck.html must include at least one <slide>")
    );
  }

  for (const slide of slides) {
    issues.push(...validateSlideHtml(deckFilePath, slide.id, slide.htmlSource));
    issues.push(...validateCss(deckFilePath, slide.id, slide.htmlSource));
    issues.push(...validateStaticOverflow(deckFilePath, slide.id, slide.htmlSource));
  }

  return {
    deck,
    deckFilePath,
    slides,
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
        ? ["structure", "css", "static-overflow", "rendered-overflow"]
        : ["structure", "css", "static-overflow"],
    issues,
  });
}
