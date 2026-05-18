import type {
  AtomicSlideOperation,
  SlideModel,
  SlideOperation,
  StageRect,
} from "@starrykit/slides-core";
import { SLIDE_ROOT_ID, querySlideNode } from "@starrykit/slides-core";
import type { RefObject } from "react";
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
  const selectedTargetElementId = selectedElementId ?? SLIDE_ROOT_ID;
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

  const commitStyleChanges = (changes: Array<{ propertyName: string; nextValue: string }>) => {
    if (!activeSlide || changes.length === 0) {
      return;
    }

    const operations = changes
      .map(({ propertyName, nextValue }) =>
        createStyleUpdateOperation({
          elementId: selectedTargetElementId,
          nextValue,
          propertyName,
          slide: activeSlide,
        })
      )
      .filter((op): op is NonNullable<typeof op> => op !== null);

    commitSelectionOperation(operations);
  };

  return {
    attributeValues,
    commitStyleChange,
    commitStyleChanges,
    previewStyleChange: (propertyName: string, nextValue: string | null) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) {
        return;
      }

      const selectedNode = querySlideNode<HTMLElement>(doc, selectedTargetElementId);
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

      const doc = iframeRef.current?.contentDocument ?? null;

      // Compute the absolute slide-coordinate position of the nearest positioned
      // ancestor from live DOM getBoundingClientRect.  Absolutely-positioned
      // children use the nearest positioned (non-static) ancestor as their
      // reference frame — not necessarily the immediate parent.  We need this
      // BCR-derived position when the positioned ancestor is a non-editable
      // container that is not tracked in elementRects (e.g. a "positioned-col"
      // div positioned via CSS class rather than inline style).
      let parentPosition: { x: number; y: number } | undefined;
      if (doc && activeSlide) {
        const groupEl = doc.querySelector<HTMLElement>(`[data-editable-id="${selectedElementId}"]`);
        const rootEl = doc.querySelector<HTMLElement>(activeSlide.rootSelector);
        // Walk up from the immediate parent to find the nearest positioned
        // ancestor — this is the reference frame for absolutely-positioned
        // children after ungroup.
        let positionedAncestor: HTMLElement | null = groupEl?.parentElement ?? null;
        while (
          positionedAncestor &&
          positionedAncestor !== rootEl &&
          getComputedStyle(positionedAncestor).position === "static"
        ) {
          positionedAncestor = positionedAncestor.parentElement;
        }
        // Only inject a BCR-based parentPosition when the positioned ancestor
        // differs from what getEditableAncestorRect would return (i.e. when it
        // is a non-editable positioned container).  If the positioned ancestor
        // is the root element itself, skip — the fallback handles that case.
        // Also skip when the offset is {0,0} — same as the fallback.
        if (
          positionedAncestor &&
          rootEl &&
          positionedAncestor !== rootEl &&
          !positionedAncestor.hasAttribute("data-editable")
        ) {
          const rootRect = rootEl.getBoundingClientRect();
          const parentBCR = positionedAncestor.getBoundingClientRect();
          // getBoundingClientRect returns the border-box.  Absolutely-positioned
          // children use the padding-box as the coordinate origin, so we add
          // border widths.  Otherwise a 1px border shifts all promoted children.
          const parentStyle = getComputedStyle(positionedAncestor);
          const borderLeft = Number.parseFloat(parentStyle.borderLeftWidth) || 0;
          const borderTop = Number.parseFloat(parentStyle.borderTopWidth) || 0;
          const offsetX = parentBCR.left - rootRect.left + borderLeft;
          const offsetY = parentBCR.top - rootRect.top + borderTop;
          // Skip when offset is zero — this is the slide-container / root-edge
          // case where the fallback (getEditableAncestorRect → {0,0}) is identical.
          if (offsetX !== 0 || offsetY !== 0) {
            const scaleX = activeSlide.width / (rootRect.width || 1);
            const scaleY = activeSlide.height / (rootRect.height || 1);
            // Round to nearest integer to avoid sub-pixel rounding differences
            // between elementRects (BCR-derived) and parentPosition (also BCR-derived)
            // that can cause a 1px shift in the ungrouped children.
            parentPosition = {
              x: Math.round(offsetX * scaleX),
              y: Math.round(offsetY * scaleY),
            };
          }
        }
      }

      const operation = createUngroupOperation({
        slide: activeSlide,
        elementId: selectedElementId,
        elementRects: createGroupElementRectMap({
          doc,
          slide: activeSlide,
          flattenRootElementId: selectedElementId,
        }),
        elementPresentationStyles: createElementPresentationStyleMap({
          doc,
          elementId: selectedElementId,
        }),
        parentPosition,
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
