import { useEffect, useRef } from "react";
import {
  type ElementLayoutUpdateOperation,
  type ElementRemoveOperation,
  captureElementLayoutStyleSnapshot,
  composeTransform,
  createElementPlacement,
  createUniqueElementId,
  getSlideElementHtml,
  normalizeElementLayoutStyleSnapshot,
  parseTransformParts,
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
import {
  ARROW_DELTAS,
  commitOperations,
  createIdMapForCopiedElement,
  getShortcutStep,
  isEditableElementTarget,
  isLayoutEditable,
} from "./editor-keyboard-operations";
import type { ClipboardPayload, UseEditorKeyboardShortcutsOptions } from "./editor-keyboard-types";

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

export { useEditorKeyboardShortcuts };
