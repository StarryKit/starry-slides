import {
  type EditableElement,
  type SlideModel,
  type StageRect,
  elementRectToStageRect,
  querySlideElement,
} from "@starry-slides/core";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { type CssPropertyRow, collectCssProperties } from "../lib/collect-css-properties";

interface UseSlideInspectorOptions {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  activeSlide: SlideModel | undefined;
  selectedElement: EditableElement | undefined;
  selectedElementId: string | null;
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
  selectedElementId,
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
    const inspectedNode = selectedElementId
      ? querySlideElement<HTMLElement>(doc, selectedElementId)
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

    if (!selectedElementId || !rootNode) {
      setSelectedStageRect((currentRect) => (currentRect === null ? currentRect : null));
      setSelectionOverlay((currentRect) => (currentRect === null ? currentRect : null));
      return;
    }

    const elementRect = inspectedNode.getBoundingClientRect();
    const rootRect = rootNode.getBoundingClientRect();
    const stageRect = elementRectToStageRect(elementRect, rootRect, {
      scale,
      offsetX,
      offsetY,
      slideWidth,
      slideHeight,
    });

    setSelectedStageRect((currentRect) =>
      areStageRectsEqual(currentRect, stageRect) ? currentRect : stageRect
    );
    setSelectionOverlay((currentRect) =>
      areStageRectsEqual(currentRect, stageRect) ? currentRect : stageRect
    );
  }, [activeSlide, iframeRef, offsetX, offsetY, scale, selectedElementId, slideHeight, slideWidth]);

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
