export type EditableType = "text" | "image" | "block";

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
}

export interface TextUpdateOperation {
  type: "text.update";
  slideId: string;
  elementId: string;
  previousText: string;
  nextText: string;
  timestamp: number;
}

export interface StyleUpdateOperation {
  type: "style.update";
  slideId: string;
  elementId: string;
  propertyName: string;
  previousValue: string;
  nextValue: string;
  timestamp: number;
}

export const ELEMENT_LAYOUT_STYLE_KEYS = [
  "position",
  "left",
  "top",
  "width",
  "height",
  "transform",
  "transformOrigin",
  "margin",
  "zIndex",
] as const;

export type ElementLayoutStyleKey = (typeof ELEMENT_LAYOUT_STYLE_KEYS)[number];

export type ElementLayoutStyleSnapshot = Record<ElementLayoutStyleKey, string | null>;

export interface ElementLayoutUpdateOperation {
  type: "element.layout.update";
  slideId: string;
  elementId: string;
  previousStyle: ElementLayoutStyleSnapshot;
  nextStyle: ElementLayoutStyleSnapshot;
  timestamp: number;
}

export type SlideOperation =
  | TextUpdateOperation
  | StyleUpdateOperation
  | ElementLayoutUpdateOperation;

export interface HistoryState {
  slides: SlideModel[];
  undoStack: SlideOperation[];
  redoStack: SlideOperation[];
}

export type HistoryAction =
  | {
      type: "history.reset";
      slides: SlideModel[];
    }
  | {
      type: "history.commit";
      operation: SlideOperation;
    }
  | {
      type: "history.undo";
    }
  | {
      type: "history.redo";
    };

export interface SlideDeckManifestEntry {
  file: string;
  title?: string;
}

export interface SlideDeckManifest {
  topic?: string;
  slides?: SlideDeckManifestEntry[];
}

export interface ImportedSlideDeck {
  manifest: SlideDeckManifest;
  slides: SlideModel[];
}

export interface LoadSlidesFromManifestOptions {
  manifestUrl: string;
  fetchImpl?: typeof fetch;
  requestInit?: RequestInit;
  slideIdPrefix?: string;
}

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageGeometry {
  scale: number;
  offsetX: number;
  offsetY: number;
  slideWidth: number;
  slideHeight: number;
}

export const SELECTOR_ATTR = "data-editor-id";
export const SLIDE_ROOT_ATTR = "data-slide-root";
export const DEFAULT_SLIDE_WIDTH = 1920;
export const DEFAULT_SLIDE_HEIGHT = 1080;

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "slide"
  );
}

function createElementId(index: number, type: EditableType): string {
  return `${type}-${index + 1}`;
}

function parseDimension(value: string | null, fallback: number): number {
  const numericValue = Number.parseInt(value || "", 10);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
}

function ensureSlideRoot(doc: Document): HTMLElement | null {
  const existingRoot = doc.querySelector<HTMLElement>(`[${SLIDE_ROOT_ATTR}]`);
  if (existingRoot) {
    if (!existingRoot.getAttribute("data-slide-width")) {
      existingRoot.setAttribute("data-slide-width", String(DEFAULT_SLIDE_WIDTH));
    }
    if (!existingRoot.getAttribute("data-slide-height")) {
      existingRoot.setAttribute("data-slide-height", String(DEFAULT_SLIDE_HEIGHT));
    }
    return existingRoot;
  }

  const container = doc.querySelector<HTMLElement>(".slide-container");
  if (container) {
    container.setAttribute(SLIDE_ROOT_ATTR, "true");
    if (!container.getAttribute("data-slide-width")) {
      container.setAttribute("data-slide-width", String(DEFAULT_SLIDE_WIDTH));
    }
    if (!container.getAttribute("data-slide-height")) {
      container.setAttribute("data-slide-height", String(DEFAULT_SLIDE_HEIGHT));
    }
    return container;
  }

  return null;
}

export function ensureEditableSelectors(html: string): string {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const root = ensureSlideRoot(doc);
  const editableNodes = Array.from(doc.querySelectorAll<HTMLElement>("[data-editable]"));

  if (root && !root.getAttribute(SELECTOR_ATTR)) {
    root.setAttribute(SELECTOR_ATTR, "slide-root");
  }

  editableNodes.forEach((node, index) => {
    if (!node.getAttribute(SELECTOR_ATTR)) {
      const type = (node.getAttribute("data-editable") || "block") as EditableType;
      node.setAttribute(SELECTOR_ATTR, createElementId(index, type));
    }
  });

  return `<!DOCTYPE html>
${doc.documentElement.outerHTML}`;
}

