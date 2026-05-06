import {
  ELEMENT_LAYOUT_STYLE_KEYS,
  type ElementLayoutStyleSnapshot,
  composeTransform,
  parseTransformParts,
} from "./layout";
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  SELECTOR_ATTR,
  SLIDE_ROOT_ATTR,
} from "./slide-contract";
import { querySlideElement } from "./slide-document";
import { parseHtmlDocument, serializeHtmlDocument, updateHtmlSource } from "./slide-html-document";

export type {
  AtomicSlideOperation,
  AttributeUpdateOperation,
  ElementInsertOperation,
  ElementLayoutUpdateOperation,
  ElementRemoveOperation,
  GroupCreateOperation,
  GroupUngroupOperation,
  SlideBatchOperation,
  SlideOperation,
  StyleUpdateOperation,
  TextUpdateOperation,
} from "./slide-operation-types";
import type {
  ElementInsertOperation,
  GroupCreateOperation,
  GroupUngroupOperation,
  SlideOperation,
} from "./slide-operation-types";

export type GroupElementRectMap = Record<
  string,
  { x: number; y: number; width: number; height: number }
>;

function numericStyleValue(value: string | null | undefined): number {
  const parsed = Number.parseFloat(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function getNodeRect(node: HTMLElement): { x: number; y: number; width: number; height: number } {
  const transform = parseTransformParts(node.style.transform);
  return {
    x: numericStyleValue(node.style.left) + transform.translateX,
    y: numericStyleValue(node.style.top) + transform.translateY,
    width: numericStyleValue(node.style.width) || DEFAULT_SLIDE_WIDTH,
    height: numericStyleValue(node.style.height) || DEFAULT_SLIDE_HEIGHT,
  };
}

function getAbsoluteNodeRect(
  node: HTMLElement,
  elementRects: GroupElementRectMap = {}
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let current: HTMLElement | null = node;
  let x = 0;
  let y = 0;
  let width = 0;
  let height = 0;

  while (current) {
    const elementId = current.getAttribute(SELECTOR_ATTR) ?? "";
    const rect = elementRects[elementId] ?? getNodeRect(current);
    x += rect.x;
    y += rect.y;
    width = rect.width;
    height = rect.height;

    const parent: HTMLElement | null = current.parentElement;
    if (!parent || !parent.hasAttribute("data-editable")) {
      break;
    }

    current = parent;
  }

  return { x, y, width, height };
}

function getEditableAncestorRect(
  node: HTMLElement,
  elementRects: GroupElementRectMap = {}
): { x: number; y: number } {
  const parent = node.parentElement;
  if (!parent || !parent.hasAttribute("data-editable")) {
    return { x: 0, y: 0 };
  }

  const rect = getAbsoluteNodeRect(parent, elementRects);
  return { x: rect.x, y: rect.y };
}

function setNodeRect(
  node: HTMLElement,
  rect: { x: number; y: number; width: number; height: number }
) {
  node.style.position = node.style.position || "absolute";
  node.style.left = `${Math.round(rect.x * 100) / 100}px`;
  node.style.top = `${Math.round(rect.y * 100) / 100}px`;
  node.style.width = `${Math.round(rect.width * 100) / 100}px`;
  node.style.height = `${Math.round(rect.height * 100) / 100}px`;

  const transform = parseTransformParts(node.style.transform);
  const nextTransform = composeTransform(0, 0, transform.rotate);
  if (nextTransform) {
    node.style.transform = nextTransform;
  } else {
    node.style.removeProperty("transform");
  }
}

function getDirectEditableOwner(node: HTMLElement): HTMLElement | null {
  const parent = node.parentElement;
  if (!parent) {
    return null;
  }

  if (parent.hasAttribute(SLIDE_ROOT_ATTR) || parent.hasAttribute("data-editable")) {
    return parent;
  }

  return null;
}

function childEditableElements(node: HTMLElement): HTMLElement[] {
  return Array.from(node.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.hasAttribute("data-editable")
  );
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

// ADR-0010: Groups are nested DOM containers, not flat groupId relationships.
// See: docs/adr/0010-represent-groups-as-nested-dom-containers.md
export function createGroupCreateOperation({
  html,
  slideId,
  groupElementId,
  elementIds,
  elementRects = {},
  timestamp = Date.now(),
}: {
  html: string;
  slideId: string;
  groupElementId: string;
  elementIds: string[];
  elementRects?: GroupElementRectMap;
  timestamp?: number;
}): GroupCreateOperation | null {
  const doc = parseHtmlDocument(html);
  if (!doc || !elementIds.length) {
    return null;
  }

  const selectedNodes = elementIds
    .map((elementId) => querySlideElement<HTMLElement>(doc, elementId))
    .filter((node): node is HTMLElement => Boolean(node));
  if (selectedNodes.length !== elementIds.length) {
    return null;
  }

  const flattenedNodes = selectedNodes.flatMap((node) =>
    node.getAttribute("data-group") === "true" ? childEditableElements(node) : [node]
  );
  const uniqueNodes = flattenedNodes.filter(
    (node, index, nodes) => nodes.findIndex((candidate) => candidate === node) === index
  );
  if (uniqueNodes.length < 2) {
    return null;
  }

  const parent = getDirectEditableOwner(selectedNodes[0]);
  if (!parent || selectedNodes.some((node) => getDirectEditableOwner(node) !== parent)) {
    return null;
  }

  if (querySlideElement<HTMLElement>(doc, groupElementId)) {
    return null;
  }

  const selectedGroups = selectedNodes.filter((node) => node.getAttribute("data-group") === "true");
  const rects = uniqueNodes.map((node) => getAbsoluteNodeRect(node, elementRects));
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  const parentRect = getEditableAncestorRect(selectedNodes[0], elementRects);
  const groupNode = doc.createElement("div");
  groupNode.setAttribute("data-editable", "block");
  groupNode.setAttribute("data-group", "true");
  groupNode.setAttribute(SELECTOR_ATTR, groupElementId);
  setNodeRect(groupNode, {
    x: left - parentRect.x,
    y: top - parentRect.y,
    width: right - left,
    height: bottom - top,
  });

  const orderedNodes = Array.from(parent.children).flatMap((child) => {
    if (!(child instanceof HTMLElement)) {
      return [];
    }
    if (selectedGroups.includes(child)) {
      return childEditableElements(child).filter((node) => uniqueNodes.includes(node));
    }
    return uniqueNodes.includes(child) ? [child] : [];
  });
  const insertionAnchor =
    selectedNodes.find((node) => getDirectEditableOwner(node) === parent) ?? null;

  if (insertionAnchor?.parentElement === parent) {
    parent.insertBefore(groupNode, insertionAnchor);
  } else {
    parent.appendChild(groupNode);
  }

  for (const node of orderedNodes) {
    const rect = getAbsoluteNodeRect(node, elementRects);
    setNodeRect(node, {
      x: rect.x - left,
      y: rect.y - top,
      width: rect.width,
      height: rect.height,
    });
    groupNode.appendChild(node);
  }

  for (const group of selectedGroups) {
    if (!group.children.length) {
      group.remove();
    }
  }

  const nextHtmlSource = serializeHtmlDocument(doc);
  if (nextHtmlSource === html) {
    return null;
  }

  return {
    type: "group.create",
    slideId,
    groupElementId,
    elementIds: orderedNodes
      .map((node) => node.getAttribute(SELECTOR_ATTR))
      .filter((elementId): elementId is string => Boolean(elementId)),
    previousHtmlSource: html,
    nextHtmlSource,
    timestamp,
  };
}

export function createGroupUngroupOperation({
  html,
  slideId,
  groupElementId,
  timestamp = Date.now(),
}: {
  html: string;
  slideId: string;
  groupElementId: string;
  timestamp?: number;
}): GroupUngroupOperation | null {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return null;
  }

  const groupNode = querySlideElement<HTMLElement>(doc, groupElementId);
  if (!groupNode || groupNode.getAttribute("data-group") !== "true" || !groupNode.parentElement) {
    return null;
  }

  const parent = groupNode.parentElement;
  const parentRect = getEditableAncestorRect(groupNode);
  const children = childEditableElements(groupNode);
  if (!children.length) {
    return null;
  }

  const childElementIds = children
    .map((child) => child.getAttribute(SELECTOR_ATTR))
    .filter((elementId): elementId is string => Boolean(elementId));

  for (const child of children) {
    const rect = getAbsoluteNodeRect(child);
    setNodeRect(child, {
      x: rect.x - parentRect.x,
      y: rect.y - parentRect.y,
      width: rect.width,
      height: rect.height,
    });
    parent.insertBefore(child, groupNode);
  }
  groupNode.remove();

  const nextHtmlSource = serializeHtmlDocument(doc);
  if (nextHtmlSource === html) {
    return null;
  }

  return {
    type: "group.ungroup",
    slideId,
    groupElementId,
    childElementIds,
    previousHtmlSource: html,
    nextHtmlSource,
    timestamp,
  };
}

export { applySlideOperation, invertSlideOperation } from "./slide-operation-reducer";
