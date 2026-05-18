import type {
  AtomicSlideOperation,
  ElementInsertOperation,
  ElementLayoutUpdateOperation,
  ElementPresentationStyleMap,
  ElementRemoveOperation,
  GroupElementRectMap,
  SlideBatchOperation,
  SlideModel,
  StageRect,
  StyleUpdateOperation,
} from "@starrykit/slides-core";
import {
  SELECTOR_ATTR,
  captureElementLayoutStyleSnapshot,
  composeTransform,
  createElementPlacement,
  createGroupCreateOperation,
  createGroupUngroupOperation,
  createUniqueElementId,
  getSlideElementHtml,
  isPersistedGroupNode,
  normalizeElementLayoutStyleSnapshot,
  parseTransformParts,
  querySlideElement,
  updateSlideElementHtmlIds,
} from "@starrykit/slides-core";
import { getInlineStyleValue } from "../editor-operations";
import {
  elementRectToSlideRect,
  offsetSlideRect,
  placeCopiedElement,
} from "../hooks/editor-keyboard-geometry";
import {
  createStructuralListIdMap,
  isListWrapperWithEditableItems,
} from "./editor-selection-structure";

export function batchSelectionOperation(
  slideId: string,
  operations: AtomicSlideOperation[]
): AtomicSlideOperation | SlideBatchOperation | null {
  if (operations.length === 0) {
    return null;
  }

  return operations.length === 1
    ? operations[0]
    : {
        type: "operation.batch",
        slideId,
        operations,
        timestamp: Date.now(),
      };
}

export function createLayerOperations(
  slide: SlideModel,
  elementIds: string[],
  action: string
): StyleUpdateOperation[] {
  return elementIds
    .map((elementId) => {
      const previousValue = getInlineStyleValue(slide, elementId, "z-index");
      const numericZIndex = Number.parseInt(previousValue, 10);
      const currentZIndex = Number.isFinite(numericZIndex) ? numericZIndex : 0;
      const nextValue =
        action === "front"
          ? "999"
          : action === "back"
            ? "0"
            : String(Math.max(0, currentZIndex + (action === "forward" ? 1 : -1)));

      if (previousValue === nextValue) {
        return null;
      }

      return {
        type: "style.update" as const,
        slideId: slide.id,
        elementId,
        propertyName: "z-index",
        previousValue,
        nextValue,
        timestamp: Date.now(),
      };
    })
    .filter((operation): operation is StyleUpdateOperation => Boolean(operation));
}

export function createDuplicateSelectionOperations({
  slide,
  elementIds,
  doc,
}: {
  slide: SlideModel;
  elementIds: string[];
  doc: Document | null | undefined;
}): { operations: ElementInsertOperation[]; nextElementIds: string[] } {
  const rootNode = doc?.querySelector<HTMLElement>(slide.rootSelector);
  const rootRect = rootNode?.getBoundingClientRect();
  let htmlSource = slide.htmlSource;
  const nextElementIds: string[] = [];
  const operations = elementIds
    .map((sourceElementId) => {
      const html = getSlideElementHtml(slide.htmlSource, sourceElementId);
      const placement = createElementPlacement(slide.htmlSource, sourceElementId);
      const node = doc ? querySlideElement<HTMLElement>(doc, sourceElementId) : null;
      if (!html || !placement || !node || !rootRect) {
        return null;
      }

      const nextElementId = createUniqueElementId(htmlSource, `${sourceElementId}-copy`);
      const nextHtml = updateSlideElementHtmlIds(
        html,
        createIdMapForCopiedElement(html, sourceElementId, nextElementId)
      );
      const copiedRect = offsetSlideRect(
        elementRectToSlideRect(node.getBoundingClientRect(), rootRect),
        24,
        24
      );
      const shiftedHtml = placeCopiedElement(nextHtml, copiedRect);
      htmlSource = `${htmlSource}\n<!-- ${nextElementId} reserved -->`;
      nextElementIds.push(nextElementId);

      return {
        type: "element.insert" as const,
        slideId: slide.id,
        elementId: nextElementId,
        ...placement,
        html: shiftedHtml,
        timestamp: Date.now(),
      };
    })
    .filter((operation): operation is ElementInsertOperation => Boolean(operation));

  return { operations, nextElementIds };
}

export function createRemoveSelectionOperations(
  slide: SlideModel,
  elementIds: string[]
): ElementRemoveOperation[] {
  return elementIds
    .map((elementId) => {
      const html = getSlideElementHtml(slide.htmlSource, elementId);
      const placement = createElementPlacement(slide.htmlSource, elementId);
      if (!html || !placement) {
        return null;
      }

      return {
        type: "element.remove" as const,
        slideId: slide.id,
        elementId,
        ...placement,
        html,
        timestamp: Date.now(),
      };
    })
    .filter((operation): operation is ElementRemoveOperation => Boolean(operation));
}

