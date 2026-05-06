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
import {
  type ContentBounds,
  getVisualContentBounds,
} from "../lib/content-bounds";

interface UseSlideInspectorOptions {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  activeSlide: SlideModel | undefined;
  selectedElement: EditableElement | undefined;
  selectedElementIds: string[];
  scale: number;
  offsetX: number;
  offsetY: number;
  slideWidth: number;
  slideHeight: number;
}

interface SlideInspectorResult {
  selectedStageRect: StageRect | null;
  selectionOverlay: StageRect | null;
  selectionLabel: string;
  inspectedStyles: CssPropertyRow[];
}

function useSlideInspector({
  iframeRef,
  activeSlide,
  selectedElement,
  selectedElementIds,
  scale,
  offsetX,
  offsetY,
  slideWidth,
  slideHeight,
}: UseSlideInspectorOptions): SlideInspectorResult {
  const [selectedStageRect, setSelectedStageRect] = useState<StageRect | null>(null);
  const [selectionOverlay, setSelectionOverlay] = useState<StageRect | null>(null);
  const [inspectedStyles, setInspectedStyles] = useState<CssPropertyRow[]>([]);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc || !activeSlide) {
      setSelectedStageRect(null);
      setSelectionOverlay(null);
      setInspectedStyles([]);
      return;
    }

    const rootNode = doc.querySelector<HTMLElement>(activeSlide.rootSelector);
    const inspectedNode = selectedElementIds[0]
      ? querySlideElement<HTMLElement>(doc, selectedElementIds[0])
      : rootNode;

    if (!inspectedNode) {
      setSelectedStageRect(null);
      setSelectionOverlay(null);
      setInspectedStyles([]);
      return;
    }

    const nextInspectedStyles = collectCssProperties(inspectedNode);
    setInspectedStyles((currentStyles) =>
      areCssPropertyRowsEqual(currentStyles, nextInspectedStyles)
        ? currentStyles
        : nextInspectedStyles
    );

    if (!selectedElementIds.length || !rootNode) {
      setSelectedStageRect((currentRect) => (currentRect === null ? currentRect : null));
      setSelectionOverlay((currentRect) => (currentRect === null ? currentRect : null));
      return;
    }

    const rootRect = rootNode.getBoundingClientRect();
    const elementRects = selectedElementIds
      .map((elementId) => querySlideElement<HTMLElement>(doc, elementId))
      .filter((node): node is HTMLElement => Boolean(node))
      .map((node) => {
        const visualBounds: ContentBounds = getVisualContentBounds(node);
        return elementRectToStageRect(
          {
            left: visualBounds.left,
            top: visualBounds.top,
            width: visualBounds.width,
            height: visualBounds.height,
          },
          rootRect,
          {
            scale,
            offsetX,
            offsetY,
            slideWidth,
            slideHeight,
          }
        );
      });

    if (!elementRects.length) {
      setSelectedStageRect((currentRect) => (currentRect === null ? currentRect : null));
      setSelectionOverlay((currentRect) => (currentRect === null ? currentRect : null));
      return;
    }

    const stageRect = elementRects.reduce((accumulator, rect) => {
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

    setSelectedStageRect((currentRect) =>
      areStageRectsEqual(currentRect, stageRect) ? currentRect : stageRect
    );
    setSelectionOverlay((currentRect) =>
      areStageRectsEqual(currentRect, stageRect) ? currentRect : stageRect
    );
  }, [
    activeSlide,
    iframeRef,
    offsetX,
    offsetY,
    scale,
    selectedElementIds,
    slideHeight,
    slideWidth,
  ]);

  return {
    selectedStageRect,
    selectionOverlay,
    selectionLabel: selectedElement?.type || "element",
    inspectedStyles,
  };
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
