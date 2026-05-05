import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import {
  type AtomicSlideOperation,
  type EditableElement,
  type ElementInsertOperation,
  type ElementLayoutUpdateOperation,
  type ElementRemoveOperation,
  type SlideModel,
  type SlideOperation,
  captureElementLayoutStyleSnapshot,
  composeTransform,
  createElementPlacement,
  createUniqueElementId,
  getSlideElementHtml,
  normalizeElementLayoutStyleSnapshot,
  parseTransformParts,
  querySlideElement,
  updateSlideElementHtmlIds,
} from "../lib/core";

interface ClipboardPayload {
  elements: Array<{
    sourceElementId: string;
    html: string;
    rect: SlideRect;
    parentElementId: string | null;
    previousSiblingElementId: string | null;
    nextSiblingElementId: string | null;
  }>;
  unionRect: SlideRect;
}

interface SlideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseEditorKeyboardShortcutsOptions {
  activeSlide: SlideModel | undefined;
  selectedElementIds: string[];
  iframeRef: RefObject<HTMLIFrameElement | null>;
  slideWidth: number;
  slideHeight: number;
  isEditingText: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onCommitOperation: (
    operation:
      | ElementInsertOperation
      | ElementLayoutUpdateOperation
      | ElementRemoveOperation
      | SlideOperation
  ) => void;
  onSelectElementIds: (elementIds: string[]) => void;
  onUndo: () => void;
  onRedo: () => void;
}

const ARROW_DELTAS: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

function isEditableElementTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]'
    )
  );
}

function isLayoutEditable(element: EditableElement | undefined): boolean {
  return element?.type === "block" || element?.type === "text";
}

function roundCssNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function getShortcutStep(event: KeyboardEvent): number {
  if (event.altKey) {
    return 1;
  }

  if (event.shiftKey) {
    return 10;
  }

  return 5;
}

function createIdMapForCopiedElement(html: string, sourceElementId: string, nextElementId: string) {
  const idMap: Record<string, string> = {
    [sourceElementId]: nextElementId,
  };

  if (typeof DOMParser === "undefined") {
    return idMap;
  }

  const doc = new DOMParser().parseFromString(`<template>${html}</template>`, "text/html");
  const root = doc.querySelector("template")?.content.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    return idMap;
  }

  for (const node of root.querySelectorAll<HTMLElement>("[data-editor-id]")) {
    const currentId = node.getAttribute("data-editor-id");
    if (currentId) {
      idMap[currentId] = `${nextElementId}-${currentId}`;
    }
  }

  return idMap;
}