export function createGroupOperation({
  slide,
  elementIds,
  elementRects,
}: {
  slide: SlideModel;
  elementIds: string[];
  elementRects: GroupElementRectMap;
}) {
  const groupElementId = createUniqueElementId(slide.htmlSource, "group-1");
  const operation = createGroupCreateOperation({
    html: slide.htmlSource,
    slideId: slide.id,
    groupElementId,
    elementRects,
    elementIds,
  });

  return operation ? { operation, groupElementId } : null;
}

export function createUngroupOperation({
  slide,
  elementId,
  elementRects,
  elementPresentationStyles,
  parentPosition,
}: {
  slide: SlideModel;
  elementId: string;
  elementRects: GroupElementRectMap;
  elementPresentationStyles: ElementPresentationStyleMap;
  parentPosition?: { x: number; y: number };
}) {
  return createGroupUngroupOperation({
    html: slide.htmlSource,
    slideId: slide.id,
    groupElementId: elementId,
    elementRects,
    elementPresentationStyles,
    parentPosition,
  });
}

export function createGroupElementRectMap({
  doc,
  slide,
  flattenRootElementId,
}: {
  doc: Document | null | undefined;
  slide: SlideModel | undefined;
  flattenRootElementId?: string;
}): GroupElementRectMap {
  const root = doc?.querySelector<HTMLElement>(slide?.rootSelector ?? "");
  if (!doc || !root || !slide) {
    return {};
  }

  const rootRect = root.getBoundingClientRect();
  const scaleX = slide.width / rootRect.width;
  const scaleY = slide.height / rootRect.height;
  const rects: GroupElementRectMap = {};
  const structuralListIds = createStructuralListIdMap(doc, flattenRootElementId);
  const rectNodes = [
    ...Array.from(doc.querySelectorAll<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`)),
    ...Array.from(structuralListIds.keys()),
  ];
  for (const node of rectNodes) {
    const elementId = node.getAttribute(SELECTOR_ATTR) || structuralListIds.get(node);
    if (!elementId) {
      continue;
    }

    const rect = node.getBoundingClientRect();
    const parent = node.parentElement;
    const parentId =
      parent?.hasAttribute("data-editable") && parent.getAttribute(SELECTOR_ATTR)
        ? parent.getAttribute(SELECTOR_ATTR)
        : null;
    const parentRect = parentId
      ? (rects[parentId] ?? { x: 0, y: 0, width: rootRect.width, height: rootRect.height })
      : { x: 0, y: 0, width: rootRect.width, height: rootRect.height };

    rects[elementId] = {
      x: (rect.left - rootRect.left) * scaleX - parentRect.x,
      y: (rect.top - rootRect.top) * scaleY - parentRect.y,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    };
  }

  return rects;
}

export function createElementPresentationStyleMap({
  doc,
  elementId,
}: {
  doc: Document | null | undefined;
  elementId: string;
}): ElementPresentationStyleMap {
  if (!doc) {
    return {};
  }

  const selectedNode = querySlideElement<HTMLElement>(doc, elementId);
  if (!selectedNode || isPersistedGroupNode(selectedNode)) {
    return {};
  }

  const result: ElementPresentationStyleMap = {};
  const structuralListIds = createStructuralListIdMap(doc, elementId);
  for (const child of Array.from(selectedNode.children)) {
    if (!child.hasAttribute("data-editable") && !isListWrapperWithEditableItems(child)) {
      continue;
    }

    const childElementId = child.getAttribute(SELECTOR_ATTR) || structuralListIds.get(child);
    const computedStyle = child.ownerDocument.defaultView?.getComputedStyle(child);
    if (!childElementId || !computedStyle) {
      continue;
    }

    result[childElementId] = {
      color: computedStyle.color,
      fontSize: computedStyle.fontSize,
      fontWeight: computedStyle.fontWeight,
      fontStyle: computedStyle.fontStyle,
      lineHeight: computedStyle.lineHeight,
      textAlign: computedStyle.textAlign,
      paddingTop: computedStyle.paddingTop,
      paddingRight: computedStyle.paddingRight,
      paddingBottom: computedStyle.paddingBottom,
      paddingLeft: computedStyle.paddingLeft,
      listStylePosition: computedStyle.listStylePosition,
      listStyleType: computedStyle.listStyleType,
    };

    for (const descendant of Array.from(
      child.querySelectorAll<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`)
    )) {
      const descendantElementId = descendant.getAttribute(SELECTOR_ATTR);
      const descendantComputedStyle =
        descendant.ownerDocument.defaultView?.getComputedStyle(descendant);
      if (!descendantElementId || !descendantComputedStyle) {
        continue;
      }

      result[descendantElementId] = {
        color: descendantComputedStyle.color,
        fontSize: descendantComputedStyle.fontSize,
        fontWeight: descendantComputedStyle.fontWeight,
        fontStyle: descendantComputedStyle.fontStyle,
        lineHeight: descendantComputedStyle.lineHeight,
        textAlign: descendantComputedStyle.textAlign,
      };
    }
  }

  return result;
}

