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
  const [selectedStageRect, setSelectedStageRect] = useState<StageRect | null>(null);
  const [selectionOverlay, setSelectionOverlay] = useState<StageRect | null>(null);
  const [inspectedStyles, setInspectedStyles] = useState<CssPropertyRow[]>([]);
  const [inspectedLabel, setInspectedLabel] = useState(DEFAULT_INSPECTED_LABEL);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc || !activeSlide) {
      setSelectedStageRect(null);
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
      setSelectedStageRect(null);
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
      setSelectedStageRect(null);
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

    setSelectedStageRect(stageRect);
    setSelectionOverlay(stageRect);
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
    selectedStageRect,
    selectionOverlay,
    selectionLabel: selectedElement?.type || "element",
    inspectedLabel,
    inspectedStyles,
  };
}

export { useSlideInspector };
