import {
  type EditableElement,
  type SlideModel,
  type StageRect,
  elementRectToStageRect,
} from "@html-slides-editor/core";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { type CssPropertyRow, collectCssProperties } from "../lib/collect-css-properties";

const DEFAULT_INSPECTED_LABEL = "slide root";
const SELECTION_OVERLAY_PADDING_X = 8;
const SELECTION_OVERLAY_PADDING_Y = 14;

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
  selectionOverlay: StageRect | null;
  selectionLabel: string;
  inspectedLabel: string;
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
  const [selectionOverlay, setSelectionOverlay] = useState<StageRect | null>(null);
  const [inspectedStyles, setInspectedStyles] = useState<CssPropertyRow[]>([]);
  const [inspectedLabel, setInspectedLabel] = useState(DEFAULT_INSPECTED_LABEL);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc || !activeSlide) {
      setSelectionOverlay(null);
      setInspectedStyles([]);
      setInspectedLabel(DEFAULT_INSPECTED_LABEL);
      return;
    }

    const rootNode = doc.querySelector<HTMLElement>(activeSlide.rootSelector);
    const inspectedNode = selectedElementId
      ? doc.querySelector<HTMLElement>(`[data-editor-id="${selectedElementId}"]`)
      : rootNode;

    if (!inspectedNode) {
      setSelectionOverlay(null);
      setInspectedStyles([]);
      setInspectedLabel(DEFAULT_INSPECTED_LABEL);
      return;
    }

    setInspectedStyles(collectCssProperties(inspectedNode));
    setInspectedLabel(
      selectedElement
        ? `${selectedElement.type} · ${selectedElement.tagName}`
        : rootNode?.tagName.toLowerCase() || DEFAULT_INSPECTED_LABEL
    );

    if (!selectedElementId || !rootNode) {
      setSelectionOverlay(null);
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

    setSelectionOverlay({
      x: stageRect.x - SELECTION_OVERLAY_PADDING_X,
      y: stageRect.y - SELECTION_OVERLAY_PADDING_Y,
      width: stageRect.width + SELECTION_OVERLAY_PADDING_X * 2,
      height: stageRect.height + SELECTION_OVERLAY_PADDING_Y * 2,
    });
  }, [
    activeSlide,
    iframeRef,
    offsetX,
    offsetY,
    scale,
    selectedElement,
    selectedElementId,
    slideHeight,
    slideWidth,
  ]);

  return {
    selectionOverlay,
    selectionLabel: selectedElement?.type || "element",
    inspectedLabel,
    inspectedStyles,
  };
}

export { useSlideInspector };
