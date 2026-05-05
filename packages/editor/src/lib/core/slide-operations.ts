import {
  ELEMENT_LAYOUT_STYLE_KEYS,
  type ElementLayoutStyleSnapshot,
  composeTransform,
  parseTransformParts,
} from "./layout";
import type { SlideModel } from "./slide-contract";
import { SELECTOR_ATTR, SLIDE_ROOT_ATTR } from "./slide-contract";
import { parseSlide, querySlideElement } from "./slide-document";

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

export interface AttributeUpdateOperation {
  type: "attribute.update";
  slideId: string;
  elementId: string;
  attributeName: string;
  previousValue: string;
  nextValue: string;
  timestamp: number;
}

export interface ElementLayoutUpdateOperation {
  type: "element.layout.update";
  slideId: string;
  elementId: string;
  previousStyle: ElementLayoutStyleSnapshot;
  nextStyle: ElementLayoutStyleSnapshot;
  timestamp: number;
}

export interface ElementInsertOperation {
  type: "element.insert";
  slideId: string;
  elementId: string;
  parentElementId: string | null;
  previousSiblingElementId: string | null;
  nextSiblingElementId: string | null;
  html: string;
  timestamp: number;
}

export interface ElementRemoveOperation {
  type: "element.remove";
  slideId: string;
  elementId: string;
  parentElementId: string | null;
  previousSiblingElementId: string | null;
  nextSiblingElementId: string | null;
  html: string;
  timestamp: number;
}

export type AtomicSlideOperation =
  | TextUpdateOperation
  | StyleUpdateOperation
  | AttributeUpdateOperation
  | ElementLayoutUpdateOperation
  | ElementInsertOperation
  | ElementRemoveOperation;

export interface SlideBatchOperation {
  type: "operation.batch";
  slideId: string;
  operations: AtomicSlideOperation[];
  timestamp: number;
}

export type SlideOperation = AtomicSlideOperation | SlideBatchOperation;

function parseHtmlDocument(html: string): Document | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

function serializeHtmlDocument(doc: Document): string {
  return `<!DOCTYPE html>
${doc.documentElement.outerHTML}`;
}

function updateHtmlSource(html: string, updater: (doc: Document) => void): string {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return html;
  }

  updater(doc);
  return serializeHtmlDocument(doc);
}

export function updateSlideText(html: string, elementId: string, value: string): string {
  return updateHtmlSource(html, (doc) => {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (node) {
      node.textContent = value;
    }
  });
}

export function updateSlideStyle(
  html: string,
  elementId: string,
  propertyName: string,
  value: string
): string {
  return updateHtmlSource(html, (doc) => {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (!node) {
      return;
    }

    if (value.trim().length === 0) {
      node.style.removeProperty(propertyName);
    } else {
      node.style.setProperty(propertyName, value);
    }

    if (!node.getAttribute("style")?.trim()) {
      node.removeAttribute("style");
    }
  });
}

export function updateSlideAttribute(
  html: string,
  elementId: string,
  attributeName: string,
  value: string
): string {
  return updateHtmlSource(html, (doc) => {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (!node) {
      return;
    }

    if (value.trim().length === 0) {
      node.removeAttribute(attributeName);
    } else {
      node.setAttribute(attributeName, value);
    }
  });
}

export function duplicateSlideElement(
  html: string,
  sourceElementId: string,
  nextElementId: string
): string {
  return updateHtmlSource(html, (doc) => {
    const sourceNode = querySlideElement<HTMLElement>(doc, sourceElementId);
    if (!sourceNode) {
      return;
    }

    const clonedNode = sourceNode.cloneNode(true);
    if (!(clonedNode instanceof HTMLElement)) {
      return;
    }

    clonedNode.setAttribute(SELECTOR_ATTR, nextElementId);
    clonedNode.removeAttribute("data-hse-editing");
    sourceNode.insertAdjacentElement("afterend", clonedNode);
  });
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
  return updateHtmlSource(html, (doc) => {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (!node) {
      return;
    }

    applyElementLayoutStyleSnapshot(node, snapshot);
  });
}

