import { useEffect, useRef } from "react";
import {
  type ElementLayoutUpdateOperation,
  captureElementLayoutStyleSnapshot,
  composeTransform,
  normalizeElementLayoutStyleSnapshot,
  parseTransformParts,
  querySlideElement,
} from "../../core";
import {
  ARROW_DELTAS,
  commitOperations,
  getShortcutStep,
  isEditableElementTarget,
  isLayoutEditable,
} from "./editor-keyboard-operations";
import type { ClipboardPayload, UseEditorKeyboardShortcutsOptions } from "./editor-keyboard-types";
import {
  commitObjectOperations,
  copyObjectSelection,
  createPasteObjectSelection,
  createRemoveObjectSelectionOperations,
} from "./object-clipboard-commands";

function useEditorKeyboardShortcuts({
  activeSlide,
  selectedElementIds,
  iframeRef,
  slideWidth,
  slideHeight,
  isEditingText,
  canUndo,
  canRedo,
  onEscapeSelection,
  onNavigateSlide,
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
  const onEscapeSelectionRef = useRef(onEscapeSelection);
  const activeSlideHtmlSource = activeSlide?.htmlSource ?? "";
  const onNavigateSlideRef = useRef(onNavigateSlide);

  activeSlideRef.current = activeSlide;
  selectedElementIdsRef.current = selectedElementIds;
  canUndoRef.current = canUndo;
  canRedoRef.current = canRedo;
  isEditingTextRef.current = isEditingText;
  onEscapeSelectionRef.current = onEscapeSelection;
  onNavigateSlideRef.current = onNavigateSlide;

  useEffect(() => {
    const copySelection = () => {
      const payload = copyObjectSelection({
        slide: activeSlideRef.current,
        selectedElementIds: selectedElementIdsRef.current,
        iframeRef,
      });
      if (payload) {
        clipboardRef.current = payload;
      }
      return Boolean(payload);
    };

    const removeSelection = () => {
      const currentSlide = activeSlideRef.current;
      if (!currentSlide) {
        return false;
      }

      const operations = createRemoveObjectSelectionOperations({
        slide: currentSlide,
        selectedElementIds: selectedElementIdsRef.current,
      });

      if (!operations.length) {
        return false;
      }

      commitObjectOperations(currentSlide.id, operations, onCommitOperation);
      onSelectElementIds([]);
      return true;
    };

    const pasteSelection = (payload = clipboardRef.current) => {
      const currentSlide = activeSlideRef.current;
      const paste = createPasteObjectSelection({
        slide: currentSlide,
        payload,
        iframeRef,
        slideSize: {
          width: slideWidth,
          height: slideHeight,
        },
      });
      if (!currentSlide || !paste) {
        return false;
      }

      commitObjectOperations(currentSlide.id, paste.operations, onCommitOperation);
      activeSlideRef.current = {
        ...currentSlide,
        htmlSource: paste.nextHtmlSource,
      };
      onSelectElementIds(paste.selectedElementIds);
      clipboardRef.current = paste.nextClipboard;
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
        handled = onEscapeSelectionRef.current();
      } else if (event.key in ARROW_DELTAS) {
        const hasSelection = selectedElementIdsRef.current.length > 0;
        if (hasSelection) {
          handled = moveSelection(event);
        } else if (!event.altKey && !event.shiftKey && !commandKey) {
          handled = onNavigateSlideRef.current(
            event.key === "ArrowUp" || event.key === "ArrowLeft" ? "previous" : "next"
          );
        }
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

    const iframeDocument = getIframeDocumentForSlideHtml(activeSlideHtmlSource, iframeRef);
    const iframeWindow = iframeRef.current?.contentWindow;
    window.addEventListener("keydown", onKeyDown);
    iframeWindow?.addEventListener("keydown", onKeyDown);
    iframeDocument?.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      iframeWindow?.removeEventListener("keydown", onKeyDown);
      iframeDocument?.removeEventListener("keydown", onKeyDown);
    };
  }, [
    activeSlideHtmlSource,
    iframeRef,
    onCommitOperation,
    onRedo,
    onSelectElementIds,
    onUndo,
    slideHeight,
    slideWidth,
  ]);
}

function getIframeDocumentForSlideHtml(
  _htmlSource: string,
  iframeRef: UseEditorKeyboardShortcutsOptions["iframeRef"]
) {
  return iframeRef.current?.contentDocument;
}

export { useEditorKeyboardShortcuts };
