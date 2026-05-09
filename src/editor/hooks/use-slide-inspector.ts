import type { RefObject } from "react";
import { useEffect, useState } from "react";
import {
  type EditableElement,
  type SlideModel,
  type StageRect,
  elementRectToStageRect,
  querySlideElement,
} from "../../core";
import { type CssPropertyRow, collectCssProperties } from "../lib/collect-css-properties";
import { getVisibleImageRect } from "../lib/image-crop";

interface UseSlideInspectorOptions {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  activeSlide: SlideModel | undefined;
  selectedElement: EditableElement | undefined;
  selectedElementIds: string[];
  preselectedElementId: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
  slideWidth: number;
  slideHeight: number;
}

interface SlideInspectorResult {
  selectedStageRect: StageRect | null;
  preselectionOverlay: StageRect | null;
  selectionOverlay: StageRect | null;
  selectionLabel: string;
  inspectedStyles: CssPropertyRow[];
}

interface KeyedStageRect {
  key: string;
  rect: StageRect | null;
}

function useSlideInspector({
  iframeRef,
  activeSlide,
  selectedElement,
  selectedElementIds,
  preselectedElementId,
  scale,
  offsetX,
  offsetY,
  slideWidth,
  slideHeight,
}: UseSlideInspectorOptions): SlideInspectorResult {
  const selectionKey = selectedElementIds.join("\u0000");
  const preselectionKey = preselectedElementId ?? "";
  const [selectedStageRectState, setSelectedStageRectState] = useState<KeyedStageRect>({
    key: "",
    rect: null,
  });
  const [preselectionOverlayState, setPreselectionOverlayState] = useState<KeyedStageRect>({
    key: "",
    rect: null,
  });
  const [selectionOverlayState, setSelectionOverlayState] = useState<KeyedStageRect>({
    key: "",
    rect: null,
  });
  const [inspectedStyles, setInspectedStyles] = useState<CssPropertyRow[]>([]);
  const selectedStageRect =
    selectedStageRectState.key === selectionKey ? selectedStageRectState.rect : null;
  const preselectionOverlay =
    preselectionOverlayState.key === preselectionKey ? preselectionOverlayState.rect : null;
  const selectionOverlay =
    selectionOverlayState.key === selectionKey ? selectionOverlayState.rect : null;

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc || !activeSlide) {
      setSelectedStageRectState({ key: selectionKey, rect: null });
      setPreselectionOverlayState({ key: preselectionKey, rect: null });
      setSelectionOverlayState({ key: selectionKey, rect: null });
      setInspectedStyles([]);
      return;
    }

    const rootNode = doc.querySelector<HTMLElement>(activeSlide.rootSelector);
    const inspectedNode = selectedElementIds[0]
      ? querySlideElement<HTMLElement>(doc, selectedElementIds[0])
      : rootNode;

    if (!inspectedNode) {
      setSelectedStageRectState({ key: selectionKey, rect: null });
      setPreselectionOverlayState({ key: preselectionKey, rect: null });
      setSelectionOverlayState({ key: selectionKey, rect: null });
      setInspectedStyles([]);
      return;
    }

    const nextInspectedStyles = collectCssProperties(inspectedNode);
    setInspectedStyles((currentStyles) =>
      areCssPropertyRowsEqual(currentStyles, nextInspectedStyles)
        ? currentStyles
        : nextInspectedStyles
    );

    const rootRect = rootNode?.getBoundingClientRect();
    let nextSelectionRect: StageRect | null = null;
    if (!selectedElementIds.length || !rootNode || !rootRect) {
      nextSelectionRect = null;
    } else {
      const elementRects = selectedElementIds
        .map((elementId) => querySlideElement<HTMLElement>(doc, elementId))
        .filter((node): node is HTMLElement => Boolean(node))
        .map((node) =>
          elementRectToStageRect(getVisibleImageRect(node), rootRect, {
            scale,
            offsetX,
            offsetY,
            slideWidth,
            slideHeight,
          })
        );

      if (elementRects.length) {
        nextSelectionRect = elementRects.reduce((accumulator, rect) => {
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
    }

    setSelectedStageRectState((currentState) =>
      areKeyedStageRectsEqual(currentState, selectionKey, nextSelectionRect)
        ? currentState
        : { key: selectionKey, rect: nextSelectionRect }
    );
    setSelectionOverlayState((currentState) =>
      areKeyedStageRectsEqual(currentState, selectionKey, nextSelectionRect)
        ? currentState
        : { key: selectionKey, rect: nextSelectionRect }
    );

    const preselectionNode = preselectedElementId
      ? querySlideElement<HTMLElement>(doc, preselectedElementId)
      : null;
    const preselectionRect =
      preselectionNode && rootRect
        ? elementRectToStageRect(getVisibleImageRect(preselectionNode), rootRect, {
            scale,
            offsetX,
            offsetY,
            slideWidth,
            slideHeight,
          })
        : null;
    setPreselectionOverlayState((currentState) =>
      areKeyedStageRectsEqual(currentState, preselectionKey, preselectionRect)
        ? currentState
        : { key: preselectionKey, rect: preselectionRect }
    );
  }, [
    activeSlide,
    iframeRef,
    offsetX,
    offsetY,
    preselectedElementId,
    preselectionKey,
    scale,
    selectedElementIds,
    selectionKey,
    slideHeight,
    slideWidth,
  ]);

  return {
    selectedStageRect,
    preselectionOverlay,
    selectionOverlay,
    selectionLabel: selectedElement?.type || "element",
    inspectedStyles,
  };
}

function areKeyedStageRectsEqual(
  currentState: KeyedStageRect,
  key: string,
  rect: StageRect | null
): boolean {
  return currentState.key === key && areStageRectsEqual(currentState.rect, rect);
}

function areStageRectsEqual(left: StageRect | null, right: StageRect | null): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

function areCssPropertyRowsEqual(left: CssPropertyRow[], right: CssPropertyRow[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((row, index) => {
    const rightRow = right[index];
    return rightRow?.name === row.name && rightRow.value === row.value;
  });
}

export { useSlideInspector };