export function createElementPlacement(
  html: string,
  elementId: string
): Pick<
  ElementInsertOperation,
  "parentElementId" | "previousSiblingElementId" | "nextSiblingElementId"
> | null {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return null;
  }

  const node = querySlideElement<HTMLElement>(doc, elementId);
  if (!node || !(node.parentElement instanceof HTMLElement)) {
    return null;
  }

  const previousSiblingElementId =
    node.previousElementSibling instanceof HTMLElement
      ? node.previousElementSibling.getAttribute(SELECTOR_ATTR)
      : null;
  const nextSiblingElementId =
    node.nextElementSibling instanceof HTMLElement
      ? node.nextElementSibling.getAttribute(SELECTOR_ATTR)
      : null;

  return {
    parentElementId: node.parentElement.getAttribute(SELECTOR_ATTR),
    previousSiblingElementId,
    nextSiblingElementId,
  };
}

export function getSlideElementHtml(html: string, elementId: string): string | null {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return null;
  }

  return querySlideElement<HTMLElement>(doc, elementId)?.outerHTML ?? null;
}

export function updateSlideElementHtmlIds(
  elementHtml: string,
  idMap: Record<string, string>
): string {
  const doc = parseHtmlDocument(`<template>${elementHtml}</template>`);
  const root = doc?.querySelector("template")?.content.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    return elementHtml;
  }

  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>(`[${SELECTOR_ATTR}]`))];
  for (const node of nodes) {
    const currentId = node.getAttribute(SELECTOR_ATTR);
    if (currentId && idMap[currentId]) {
      node.setAttribute(SELECTOR_ATTR, idMap[currentId]);
    }
  }

  return root.outerHTML;
}

export function createUniqueElementId(html: string, preferredId: string): string {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return preferredId;
  }

  const existingIds = new Set(
    Array.from(doc.querySelectorAll<HTMLElement>(`[${SELECTOR_ATTR}]`))
      .map((node) => node.getAttribute(SELECTOR_ATTR))
      .filter((value): value is string => Boolean(value))
  );

  if (!existingIds.has(preferredId)) {
    return preferredId;
  }

  const match = preferredId.match(/^(.*?)(?:-(\d+))?$/);
  const base = match?.[1] || preferredId;
  let index = Number.parseInt(match?.[2] || "1", 10) + 1;

  while (existingIds.has(`${base}-${index}`)) {
    index += 1;
  }

  return `${base}-${index}`;
}

export function insertSlideElement(
  html: string,
  operation: Pick<
    ElementInsertOperation,
    "elementId" | "parentElementId" | "previousSiblingElementId" | "nextSiblingElementId" | "html"
  >
): string {
  return updateHtmlSource(html, (doc) => {
    if (querySlideElement<HTMLElement>(doc, operation.elementId)) {
      return;
    }

    const fragmentDoc = parseHtmlDocument(`<template>${operation.html}</template>`);
    const node = fragmentDoc?.querySelector("template")?.content.firstElementChild;
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const parent =
      (operation.parentElementId
        ? querySlideElement<HTMLElement>(doc, operation.parentElementId)
        : null) ??
      doc.querySelector<HTMLElement>(`[${SLIDE_ROOT_ATTR}]`) ??
      doc.body;
    const nextSibling = operation.nextSiblingElementId
      ? querySlideElement<HTMLElement>(doc, operation.nextSiblingElementId)
      : null;
    const previousSibling = operation.previousSiblingElementId
      ? querySlideElement<HTMLElement>(doc, operation.previousSiblingElementId)
      : null;

    if (nextSibling?.parentElement === parent) {
      parent.insertBefore(doc.importNode(node, true), nextSibling);
    } else if (previousSibling?.parentElement === parent) {
      previousSibling.after(doc.importNode(node, true));
    } else {
      parent.appendChild(doc.importNode(node, true));
    }
  });
}

