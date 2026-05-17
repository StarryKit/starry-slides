import { composeTransform, parseTransformParts } from "./layout.js";
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  SELECTOR_ATTR,
  getElementId,
  isPersistedGroupNode,
  setElementId,
} from "./slide-contract.js";
import { querySlideElement } from "./slide-document.js";
import { parseHtmlDocument, serializeHtmlDocument } from "./slide-html-document.js";
import type { GroupCreateOperation, GroupUngroupOperation } from "./slide-operation-types.js";

export type GroupElementRectMap = Record<
  string,
  { x: number; y: number; width: number; height: number }
>;

export type ElementPresentationStyleMap = Record<
  string,
  Partial<
    Record<
      | "color"
      | "fontSize"
      | "fontWeight"
      | "fontStyle"
      | "lineHeight"
      | "textAlign"
      | "paddingTop"
      | "paddingRight"
      | "paddingBottom"
      | "paddingLeft"
      | "listStylePosition"
      | "listStyleType",
      string
    >
  >
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
  const ownElementId = getElementId(node) ?? "";
  const ownRect = elementRects[ownElementId] ?? getNodeRect(node);
  const width = ownRect.width;
  const height = ownRect.height;

  while (current) {
    const elementId = getElementId(current) ?? "";
    const rect = elementRects[elementId] ?? getNodeRect(current);
    x += rect.x;
    y += rect.y;

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
  let currentParent = node.parentElement;
  while (currentParent && currentParent !== node.ownerDocument.body) {
    if (currentParent.hasAttribute("data-editable")) {
      const rect = getAbsoluteNodeRect(currentParent, elementRects);
      return { x: rect.x, y: rect.y };
    }

    currentParent = currentParent.parentElement;
  }

  return { x: 0, y: 0 };
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

function applyPresentationStyleSnapshot(
  node: HTMLElement,
  snapshot: ElementPresentationStyleMap[string] | undefined
) {
  if (!snapshot) {
    return;
  }

  if (snapshot.color) {
    node.style.color = snapshot.color;
  }
  if (snapshot.fontSize) {
    node.style.fontSize = snapshot.fontSize;
  }
  if (snapshot.fontWeight) {
    node.style.fontWeight = snapshot.fontWeight;
  }
  if (snapshot.fontStyle) {
    node.style.fontStyle = snapshot.fontStyle;
  }
  if (snapshot.lineHeight) {
    node.style.lineHeight = snapshot.lineHeight;
  }
  if (snapshot.textAlign) {
    node.style.textAlign = snapshot.textAlign;
  }
  if (snapshot.paddingTop) {
    node.style.paddingTop = snapshot.paddingTop;
  }
  if (snapshot.paddingRight) {
    node.style.paddingRight = snapshot.paddingRight;
  }
  if (snapshot.paddingBottom) {
    node.style.paddingBottom = snapshot.paddingBottom;
  }
  if (snapshot.paddingLeft) {
    node.style.paddingLeft = snapshot.paddingLeft;
  }
  if (snapshot.listStylePosition) {
    node.style.listStylePosition = snapshot.listStylePosition;
  }
  if (snapshot.listStyleType) {
    node.style.listStyleType = snapshot.listStyleType;
  }
}

function getDirectEditableOwner(node: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = node;
  while (current?.parentElement) {
    const parent: HTMLElement = current.parentElement;
    if (parent.hasAttribute("data-editable") || parent === node.ownerDocument.body) {
      return parent;
    }

    if (parent.parentElement === node.ownerDocument.body) {
      return parent;
    }

    current = parent;
  }

  return null;
}

function childEditableElements(node: HTMLElement): HTMLElement[] {
  return Array.from(node.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.hasAttribute("data-editable")
  );
}

function isListWrapperWithEditableItems(node: Element): node is HTMLElement {
  const tagName = node.tagName.toLowerCase();
  if (tagName !== "ul" && tagName !== "ol") {
    return false;
  }

  return Array.from(node.children).some(
    (child) => child.tagName.toLowerCase() === "li" && child.hasAttribute("data-editable")
  );
}

function createUniqueElementIdInDocument(doc: Document, preferredId: string): string {
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

function flattenableBlockChildElements(node: HTMLElement, doc: Document): HTMLElement[] {
  return Array.from(node.children).filter((child): child is HTMLElement => {
    if (!(child instanceof HTMLElement)) {
      return false;
    }

    if (child.hasAttribute("data-editable")) {
      return true;
    }

    if (!isListWrapperWithEditableItems(child)) {
      return false;
    }

    child.setAttribute("data-editable", "block");
    if (!getElementId(child)) {
      setElementId(child, createUniqueElementIdInDocument(doc, "block-1"));
    }
    return true;
  });
}

function structuralGroupChildren(node: HTMLElement, doc: Document): HTMLElement[] {
  if (node.getAttribute("data-editable") !== "block") {
    return [];
  }

  const directEditableChildren = childEditableElements(node);
  const promotedListWrappers = Array.from(node.children).filter((child): child is HTMLElement => {
    if (!(child instanceof HTMLElement) || !isListWrapperWithEditableItems(child)) {
      return false;
    }

    child.setAttribute("data-editable", "block");
    if (!getElementId(child)) {
      setElementId(child, createUniqueElementIdInDocument(doc, "block-1"));
    }
    return true;
  });

  return [...directEditableChildren, ...promotedListWrappers];
}

function isStructuralGroup(node: HTMLElement): boolean {
  return structuralGroupChildren(node, node.ownerDocument).length > 0;
}

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
    isPersistedGroupNode(node) && isStructuralGroup(node)
      ? structuralGroupChildren(node, doc)
      : [node]
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

  const selectedGroups = selectedNodes.filter(
    (node) => isPersistedGroupNode(node) && isStructuralGroup(node)
  );
  const rects = uniqueNodes.map((node) => getAbsoluteNodeRect(node, elementRects));
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  const parentRect = getEditableAncestorRect(selectedNodes[0], elementRects);
  const groupNode = doc.createElement("div");
  groupNode.setAttribute("data-editable", "block");
  setElementId(groupNode, groupElementId);
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
      .map((node) => getElementId(node))
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
  elementRects = {},
  elementPresentationStyles = {},
  timestamp = Date.now(),
  parentPosition,
}: {
  html: string;
  slideId: string;
  groupElementId: string;
  elementRects?: GroupElementRectMap;
  elementPresentationStyles?: ElementPresentationStyleMap;
  timestamp?: number;
  parentPosition?: { x: number; y: number };
}): GroupUngroupOperation | null {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return null;
  }

  const groupNode = querySlideElement<HTMLElement>(doc, groupElementId);
  if (!groupNode || !groupNode.parentElement) {
    return null;
  }

  const parent = groupNode.parentElement;
  // Use the caller-provided parentPosition (computed from live DOM getBoundingClientRect)
  // when available — it is accurate for any parent, including non-editable positioned
  // containers. Fall back to getEditableAncestorRect for backward-compatible behavior.
  const parentRect = parentPosition ?? getEditableAncestorRect(groupNode, elementRects);
  const isGroup = isPersistedGroupNode(groupNode) && isStructuralGroup(groupNode);
  const normalizedChildren = isGroup
    ? structuralGroupChildren(groupNode, doc)
    : flattenableBlockChildElements(groupNode, doc);
  if (!normalizedChildren.length) {
    return null;
  }
  const selectedElementId = getElementId(groupNode);
  const insertionAnchor = isGroup ? groupNode : groupNode.nextSibling;

  const childElementIds = normalizedChildren
    .map((child) => getElementId(child))
    .filter(
      (elementId, index, ids): elementId is string =>
        Boolean(elementId) && ids.indexOf(elementId) === index
    );

  for (const child of normalizedChildren) {
    const rect = getAbsoluteNodeRect(child, elementRects);
    setNodeRect(child, {
      x: rect.x - parentRect.x,
      y: rect.y - parentRect.y,
      width: rect.width,
      height: rect.height,
    });
    const childElementId = getElementId(child) ?? "";
    applyPresentationStyleSnapshot(child, elementPresentationStyles[childElementId]);
    if (!isGroup && isListWrapperWithEditableItems(child)) {
      child.style.margin = "0px";
    }
    for (const descendant of Array.from(
      child.querySelectorAll<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`)
    )) {
      const descendantElementId = getElementId(descendant) ?? "";
      applyPresentationStyleSnapshot(descendant, elementPresentationStyles[descendantElementId]);
    }
    parent.insertBefore(child, insertionAnchor);
  }

  if (isGroup) {
    groupNode.remove();
  }

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
