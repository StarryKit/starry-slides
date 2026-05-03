import {
  type EditableElement,
  type SlideModel,
  type StageRect,
  elementRectToStageRect,
} from "@html-slides-editor/core";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { type CssPropertyRow, collectCssProperties } from "../lib/collect-css-properties";

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
      ? doc.querySelector<HTMLElement>(`[data-editor-id="${selectedElementIds[0]}"]`)
      : rootNode;

    if (!inspectedNode) {
      setSelectedStageRect(null);
      setSelectionOverlay(null);
      setInspectedStyles([]);
      return;
    }

    setInspectedStyles(collectCssProperties(inspectedNode));

    if (!selectedElementIds.length || !rootNode) {
      setSelectedStageRect(null);
      setSelectionOverlay(null);
      return;
    }

    const rootRect = rootNode.getBoundingClientRect();
    const elementRects = selectedElementIds
      .map((elementId) => doc.querySelector<HTMLElement>(`[data-editor-id="${elementId}"]`))
      .filter((node): node is HTMLElement => Boolean(node))
      .map((node) =>
        elementRectToStageRect(node.getBoundingClientRect(), rootRect, {
          scale,
          offsetX,
          offsetY,
          slideWidth,
          slideHeight,
        })
      );

    if (!elementRects.length) {
      setSelectedStageRect(null);
      setSelectionOverlay(null);
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

    setSelectedStageRect(stageRect);
    setSelectionOverlay(stageRect);
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

export { useSlideInspector };
