import type { RefObject } from "react";
import {
  type ElementInsertOperation,
  type ElementRemoveOperation,
  type SlideModel,
  createElementPlacement,
  createUniqueElementId,
  getSlideElementHtml,
  insertSlideElement,
  querySlideElement,
  updateSlideElementHtmlIds,
} from "../../core";
import {
  elementRectToSlideRect,
  getClampedPasteDelta,
  getSlideBounds,
  getUnionRect,
  offsetSlideRect,
  placeCopiedElement,
} from "./editor-keyboard-geometry";
import { commitOperations, createIdMapForCopiedElement } from "./editor-keyboard-operations";
import type { ClipboardPayload } from "./editor-keyboard-types";

export function copyObjectSelection({
  slide,
  selectedElementIds,
  iframeRef,
}: {
  slide: SlideModel | undefined;
  selectedElementIds: string[];
  iframeRef: RefObject<HTMLIFrameElement | null>;
}): ClipboardPayload | null {
  if (!slide || !selectedElementIds.length) {
    return null;
  }

  const doc = iframeRef.current?.contentDocument;
  const rootNode = doc?.querySelector<HTMLElement>(slide.rootSelector);
  const rootRect = rootNode?.getBoundingClientRect();

  if (!rootRect) {
    return null;
  }

  const elements = selectedElementIds
    .map((elementId) => {
      const html = getSlideElementHtml(slide.htmlSource, elementId);
      const placement = createElementPlacement(slide.htmlSource, elementId);
      const node = doc ? querySlideElement<HTMLElement>(doc, elementId) : null;
      if (!html || !placement || !node) {
        return null;
      }

      return {
        sourceElementId: elementId,
        html,
        rect: elementRectToSlideRect(node.getBoundingClientRect(), rootRect),
        ...placement,
      };
    })
    .filter((element): element is ClipboardPayload["elements"][number] => Boolean(element));

  const unionRect = getUnionRect(elements.map((element) => element.rect));
  return unionRect ? { elements, unionRect } : null;
}

export function createRemoveObjectSelectionOperations({
  slide,
  selectedElementIds,
}: {
  slide: SlideModel | undefined;
  selectedElementIds: string[];
}): ElementRemoveOperation[] {
  if (!slide || !selectedElementIds.length) {
    return [];
  }

  return selectedElementIds
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

export function createPasteObjectSelection({
  slide,
  payload,
  iframeRef,
  slideSize,
}: {
  slide: SlideModel | undefined;
  payload: ClipboardPayload | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  slideSize: { width: number; height: number };
}): {
  operations: ElementInsertOperation[];
  selectedElementIds: string[];
  nextClipboard: ClipboardPayload;
  nextHtmlSource: string;
} | null {
  if (!slide || !payload) {
    return null;
  }

  let htmlSource = slide.htmlSource;
  const selectedElementIds: string[] = [];
  const slideBounds = getSlideBounds(iframeRef, slide, slideSize);
  const pasteDelta = getClampedPasteDelta(payload.unionRect, 24, slideBounds);
  const pastedElements: ClipboardPayload["elements"] = [];
  const operations = payload.elements.map((source) => {
    const nextElementId = createUniqueElementId(htmlSource, `${source.sourceElementId}-copy`);
    const copiedHtml = updateSlideElementHtmlIds(
      source.html,
      createIdMapForCopiedElement(source.html, source.sourceElementId, nextElementId)
    );
    const targetRect = offsetSlideRect(source.rect, pasteDelta.x, pasteDelta.y);
    const shiftedHtml = placeCopiedElement(copiedHtml, targetRect);

    const operation = {
      type: "element.insert" as const,
      slideId: slide.id,
      elementId: nextElementId,
      parentElementId: null,
      previousSiblingElementId: null,
      nextSiblingElementId: null,
      html: shiftedHtml,
      timestamp: Date.now(),
    };
    htmlSource = insertSlideElement(htmlSource, operation);
    selectedElementIds.push(nextElementId);
    pastedElements.push({
      ...source,
      rect: targetRect,
    });

    return operation;
  });

  return {
    operations,
    selectedElementIds,
    nextHtmlSource: htmlSource,
    nextClipboard: {
      elements: pastedElements,
      unionRect: offsetSlideRect(payload.unionRect, pasteDelta.x, pasteDelta.y),
    },
  };
}

export function commitObjectOperations(
  slideId: string,
  operations: ElementInsertOperation[] | ElementRemoveOperation[],
  onCommitOperation: Parameters<typeof commitOperations>[2]
) {
  return commitOperations(slideId, operations, onCommitOperation);
}
