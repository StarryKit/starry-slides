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

export type SlideOperation = TextUpdateOperation;

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

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
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
      content: node instanceof HTMLImageElement ? node.src : (node.textContent || "").trim(),
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

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
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

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export const sampleSlides = [
  parseSlide(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top right, rgba(255, 200, 120, 0.75), transparent 24%),
          linear-gradient(135deg, #f7f1e8 0%, #f0e3d0 45%, #d5c0a8 100%);
        color: #1f1912;
      }
      .slide-container {
        position: relative;
        width: 100%;
        height: 100%;
        padding: 120px 140px;
      }
      .eyebrow {
        display: inline-block;
        padding: 12px 20px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.55);
        font-size: 32px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }
      h1 {
        margin: 40px 0 20px;
        font-size: 110px;
        line-height: 0.94;
        max-width: 1050px;
      }
      p {
        margin: 0;
        max-width: 900px;
        font-size: 44px;
        line-height: 1.35;
        color: rgba(31, 25, 18, 0.82);
      }
      .card {
        position: absolute;
        right: 150px;
        bottom: 150px;
        width: 460px;
        padding: 36px;
        border-radius: 36px;
        background: rgba(255, 255, 255, 0.72);
        backdrop-filter: blur(14px);
        box-shadow: 0 18px 60px rgba(88, 56, 24, 0.15);
      }
      .card strong {
        display: block;
        margin-bottom: 18px;
        font-size: 28px;
      }
      .card span {
        display: block;
        font-size: 30px;
        line-height: 1.4;
      }
    </style>
  </head>
  <body>
    <div class="slide-container" data-slide-root="true" data-slide-width="1920" data-slide-height="1080">
      <div class="eyebrow" data-editable="text">HTML Slides Editor</div>
      <h1 data-editable="text">Edit AI-generated slides without converting formats.</h1>
      <p data-editable="text">A transparent interaction layer on top of raw HTML makes arbitrary slides editable while preserving their original rendering.</p>
      <div class="card" data-editable="block">
        <strong data-editable="text">Core idea</strong>
        <span data-editable="text">iframe for rendering, overlay for selection, and a shared model for save-back.</span>
      </div>
    </div>
  </body>
</html>`,
    "slide-1"
  ),
  parseSlide(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        font-family: Georgia, serif;
        background:
          linear-gradient(150deg, rgba(15, 37, 63, 0.92), rgba(33, 74, 98, 0.96)),
          #0f253f;
        color: #f6f5f1;
      }
      .slide-container {
        position: relative;
        width: 100%;
        height: 100%;
        padding: 120px;
      }
      h1 {
        margin: 0 0 24px;
        font-size: 96px;
        max-width: 900px;
      }
      p {
        max-width: 760px;
        margin: 0;
        font-size: 42px;
        line-height: 1.4;
        color: rgba(246, 245, 241, 0.82);
      }
      .quote {
        position: absolute;
        right: 120px;
        top: 160px;
        width: 620px;
        padding: 48px;
        border: 1px solid rgba(246, 245, 241, 0.18);
        border-radius: 32px;
        background: rgba(255, 255, 255, 0.08);
      }
      .quote span {
        display: block;
        font-size: 34px;
        line-height: 1.45;
      }
    </style>
  </head>
  <body>
    <div class="slide-container" data-slide-root="true" data-slide-width="1920" data-slide-height="1080">
      <h1 data-editable="text">The editor needs to respect the source HTML.</h1>
      <p data-editable="text">No private scene graph. No format conversion. The DOM stays the source of truth, and the editor writes back targeted updates.</p>
      <div class="quote" data-editable="block">
        <span data-editable="text">The first version only needs inspection, selection, and text editing to prove the model.</span>
      </div>
    </div>
  </body>
</html>`,
    "slide-2"
  ),
];
