import type { RefObject } from "react";
import type { AtomicSlideOperation, SlideModel, SlideOperation, StageRect } from "../../core";
import { querySlideElement } from "../../core";
import {
  createAttributeUpdateOperation,
  createStyleUpdateOperation,
  getHtmlAttributeValue,
} from "../editor-operations";
import {
  batchSelectionOperation,
  createArrangeTransformValue,
  createDistributeOperations,
  createDuplicateSelectionOperations,
  createElementPresentationStyleMap,
  createGroupElementRectMap,
  createGroupOperation,
  createLayerOperations,
  createRemoveSelectionOperations,
  createUngroupOperation,
} from "../lib/editor-selection-operations";

interface UseEditorElementActionsOptions {
  activeSlide: SlideModel | undefined;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  selectedElementId: string | null;
  selectedElementIds: string[];
  isSelectedElementLocked: boolean;
  selectionOverlay: StageRect | null;
  stage: { offsetX: number; offsetY: number; scale: number; width: number; height: number };
  onCommitOperation: (operation: SlideOperation) => void;
  onSelectElementIds: (elementIds: string[]) => void;
  onLockedElementIdsBySlideIdChange: (
    updater: (current: Record<string, string[]>) => Record<string, string[]>
  ) => void;
}

function useEditorElementActions({
  activeSlide,
  iframeRef,
  selectedElementId,
  selectedElementIds,
  isSelectedElementLocked,
  selectionOverlay,
  stage,
  onCommitOperation,
  onSelectElementIds,
  onLockedElementIdsBySlideIdChange,
}: UseEditorElementActionsOptions) {
  const selectedTargetElementId = selectedElementId ?? "slide-root";
  const attributeValues = {
    locked: isSelectedElementLocked ? "true" : "",
    ariaLabel: activeSlide
      ? getHtmlAttributeValue(activeSlide, selectedTargetElementId, "aria-label")
      : "",
    linkUrl: activeSlide
      ? getHtmlAttributeValue(activeSlide, selectedTargetElementId, "data-link-url")
      : "",
  };

  const commitSelectionOperation = (operations: AtomicSlideOperation[]) => {
    if (!activeSlide) {
      return;
    }

    const operation = batchSelectionOperation(activeSlide.id, operations);
    if (operation) {
      onCommitOperation(operation);
    }
  };

  const commitStyleChange = (propertyName: string, nextValue: string) => {
    if (!activeSlide) {
      return;
    }

    const operation = createStyleUpdateOperation({
      elementId: selectedTargetElementId,
      nextValue,
      propertyName,
      slide: activeSlide,
    });

    if (operation) {
      onCommitOperation(operation);
    }
  };

  return {
    attributeValues,
    commitStyleChange,
    previewStyleChange: (propertyName: string, nextValue: string | null) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) {
        return;
      }

      const selectedNode = querySlideElement<HTMLElement>(doc, selectedTargetElementId);
      if (!selectedNode) {
        return;
      }

      const previewAttribute = `data-editor-preview-${propertyName}`;
      const previewOriginalValue = selectedNode.getAttribute(previewAttribute);
      if (nextValue === null) {
        if (previewOriginalValue === null) {
          return;
        }

        selectedNode.style.setProperty(propertyName, previewOriginalValue);
        selectedNode.removeAttribute(previewAttribute);
        return;
      }

      if (previewOriginalValue === null) {
        selectedNode.setAttribute(
          previewAttribute,
          selectedNode.style.getPropertyValue(propertyName)
        );
      }
      selectedNode.style.setProperty(propertyName, nextValue);
    },
    commitAttributeChange: (attributeName: string, nextValue: string) => {
      if (!activeSlide) {
        return;
      }

      if (attributeName === "data-editor-locked") {
        const nextLocked = nextValue.trim() === "true";
        if (!selectedElementId) {
          return;
        }

        onLockedElementIdsBySlideIdChange((current) => {
          const nextIds = new Set(current[activeSlide.id] ?? []);
          if (nextLocked) {
            nextIds.add(selectedElementId);
          } else {
            nextIds.delete(selectedElementId);
          }

          return {
            ...current,
            [activeSlide.id]: Array.from(nextIds),
          };
        });
        return;
      }

      const operation = createAttributeUpdateOperation({
        attributeName,
        elementId: selectedTargetElementId,
        nextValue,
        slide: activeSlide,
      });

      if (operation) {
        onCommitOperation(operation);
      }
    },
    commitLayerAction: (action: string) => {
      if (!activeSlide || selectedElementIds.length === 0) {
        return;
      }

      commitSelectionOperation(createLayerOperations(activeSlide, selectedElementIds, action));
    },
    duplicateSelection: () => {
      if (!activeSlide || selectedElementIds.length === 0) {
        return;
      }

      const { operations, nextElementIds } = createDuplicateSelectionOperations({
        slide: activeSlide,
        elementIds: selectedElementIds,
        doc: iframeRef.current?.contentDocument,
      });

      commitSelectionOperation(operations);
      if (nextElementIds.length) {
        onSelectElementIds(nextElementIds);
      }
    },
    deleteSelection: () => {
      if (!activeSlide || selectedElementIds.length === 0) {
        return;
      }

      const operations = createRemoveSelectionOperations(activeSlide, selectedElementIds);
      commitSelectionOperation(operations);
      if (operations.length) {
        onSelectElementIds([]);
      }
    },
    groupSelection: () => {
      if (!activeSlide || selectedElementIds.length < 2) {
        return;
      }

      const group = createGroupOperation({
        slide: activeSlide,
        elementIds: selectedElementIds,
        elementRects: createGroupElementRectMap({
          doc: iframeRef.current?.contentDocument,
          slide: activeSlide,
        }),
      });

      if (group) {
        onCommitOperation(group.operation);
        onSelectElementIds([group.groupElementId]);
      }
    },
    ungroupSelection: () => {
      if (!activeSlide || selectedElementIds.length !== 1 || !selectedElementId) {
        return;
      }

      const operation = createUngroupOperation({
        slide: activeSlide,
        elementId: selectedElementId,
        elementRects: createGroupElementRectMap({
          doc: iframeRef.current?.contentDocument,
          slide: activeSlide,
          flattenRootElementId: selectedElementId,
        }),
        elementPresentationStyles: createElementPresentationStyleMap({
          doc: iframeRef.current?.contentDocument,
          elementId: selectedElementId,
        }),
      });

      if (operation) {
        onCommitOperation(operation);
        onSelectElementIds(operation.childElementIds);
      }
    },
    commitArrangeAction: (action: string) => {
      if (!activeSlide || !selectedElementId || !selectionOverlay) {
        return;
      }

      const nextTransform = createArrangeTransformValue({
        action,
        elementId: selectedElementId,
        slide: activeSlide,
        selectionOverlay,
        stage,
      });
      if (nextTransform !== null) {
        commitStyleChange("transform", nextTransform);
      }
    },
    distributeSelection: (action: string) => {
      if (!activeSlide || selectedElementIds.length < 3) {
        return;
      }

      commitSelectionOperation(
        createDistributeOperations({
          slide: activeSlide,
          elementIds: selectedElementIds,
          doc: iframeRef.current?.contentDocument,
          action,
        })
      );
    },
  };
}

export { useEditorElementActions };