export function removeSlideElement(html: string, elementId: string): string {
  return updateHtmlSource(html, (doc) => {
    querySlideElement<HTMLElement>(doc, elementId)?.remove();
  });
}

export function updateSlideElementTransform(
  html: string,
  elementId: string,
  deltaX: number,
  deltaY: number
): string {
  return updateHtmlSource(html, (doc) => {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (!node) {
      return;
    }

    const currentTransform = parseTransformParts(node.style.transform);
    const nextTransform = composeTransform(
      currentTransform.translateX + deltaX,
      currentTransform.translateY + deltaY,
      currentTransform.rotate
    );

    if (nextTransform) {
      node.style.transform = nextTransform;
    } else {
      node.style.removeProperty("transform");
    }

    if (!node.style.position) {
      node.style.position = "relative";
    }
  });
}

function preserveSlideSource(sourceSlide: SlideModel, nextSlide: SlideModel): SlideModel {
  return {
    ...nextSlide,
    sourceFile: sourceSlide.sourceFile,
  };
}

export function applySlideOperation(slide: SlideModel, operation: SlideOperation): SlideModel {
  if (slide.id !== operation.slideId) {
    return slide;
  }

  switch (operation.type) {
    case "operation.batch":
      return operation.operations.reduce(
        (currentSlide, childOperation) => applySlideOperation(currentSlide, childOperation),
        slide
      );
    case "text.update":
      return preserveSlideSource(
        slide,
        parseSlide(
          updateSlideText(slide.htmlSource, operation.elementId, operation.nextText),
          slide.id
        )
      );
    case "style.update":
      return preserveSlideSource(
        slide,
        parseSlide(
          updateSlideStyle(
            slide.htmlSource,
            operation.elementId,
            operation.propertyName,
            operation.nextValue
          ),
          slide.id
        )
      );
    case "attribute.update":
      return preserveSlideSource(
        slide,
        parseSlide(
          updateSlideAttribute(
            slide.htmlSource,
            operation.elementId,
            operation.attributeName,
            operation.nextValue
          ),
          slide.id
        )
      );
    case "element.layout.update":
      return preserveSlideSource(
        slide,
        parseSlide(
          updateSlideElementLayout(slide.htmlSource, operation.elementId, operation.nextStyle),
          slide.id
        )
      );
    case "element.insert":
      return preserveSlideSource(
        slide,
        parseSlide(insertSlideElement(slide.htmlSource, operation), slide.id)
      );
    case "element.remove":
      return preserveSlideSource(
        slide,
        parseSlide(removeSlideElement(slide.htmlSource, operation.elementId), slide.id)
      );
  }
}

export function invertSlideOperation(operation: SlideOperation): SlideOperation {
  switch (operation.type) {
    case "operation.batch":
      return {
        type: "operation.batch",
        slideId: operation.slideId,
        operations: operation.operations
          .map((childOperation) => invertSlideOperation(childOperation) as AtomicSlideOperation)
          .reverse(),
        timestamp: operation.timestamp,
      };
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
    case "attribute.update":
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
    case "element.insert":
      return {
        type: "element.remove",
        slideId: operation.slideId,
        elementId: operation.elementId,
        parentElementId: operation.parentElementId,
        previousSiblingElementId: operation.previousSiblingElementId,
        nextSiblingElementId: operation.nextSiblingElementId,
        html: operation.html,
        timestamp: operation.timestamp,
      };
    case "element.remove":
      return {
        type: "element.insert",
        slideId: operation.slideId,
        elementId: operation.elementId,
        parentElementId: operation.parentElementId,
        previousSiblingElementId: operation.previousSiblingElementId,
        nextSiblingElementId: operation.nextSiblingElementId,
        html: operation.html,
        timestamp: operation.timestamp,
      };
  }
}