export function createArrangeTransformValue({
  action,
  elementId,
  slide,
  selectionOverlay,
  stage,
}: {
  action: string;
  elementId: string;
  slide: SlideModel;
  selectionOverlay: StageRect;
  stage: { offsetX: number; offsetY: number; scale: number; width: number; height: number };
}): string | null {
  const transform = getInlineStyleValue(slide, elementId, "transform");
  const slideRect = {
    x: (selectionOverlay.x - stage.offsetX) / stage.scale,
    y: (selectionOverlay.y - stage.offsetY) / stage.scale,
    width: selectionOverlay.width / stage.scale,
    height: selectionOverlay.height / stage.scale,
  };
  let deltaX = 0;
  let deltaY = 0;

  if (action === "left") {
    deltaX = -slideRect.x;
  } else if (action === "hcenter") {
    deltaX = stage.width / 2 - (slideRect.x + slideRect.width / 2);
  } else if (action === "right") {
    deltaX = stage.width - (slideRect.x + slideRect.width);
  } else if (action === "top") {
    deltaY = -slideRect.y;
  } else if (action === "vcenter") {
    deltaY = stage.height / 2 - (slideRect.y + slideRect.height / 2);
  } else if (action === "bottom") {
    deltaY = stage.height - (slideRect.y + slideRect.height);
  }

  if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) {
    return null;
  }

  const transformParts = parseTransformParts(transform);
  return (
    composeTransform(
      transformParts.translateX + deltaX,
      transformParts.translateY + deltaY,
      transformParts.rotate
    ) ?? ""
  );
}

export function createDistributeOperations({
  slide,
  elementIds,
  doc,
  action,
}: {
  slide: SlideModel;
  elementIds: string[];
  doc: Document | null | undefined;
  action: string;
}): ElementLayoutUpdateOperation[] {
  const rootNode = doc?.querySelector<HTMLElement>(slide.rootSelector);
  const rootRect = rootNode?.getBoundingClientRect();
  if (!doc || !rootRect || elementIds.length < 3) {
    return [];
  }

  const items = elementIds
    .map((elementId) => {
      const node = querySlideElement<HTMLElement>(doc, elementId);
      if (!node) {
        return null;
      }

      const rect = node.getBoundingClientRect();
      return {
        elementId,
        node,
        rect: {
          x: rect.left - rootRect.left,
          y: rect.top - rootRect.top,
          width: rect.width,
          height: rect.height,
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (items.length < 3) {
    return [];
  }

  const axis = action === "vertical" ? "y" : "x";
  const sizeKey = action === "vertical" ? "height" : "width";
  const sortedItems = [...items].sort((a, b) => a.rect[axis] - b.rect[axis]);
  const first = sortedItems[0];
  const last = sortedItems[sortedItems.length - 1];
  if (!first || !last) {
    return [];
  }

  const firstCenter = first.rect[axis] + first.rect[sizeKey] / 2;
  const lastCenter = last.rect[axis] + last.rect[sizeKey] / 2;
  const step = (lastCenter - firstCenter) / (sortedItems.length - 1);
  return sortedItems
    .map((item, index) => {
      const targetCenter = firstCenter + step * index;
      const currentCenter = item.rect[axis] + item.rect[sizeKey] / 2;
      const delta = targetCenter - currentCenter;
      if (Math.abs(delta) < 0.01) {
        return null;
      }

      const previousStyle = captureElementLayoutStyleSnapshot(item.node);
      const transformParts = parseTransformParts(previousStyle.transform);
      const nextStyle = normalizeElementLayoutStyleSnapshot({
        ...previousStyle,
        transform: composeTransform(
          transformParts.translateX + (axis === "x" ? delta : 0),
          transformParts.translateY + (axis === "y" ? delta : 0),
          transformParts.rotate
        ),
        transformOrigin: previousStyle.transformOrigin || "center center",
      });

      return {
        type: "element.layout.update" as const,
        slideId: slide.id,
        elementId: item.elementId,
        previousStyle,
        nextStyle,
        timestamp: Date.now(),
      };
    })
    .filter((operation): operation is ElementLayoutUpdateOperation => Boolean(operation));
}

function createIdMapForCopiedElement(html: string, sourceElementId: string, nextElementId: string) {
  const idMap: Record<string, string> = {
    [sourceElementId]: nextElementId,
  };
  const doc = new DOMParser().parseFromString(`<template>${html}</template>`, "text/html");
  const root = doc.querySelector("template")?.content.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    return idMap;
  }

  for (const node of root.querySelectorAll<HTMLElement>(`[${SELECTOR_ATTR}]`)) {
    const currentId = node.getAttribute(SELECTOR_ATTR);
    if (currentId) {
      idMap[currentId] = `${nextElementId}-${currentId}`;
    }
  }

  return idMap;
}
