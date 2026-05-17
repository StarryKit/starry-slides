import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type EditableElement,
  type EditableType,
  SELECTOR_ATTR,
  SLIDE_ROOT_ID,
  SLIDE_ROOT_SELECTOR,
  type SlideModel,
  createElementId,
  getElementId,
  getSlideElementSelector,
  getSlideRootSelector,
  isPersistedGroupNode,
  normalizeSlideId,
  parseFixedPixelDimension,
  readBodyStyleValueFromHtmlSource,
  setElementId,
} from "./slide-contract.js";
import {
  parseHtmlDocument as parseSharedHtmlDocument,
  serializeHtmlDocument,
} from "./slide-html-document.js";

function parseHtmlDocument(html: string): Document | null {
  return parseSharedHtmlDocument(html);
}

function ensureSlideRoot(doc: Document): HTMLElement | null {
  return doc.body;
}

function ensureRootDefaults(doc: Document) {
  const root = ensureSlideRoot(doc);
  if (!root) {
    return null;
  }

  root.style.margin = root.style.margin || "0px";
  root.style.position = root.style.position || "relative";
  const serializedHtml = serializeHtmlDocument(doc);
  const authoredBackground =
    root.style.background.trim() ||
    root.style.backgroundColor.trim() ||
    readBodyStyleValueFromHtmlSource(serializedHtml, "background") ||
    readBodyStyleValueFromHtmlSource(serializedHtml, "background-color");
  if (!authoredBackground) {
    root.style.background = "#ffffff";
  }
  return root;
}

function readRootDimension(doc: Document, propertyName: "width" | "height"): number {
  const styleValue = doc.body.style.getPropertyValue(propertyName).trim();
  const directInlineValue = parseFixedPixelDimension(styleValue);
  if (directInlineValue) {
    return directInlineValue;
  }

  const serializedHtml = serializeHtmlDocument(doc);
  const sourcedValue = parseFixedPixelDimension(
    readBodyStyleValueFromHtmlSource(serializedHtml, propertyName)
  );
  return sourcedValue ?? (propertyName === "width" ? DEFAULT_SLIDE_WIDTH : DEFAULT_SLIDE_HEIGHT);
}

export function ensureEditableSelectors(html: string): string {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return html;
  }

  ensureRootDefaults(doc);
  const editableNodes = Array.from(doc.querySelectorAll<HTMLElement>("[data-editable]"));

  editableNodes.forEach((node, index) => {
    const existingId = getElementId(node);
    if (!existingId) {
      const type = (node.getAttribute("data-editable") || "block") as EditableType;
      setElementId(node, createElementId(index, type));
      return;
    }

    setElementId(node, existingId);
  });

  return serializeHtmlDocument(doc);
}

export function parseSlide(html: string, slideId = "slide-1"): SlideModel {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return {
      id: slideId,
      title: "Untitled Slide",
      htmlSource: html,
      rootSelector: SLIDE_ROOT_SELECTOR,
      width: DEFAULT_SLIDE_WIDTH,
      height: DEFAULT_SLIDE_HEIGHT,
      elements: [],
    };
  }

  const normalizedHtml = ensureEditableSelectors(html);
  const normalizedDoc = parseHtmlDocument(normalizedHtml);
  if (!normalizedDoc) {
    return {
      id: slideId,
      title: "Untitled Slide",
      htmlSource: normalizedHtml,
      rootSelector: SLIDE_ROOT_SELECTOR,
      width: DEFAULT_SLIDE_WIDTH,
      height: DEFAULT_SLIDE_HEIGHT,
      elements: [],
    };
  }

  ensureRootDefaults(normalizedDoc);
  const editableNodes = Array.from(normalizedDoc.querySelectorAll<HTMLElement>("[data-editable]"));
  const rootSelector = getSlideRootSelector(SLIDE_ROOT_ID);
  const width = readRootDimension(normalizedDoc, "width");
  const height = readRootDimension(normalizedDoc, "height");

  const elements = editableNodes.map<EditableElement>((node, index) => {
    const rawType = (node.getAttribute("data-editable") || "block") as EditableType;
    const type = rawType === "block" && isPersistedGroupNode(node) ? ("group" as const) : rawType;
    const selectorValue = getElementId(node) || createElementId(index, type);

    return {
      id: selectorValue,
      selector: getSlideElementSelector(selectorValue),
      type: type,
      content: node instanceof HTMLImageElement ? node.src : node.textContent || "",
      tagName: node.tagName.toLowerCase(),
    };
  });

  const firstHeading = normalizedDoc.querySelector("h1, h2, title");
  const title = firstHeading?.textContent?.trim() || `Slide ${slideId}`;

  return {
    id: normalizeSlideId(slideId),
    title,
    htmlSource: normalizedHtml,
    rootSelector,
    width,
    height,
    elements,
  };
}

export function querySlideElement<T extends Element = HTMLElement>(
  doc: ParentNode,
  elementId: string
): T | null {
  return doc.querySelector<T>(getSlideElementSelector(elementId));
}

export function querySlideRoot<T extends HTMLElement = HTMLBodyElement>(doc: ParentNode): T | null {
  return doc.querySelector<T>(SLIDE_ROOT_SELECTOR);
}

export function querySlideNode<T extends HTMLElement = HTMLElement>(
  doc: ParentNode,
  elementId: string
): T | null {
  if (elementId === SLIDE_ROOT_ID) {
    return querySlideRoot<T>(doc);
  }

  return querySlideElement<T>(doc, elementId);
}

export function getSlideInlineStyleValue(
  slide: SlideModel,
  elementId: string,
  propertyName: string
): string {
  const doc = parseHtmlDocument(slide.htmlSource);
  if (!doc) {
    return "";
  }

  const node = querySlideNode<HTMLElement>(doc, elementId);
  return node?.style.getPropertyValue(propertyName).trim() || "";
}
