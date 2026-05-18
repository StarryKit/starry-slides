import {
  ELEMENT_LAYOUT_STYLE_KEYS,
  type ElementLayoutStyleSnapshot,
  composeTransform,
  parseTransformParts,
} from "./layout.js";
import { SELECTOR_ATTR, getElementId, setElementId } from "./slide-contract.js";
import { querySlideElement, querySlideNode, querySlideRoot } from "./slide-document.js";
import { parseHtmlDocument, updateHtmlSource } from "./slide-html-document.js";
import type { ElementInsertOperation } from "./slide-operation-types.js";

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
    const node = querySlideNode<HTMLElement>(doc, elementId);
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
    const node = querySlideNode<HTMLElement>(doc, elementId);
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

    setElementId(clonedNode, nextElementId);
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
      ? getElementId(node.previousElementSibling)
      : null;
  const nextSiblingElementId =
    node.nextElementSibling instanceof HTMLElement ? getElementId(node.nextElementSibling) : null;
  const parentElement = node.parentElement;
  const parentElementId =
    parentElement && parentElement !== doc.body ? getElementId(parentElement) : null;

  return {
    parentElementId,
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
    const currentId = getElementId(node);
    if (currentId && idMap[currentId]) {
      setElementId(node, idMap[currentId]);
    }
  }

  return root.outerHTML;
}

function createUniqueElementIdInDocument(doc: Document, preferredId: string): string {
  const existingIds = new Set(
    Array.from(doc.querySelectorAll<HTMLElement>("*"))
      .map((node) => getElementId(node))
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

function resolveRootInsertionParent(doc: Document): HTMLElement {
  const firstEditable = doc.querySelector<HTMLElement>("[data-editable]");
  const topLevelContainer = firstEditable?.parentElement;
  if (
    topLevelContainer &&
    topLevelContainer !== doc.body &&
    !topLevelContainer.hasAttribute("data-editable")
  ) {
    return topLevelContainer;
  }

  return doc.body;
}

export function createUniqueElementId(html: string, preferredId: string): string {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return preferredId;
  }
  return createUniqueElementIdInDocument(doc, preferredId);
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
      resolveRootInsertionParent(doc) ??
      querySlideRoot<HTMLElement>(doc) ??
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