function useEditorKeyboardShortcuts({
  activeSlide,
  selectedElementIds,
  iframeRef,
  slideWidth,
  slideHeight,
  isEditingText,
  canUndo,
  canRedo,
  onCommitOperation,
  onSelectElementIds,
  onUndo,
  onRedo,
}: UseEditorKeyboardShortcutsOptions) {
  const clipboardRef = useRef<ClipboardPayload | null>(null);
  const activeSlideRef = useRef(activeSlide);
  const selectedElementIdsRef = useRef(selectedElementIds);
  const canUndoRef = useRef(canUndo);
  const canRedoRef = useRef(canRedo);
  const isEditingTextRef = useRef(isEditingText);

  activeSlideRef.current = activeSlide;
  selectedElementIdsRef.current = selectedElementIds;
  canUndoRef.current = canUndo;
  canRedoRef.current = canRedo;
  isEditingTextRef.current = isEditingText;

  useEffect(() => {
    const copySelection = () => {
      const currentSlide = activeSlideRef.current;
      const currentSelectedElementIds = selectedElementIdsRef.current;
      if (!currentSlide || !currentSelectedElementIds.length) {
        return false;
      }

      const doc = iframeRef.current?.contentDocument;
      const rootNode = doc?.querySelector<HTMLElement>(currentSlide.rootSelector);
      const rootRect = rootNode?.getBoundingClientRect();

      if (!rootRect) {
        return false;
      }

      const elements = currentSelectedElementIds
        .map((elementId) => {
          const html = getSlideElementHtml(currentSlide.htmlSource, elementId);
          const placement = createElementPlacement(currentSlide.htmlSource, elementId);
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

      if (!elements.length) {
        return false;
      }

      const unionRect = getUnionRect(elements.map((element) => element.rect));
      if (!unionRect) {
        return false;
      }

      clipboardRef.current = { elements, unionRect };

      const clipboard = navigator.clipboard;
      if (clipboard) {
        void clipboard
          .writeText(JSON.stringify({ type: "html-slides-editor.elements", elements, unionRect }))
          .catch(() => {});
      }
      return true;
    };

    const removeSelection = () => {
      const currentSlide = activeSlideRef.current;
      const currentSelectedElementIds = selectedElementIdsRef.current;
      if (!currentSlide || !currentSelectedElementIds.length) {
        return false;
      }

      const operations = currentSelectedElementIds
        .map((elementId) => {
          const html = getSlideElementHtml(currentSlide.htmlSource, elementId);
          const placement = createElementPlacement(currentSlide.htmlSource, elementId);
          if (!html || !placement) {
            return null;
          }

          return {
            type: "element.remove" as const,
            slideId: currentSlide.id,
            elementId,
            ...placement,
            html,
            timestamp: Date.now(),
          };
        })
        .filter((operation): operation is ElementRemoveOperation => Boolean(operation));

      if (!operations.length) {
        return false;
      }

      commitOperations(currentSlide.id, operations, onCommitOperation);
      onSelectElementIds([]);
      return true;
    };

    const pasteSelection = (payload = clipboardRef.current) => {
      const currentSlide = activeSlideRef.current;
      if (!currentSlide || !payload) {
        return false;
      }

      let htmlSource = currentSlide.htmlSource;
      const nextElementIds: string[] = [];
      const slideBounds = getSlideBounds(iframeRef, currentSlide, {
        width: slideWidth,
        height: slideHeight,
      });
      const pasteDelta = getClampedPasteDelta(payload.unionRect, 24, {
        width: slideBounds.width,
        height: slideBounds.height,
      });
      const pastedElements: ClipboardPayload["elements"] = [];
      const operations = payload.elements.map((source) => {
        const nextElementId = createUniqueElementId(htmlSource, `${source.sourceElementId}-copy`);
        const copiedHtml = updateSlideElementHtmlIds(
          source.html,
          createIdMapForCopiedElement(source.html, source.sourceElementId, nextElementId)
        );
        const targetRect = offsetSlideRect(source.rect, pasteDelta.x, pasteDelta.y);
        const shiftedHtml = placeCopiedElement(copiedHtml, targetRect);

        htmlSource = `${htmlSource}\n<!-- ${nextElementId} reserved -->`;
        nextElementIds.push(nextElementId);
        pastedElements.push({
          ...source,
          rect: targetRect,
        });

        return {
          type: "element.insert" as const,
          slideId: currentSlide.id,
          elementId: nextElementId,
          parentElementId: null,
          previousSiblingElementId: null,
          nextSiblingElementId: null,
          html: shiftedHtml,
          timestamp: Date.now(),
        };
      });

      commitOperations(currentSlide.id, operations, onCommitOperation);
      onSelectElementIds(nextElementIds);
      clipboardRef.current = {
        elements: pastedElements,
        unionRect: offsetSlideRect(payload.unionRect, pasteDelta.x, pasteDelta.y),
      };
      return true;
    };

    const moveSelection = (event: KeyboardEvent) => {
      const delta = ARROW_DELTAS[event.key];
      const currentSlide = activeSlideRef.current;
      const currentSelectedElementIds = selectedElementIdsRef.current;
      if (!currentSlide || !currentSelectedElementIds.length || !delta) {
        return false;
      }

      const doc = iframeRef.current?.contentDocument;
      const step = getShortcutStep(event);
      const operations = currentSelectedElementIds
        .map((elementId) => {
          const element = currentSlide.elements.find((candidate) => candidate.id === elementId);
          if (!isLayoutEditable(element)) {
            return null;
          }

          const node = doc ? querySlideElement<HTMLElement>(doc, elementId) : null;
          if (!node) {
            return null;
          }

          const previousStyle = captureElementLayoutStyleSnapshot(node);
          const transformParts = parseTransformParts(previousStyle.transform);
          const nextStyle = normalizeElementLayoutStyleSnapshot({
            ...previousStyle,
            transform: composeTransform(
              transformParts.translateX + delta.x * step,
              transformParts.translateY + delta.y * step,
              transformParts.rotate
            ),
            transformOrigin: previousStyle.transformOrigin || "center center",
          });

          return {
            type: "element.layout.update" as const,
            slideId: currentSlide.id,
            elementId,
            previousStyle,
            nextStyle,
            timestamp: Date.now(),
          };
        })
        .filter((operation): operation is ElementLayoutUpdateOperation => Boolean(operation));

      commitOperations(currentSlide.id, operations, onCommitOperation);
      return true;
    };

    const commitLayerAction = (direction: "front" | "forward" | "backward" | "back") => {
      const currentSlide = activeSlideRef.current;
      const currentSelectedElementIds = selectedElementIdsRef.current;
      if (!currentSlide || !currentSelectedElementIds.length) {
        return false;
      }

      const doc = iframeRef.current?.contentDocument;
      const operations = currentSelectedElementIds
        .map((elementId) => {
          const node = doc ? querySlideElement<HTMLElement>(doc, elementId) : null;
          if (!node) {
            return null;
          }

          const previousStyle = captureElementLayoutStyleSnapshot(node);
          const numericZIndex = Number.parseInt(previousStyle.zIndex || "", 10);
          const currentZIndex = Number.isFinite(numericZIndex) ? numericZIndex : 0;
          const nextZIndex =
            direction === "front"
              ? 999
              : direction === "back"
                ? 0
                : Math.max(0, currentZIndex + (direction === "forward" ? 1 : -1));
          const nextStyle = normalizeElementLayoutStyleSnapshot({
            ...previousStyle,
            zIndex: String(nextZIndex),
          });

          if (nextStyle.zIndex === previousStyle.zIndex) {
            return null;
          }

          return {
            type: "element.layout.update" as const,
            slideId: currentSlide.id,
            elementId,
            previousStyle,
            nextStyle,
            timestamp: Date.now(),
          };
        })
        .filter((operation): operation is ElementLayoutUpdateOperation => Boolean(operation));

      return commitOperations(currentSlide.id, operations, onCommitOperation);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditingTextRef.current) {
        return;
      }

      const key = event.key.toLowerCase();
      const commandKey = event.metaKey || event.ctrlKey;
      const isUndo = commandKey && !event.shiftKey && key === "z";
      const isRedo = commandKey && ((event.shiftKey && key === "z") || key === "y");
      const isEditableTarget = isEditableElementTarget(event.target);
      let handled = false;

      if (isUndo && canUndoRef.current) {
        onUndo();
        handled = true;
      } else if (isRedo && canRedoRef.current) {
        onRedo();
        handled = true;
      } else if (isEditableTarget) {
        return;
      } else if (commandKey && !event.shiftKey && key === "c") {
        handled = copySelection();
      } else if (commandKey && !event.shiftKey && key === "x") {
        handled = copySelection() && removeSelection();
      } else if (commandKey && !event.shiftKey && key === "v") {
        handled = pasteSelection();
      } else if (commandKey && !event.shiftKey && key === "d") {
        handled = copySelection() && pasteSelection();
      } else if (event.key === "Backspace" || event.key === "Delete") {
        handled = removeSelection();
      } else if (event.key === "Escape") {
        if (selectedElementIdsRef.current.length) {
          onSelectElementIds([]);
          handled = true;
        }
      } else if (event.key in ARROW_DELTAS) {
        handled = moveSelection(event);
      } else if (commandKey && event.key === "]") {
        handled = commitLayerAction(event.shiftKey ? "front" : "forward");
      } else if (commandKey && event.key === "[") {
        handled = commitLayerAction(event.shiftKey ? "back" : "backward");
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const iframeDocument = iframeRef.current?.contentDocument;
    const iframeWindow = iframeRef.current?.contentWindow;
    window.addEventListener("keydown", onKeyDown);
    iframeWindow?.addEventListener("keydown", onKeyDown);
    iframeDocument?.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      iframeWindow?.removeEventListener("keydown", onKeyDown);
      iframeDocument?.removeEventListener("keydown", onKeyDown);
    };
  }, [iframeRef, onCommitOperation, onRedo, onSelectElementIds, onUndo, slideHeight, slideWidth]);
}

function commitOperations(
  slideId: string,
  operations: AtomicSlideOperation[],
  onCommitOperation: (operation: SlideOperation) => void
) {
  if (!operations.length) {
    return false;
  }

  onCommitOperation(
    operations.length === 1
      ? operations[0]
      : {
          type: "operation.batch",
          slideId,
          operations,
          timestamp: Date.now(),
        }
  );
  return true;
}

function placeCopiedElement(elementHtml: string, rect: SlideRect): string {
  if (typeof DOMParser === "undefined") {
    return elementHtml;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<template>${elementHtml}</template>`, "text/html");
  const root = doc.querySelector("template")?.content.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    return elementHtml;
  }

  const transformParts = parseTransformParts(root.style.transform);
  const nextTransform = composeTransform(0, 0, transformParts.rotate);
  root.style.position = "absolute";
  root.style.left = `${roundCssNumber(rect.x)}px`;
  root.style.top = `${roundCssNumber(rect.y)}px`;
  root.style.width = `${roundCssNumber(rect.width)}px`;
  root.style.height = `${roundCssNumber(rect.height)}px`;
  root.style.margin = "0px";
  root.style.boxSizing = "border-box";

  if (nextTransform) {
    root.style.transform = nextTransform;
  } else {
    root.style.removeProperty("transform");
  }

  if (!root.style.transformOrigin) {
    root.style.transformOrigin = "center center";
  }

  return root.outerHTML;
}

function elementRectToSlideRect(elementRect: DOMRect, rootRect: DOMRect): SlideRect {
  return {
    x: elementRect.left - rootRect.left,
    y: elementRect.top - rootRect.top,
    width: elementRect.width,
    height: elementRect.height,
  };
}

function getSlideBounds(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  activeSlide: SlideModel,
  fallback: { width: number; height: number }
) {
  const doc = iframeRef.current?.contentDocument;
  const rootNode = doc?.querySelector<HTMLElement>(activeSlide.rootSelector);
  const rootRect = rootNode?.getBoundingClientRect();

  return {
    width: rootRect?.width || fallback.width,
    height: rootRect?.height || fallback.height,
  };
}

function offsetSlideRect(rect: SlideRect, offsetX: number, offsetY: number): SlideRect {
  return {
    x: roundCssNumber(rect.x + offsetX),
    y: roundCssNumber(rect.y + offsetY),
    width: rect.width,
    height: rect.height,
  };
}

function getUnionRect(rects: SlideRect[]): SlideRect | null {
  if (!rects.length) {
    return null;
  }

  return rects.reduce((accumulator, rect) => {
    const minX = Math.min(accumulator.x, rect.x);
    const minY = Math.min(accumulator.y, rect.y);
    const maxX = Math.max(accumulator.x + accumulator.width, rect.x + rect.width);
    const maxY = Math.max(accumulator.y + accumulator.height, rect.y + rect.height);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  });
}

function getClampedPasteDelta(
  sourceRect: SlideRect,
  preferredOffset: number,
  slide: { width: number; height: number }
) {
  const maxX = Math.max(0, slide.width - sourceRect.width);
  const maxY = Math.max(0, slide.height - sourceRect.height);
  const nextX = Math.min(maxX, Math.max(0, sourceRect.x + preferredOffset));
  const nextY = Math.min(maxY, Math.max(0, sourceRect.y + preferredOffset));

  return {
    x: roundCssNumber(nextX - sourceRect.x),
    y: roundCssNumber(nextY - sourceRect.y),
  };
}

export { useEditorKeyboardShortcuts };