export function parseSlide(html: string, slideId = "slide-1"): SlideModel {
  if (typeof DOMParser === "undefined") {
    return {
      id: slideId,
      title: "Untitled Slide",
      htmlSource: html,
      rootSelector: `[${SLIDE_ROOT_ATTR}]`,
      width: DEFAULT_SLIDE_WIDTH,
      height: DEFAULT_SLIDE_HEIGHT,
      elements: [],
    };
  }

  const normalizedHtml = ensureEditableSelectors(html);
  const parser = new DOMParser();
  const doc = parser.parseFromString(normalizedHtml, "text/html");
  const root = ensureSlideRoot(doc);
  const editableNodes = Array.from(doc.querySelectorAll<HTMLElement>("[data-editable]"));
  const rootSelector = root?.getAttribute(SELECTOR_ATTR)
    ? `[${SELECTOR_ATTR}="${root.getAttribute(SELECTOR_ATTR)}"]`
    : `[${SLIDE_ROOT_ATTR}]`;
  const width = parseDimension(root?.getAttribute("data-slide-width") ?? null, DEFAULT_SLIDE_WIDTH);
  const height = parseDimension(
    root?.getAttribute("data-slide-height") ?? null,
    DEFAULT_SLIDE_HEIGHT
  );

  const elements = editableNodes.map<EditableElement>((node, index) => {
    const type = (node.getAttribute("data-editable") || "block") as EditableType;
    const selectorValue = node.getAttribute(SELECTOR_ATTR) || createElementId(index, type);

    return {
      id: selectorValue,
      selector: `[${SELECTOR_ATTR}="${selectorValue}"]`,
      type,
      content: node instanceof HTMLImageElement ? node.src : node.textContent || "",
      tagName: node.tagName.toLowerCase(),
    };
  });

  const firstHeading = doc.querySelector("h1, h2, title");
  const title = firstHeading?.textContent?.trim() || `Slide ${slideId}`;

  return {
    id: slugify(slideId),
    title,
    htmlSource: normalizedHtml,
    rootSelector,
    width,
    height,
    elements,
  };
}

export function updateSlideText(html: string, elementId: string, value: string): string {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const node = doc.querySelector<HTMLElement>(`[${SELECTOR_ATTR}="${elementId}"]`);

  if (node) {
    node.textContent = value;
  }

  return `<!DOCTYPE html>
${doc.documentElement.outerHTML}`;
}

export function updateSlideStyle(
  html: string,
  elementId: string,
  propertyName: string,
  value: string
): string {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const node = doc.querySelector<HTMLElement>(`[${SELECTOR_ATTR}="${elementId}"]`);

  if (!node) {
    return html;
  }

  if (value.trim().length === 0) {
    node.style.removeProperty(propertyName);
  } else {
    node.style.setProperty(propertyName, value);
  }

  if (!node.getAttribute("style")?.trim()) {
    node.removeAttribute("style");
  }

  return `<!DOCTYPE html>
${doc.documentElement.outerHTML}`;
}

export function createEmptyElementLayoutStyleSnapshot(): ElementLayoutStyleSnapshot {
  return {
    position: null,
    left: null,
    top: null,
    width: null,
    height: null,
    transform: null,
    transformOrigin: null,
    margin: null,
    zIndex: null,
  };
}

export function captureElementLayoutStyleSnapshot(node: HTMLElement): ElementLayoutStyleSnapshot {
  const snapshot = createEmptyElementLayoutStyleSnapshot();

  for (const key of ELEMENT_LAYOUT_STYLE_KEYS) {
    const value = node.style[key];
    snapshot[key] = value ? value : null;
  }

  return snapshot;
}

export function normalizeElementLayoutStyleSnapshot(
  snapshot: Partial<ElementLayoutStyleSnapshot>
): ElementLayoutStyleSnapshot {
  return {
    ...createEmptyElementLayoutStyleSnapshot(),
    ...snapshot,
  };
}

function applyElementLayoutStyleSnapshot(
  node: HTMLElement,
  snapshot: ElementLayoutStyleSnapshot
): void {
  for (const key of ELEMENT_LAYOUT_STYLE_KEYS) {
    const value = snapshot[key];
    if (value === null) {
      node.style[key] = "";
      continue;
    }

    node.style[key] = value;
  }

  if (!node.getAttribute("style")?.trim()) {
    node.removeAttribute("style");
  }
}

export function updateSlideElementLayout(
  html: string,
  elementId: string,
  snapshot: ElementLayoutStyleSnapshot
): string {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const node = doc.querySelector<HTMLElement>(`[${SELECTOR_ATTR}="${elementId}"]`);

  if (!node) {
    return html;
  }

  applyElementLayoutStyleSnapshot(node, snapshot);
  return `<!DOCTYPE html>
${doc.documentElement.outerHTML}`;
}

export function applySlideOperation(slide: SlideModel, operation: SlideOperation): SlideModel {
  if (slide.id !== operation.slideId) {
    return slide;
  }

  switch (operation.type) {
    case "text.update":
      return parseSlide(
        updateSlideText(slide.htmlSource, operation.elementId, operation.nextText),
        slide.id
      );
    case "style.update":
      return parseSlide(
        updateSlideStyle(
          slide.htmlSource,
          operation.elementId,
          operation.propertyName,
          operation.nextValue
        ),
        slide.id
      );
    case "element.layout.update":
      return parseSlide(
        updateSlideElementLayout(slide.htmlSource, operation.elementId, operation.nextStyle),
        slide.id
      );
  }
}

