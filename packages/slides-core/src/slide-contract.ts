export type EditableType = "text" | "image" | "block" | "group";

export interface EditableElement {
  id: string;
  selector: string;
  type: EditableType;
  content: string;
  tagName: string;
}

export interface SlideModel {
  id: string;
  title: string;
  htmlSource: string;
  rootSelector: string;
  width: number;
  height: number;
  elements: EditableElement[];
  sourceFile?: string;
  hidden?: boolean;
}

export interface SlideDeckManifestEntry {
  file: string;
  title?: string;
  hidden?: boolean;
  archetype?: string;
  notes?: string;
}

export interface SlideDeckManifest {
  deckTitle?: string;
  description?: string;
  generatedAt?: string;
  slides?: SlideDeckManifestEntry[];
}

export interface ImportedSlideDeck {
  manifest: SlideDeckManifest;
  slides: SlideModel[];
}

export const SELECTOR_ATTR = "data-editable-id";
export const SLIDE_ROOT_ID = "slide-root";
export const SLIDE_ROOT_SELECTOR = "body";
export const DEFAULT_SLIDE_WIDTH = 1920;
export const DEFAULT_SLIDE_HEIGHT = 1080;

export function getSlideElementSelector(elementId: string): string {
  return `[${SELECTOR_ATTR}="${elementId}"]`;
}

export function getSlideRootSelector(rootId: string): string {
  return rootId === SLIDE_ROOT_ID ? SLIDE_ROOT_SELECTOR : `[${SELECTOR_ATTR}="${rootId}"]`;
}

export function getElementId(node: Element | null): string | null {
  if (!node) {
    return null;
  }

  return node.getAttribute(SELECTOR_ATTR);
}

export function isPersistedGroupElementId(elementId: string | null | undefined): boolean {
  return typeof elementId === "string" && /^group-\d+(?:-copy(?:-\d+)?)*$/.test(elementId);
}

export function isPersistedGroupNode(node: Element | null): boolean {
  return Boolean(node && isPersistedGroupElementId(getElementId(node)));
}

export function setElementId(node: Element, id: string) {
  node.setAttribute(SELECTOR_ATTR, id);
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "slide"
  );
}

export function createElementId(index: number, type: EditableType): string {
  return `${type}-${index + 1}`;
}

export function parseDimension(value: string | null, fallback: number): number {
  const numericValue = Number.parseInt(value || "", 10);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
}

export function parseFixedPixelDimension(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)px$/i);
  if (!match) {
    return null;
  }

  const numericValue = Number.parseFloat(match[1] ?? "");
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

function readStyleDeclarationValue(styleText: string, propertyName: string): string | null {
  const pattern = new RegExp(`(?:^|;)\\s*${propertyName}\\s*:\\s*([^;]+)`, "i");
  return pattern.exec(styleText)?.[1]?.trim() ?? null;
}

function selectorTargetsBody(selectorText: string): boolean {
  return selectorText
    .split(",")
    .map((selector) => selector.trim())
    .some((selector) => /\bbody\b/i.test(selector));
}

export function readBodyStyleValueFromHtmlSource(
  html: string,
  propertyName: string
): string | null {
  const bodyTagMatch = html.match(/<body\b([^>]*)>/i);
  const bodyAttributeText = bodyTagMatch?.[1] ?? "";
  const bodyStyleMatch = bodyAttributeText.match(/\bstyle\s*=\s*["']([^"']*)["']/i);
  const inlineValue = readStyleDeclarationValue(bodyStyleMatch?.[1] ?? "", propertyName);
  if (inlineValue) {
    return inlineValue;
  }

  let matchedValue: string | null = null;
  const styleTagPattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  for (const styleMatch of html.matchAll(styleTagPattern)) {
    const cssText = styleMatch[1] ?? "";
    const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
    for (const ruleMatch of cssText.matchAll(rulePattern)) {
      const selectorText = ruleMatch[1] ?? "";
      if (!selectorTargetsBody(selectorText)) {
        continue;
      }

      const declarationValue = readStyleDeclarationValue(ruleMatch[2] ?? "", propertyName);
      if (declarationValue) {
        matchedValue = declarationValue;
      }
    }
  }

  return matchedValue;
}

export function readBodyDimensionsFromHtmlSource(html: string): { width: number; height: number } {
  return {
    width:
      parseFixedPixelDimension(readBodyStyleValueFromHtmlSource(html, "width")) ??
      DEFAULT_SLIDE_WIDTH,
    height:
      parseFixedPixelDimension(readBodyStyleValueFromHtmlSource(html, "height")) ??
      DEFAULT_SLIDE_HEIGHT,
  };
}

export function normalizeSlideId(slideId: string): string {
  return slugify(slideId);
}