export function invertSlideOperation(operation: SlideOperation): SlideOperation {
  switch (operation.type) {
    case "text.update":
      return {
        ...operation,
        previousText: operation.nextText,
        nextText: operation.previousText,
      };
    case "style.update":
      return {
        ...operation,
        previousValue: operation.nextValue,
        nextValue: operation.previousValue,
      };
    case "element.layout.update":
      return {
        ...operation,
        previousStyle: operation.nextStyle,
        nextStyle: operation.previousStyle,
      };
  }
}

function applyOperationToSlides(slides: SlideModel[], operation: SlideOperation): SlideModel[] {
  return slides.map((slide) => applySlideOperation(slide, operation));
}

export function createHistoryState(slides: SlideModel[]): HistoryState {
  return {
    slides,
    undoStack: [],
    redoStack: [],
  };
}

export function reduceHistory(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "history.reset":
      return createHistoryState(action.slides);

    case "history.commit":
      return {
        slides: applyOperationToSlides(state.slides, action.operation),
        undoStack: [...state.undoStack, action.operation],
        redoStack: [],
      };

    case "history.undo": {
      const operation = state.undoStack[state.undoStack.length - 1];
      if (!operation) {
        return state;
      }

      return {
        slides: applyOperationToSlides(state.slides, invertSlideOperation(operation)),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, operation],
      };
    }

    case "history.redo": {
      const operation = state.redoStack[state.redoStack.length - 1];
      if (!operation) {
        return state;
      }

      return {
        slides: applyOperationToSlides(state.slides, operation),
        undoStack: [...state.undoStack, operation],
        redoStack: state.redoStack.slice(0, -1),
      };
    }
  }
}

function parseTranslate(transformValue: string): { x: number; y: number } {
  const match = transformValue.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/i);
  if (!match) {
    return { x: 0, y: 0 };
  }

  return {
    x: Number.parseFloat(match[1] || "0") || 0,
    y: Number.parseFloat(match[2] || "0") || 0,
  };
}

export function elementRectToStageRect(
  elementRect: RectLike,
  rootRect: RectLike,
  geometry: StageGeometry
): StageRect {
  return {
    x: geometry.offsetX + (elementRect.left - rootRect.left) * geometry.scale,
    y: geometry.offsetY + (elementRect.top - rootRect.top) * geometry.scale,
    width: elementRect.width * geometry.scale,
    height: elementRect.height * geometry.scale,
  };
}

export function stageDeltaToSlideDelta(
  deltaX: number,
  deltaY: number,
  geometry: StageGeometry
): { x: number; y: number } {
  return {
    x: deltaX / geometry.scale,
    y: deltaY / geometry.scale,
  };
}

export function updateSlideElementTransform(
  html: string,
  elementId: string,
  deltaX: number,
  deltaY: number
): string {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const node = doc.querySelector<HTMLElement>(`[${SELECTOR_ATTR}="${elementId}"]`);

  if (!node) {
    return html;
  }

  const currentTranslate = parseTranslate(node.style.transform);
  const nextX = currentTranslate.x + deltaX;
  const nextY = currentTranslate.y + deltaY;

  node.style.transform = `translate(${nextX}px, ${nextY}px)`;

  if (!node.style.position) {
    node.style.position = "relative";
  }

  return `<!DOCTYPE html>
${doc.documentElement.outerHTML}`;
}

export async function loadSlidesFromManifest({
  manifestUrl,
  fetchImpl,
  requestInit,
  slideIdPrefix = "generated-slide-",
}: LoadSlidesFromManifestOptions): Promise<ImportedSlideDeck | null> {
  const activeFetch = fetchImpl ?? globalThis.fetch;
  if (!activeFetch) {
    throw new Error("loadSlidesFromManifest requires a fetch implementation.");
  }

  const effectiveRequestInit = {
    cache: "no-store" as const,
    ...requestInit,
  };

  const manifestResponse = await activeFetch(manifestUrl, effectiveRequestInit);
  if (!manifestResponse.ok) {
    return null;
  }

  const manifest = (await manifestResponse.json()) as SlideDeckManifest;
  if (!manifest.slides?.length) {
    return null;
  }

  const manifestBaseUrl = manifestResponse.url || manifestUrl;
  const slides = await Promise.all(
    manifest.slides.map(async (slide, index) => {
      const slideResponse = await activeFetch(
        new URL(slide.file, manifestBaseUrl).toString(),
        effectiveRequestInit
      );
      if (!slideResponse.ok) {
        throw new Error(`Failed to load slide HTML: ${slide.file}`);
      }

      const html = await slideResponse.text();
      const parsedSlide = parseSlide(html, `${slideIdPrefix}${index + 1}`);

      return {
        ...parsedSlide,
        title: slide.title || parsedSlide.title,
      };
    })
  );

  return {
    manifest,
    slides,
  };
}
