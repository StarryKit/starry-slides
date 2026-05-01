import {
  type EditableElement,
  type ElementLayoutStyleSnapshot,
  type ElementLayoutUpdateOperation,
  type SlideModel,
  type StageGeometry,
  type StageRect,
  captureElementLayoutStyleSnapshot,
} from "@html-slides-editor/core";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type ManipulationMode = "move" | "resize" | "rotate";
type ResizeHandleCorner = "top-left" | "top-right" | "bottom-right" | "bottom-left";

interface BlockManipulationOverlay {
  selectionBounds: StageRect;
  resizeHandles: Array<{
    corner: ResizeHandleCorner;
    x: number;
    y: number;
  }>;
  rotationHandle: { x: number; y: number };
}

interface ManipulationSession {
  slideId: string;
  elementId: string;
  mode: ManipulationMode;
  resizeCorner: ResizeHandleCorner | null;
  startPointer: { x: number; y: number };
  startRect: DOMRect;
  startStageRect: StageRect;
  centerPoint: { x: number; y: number };
  previousStyle: ElementLayoutStyleSnapshot;
}

interface UseBlockManipulationOptions {
  activeSlide: SlideModel | undefined;
  selectedElement: EditableElement | undefined;
  selectedElementId: string | null;
  selectedStageRect: StageRect | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  stageGeometry: StageGeometry;
  isEditingText: boolean;
  onCommitOperation: (operation: ElementLayoutUpdateOperation) => void;
}

interface UseBlockManipulationResult {
  manipulationOverlay: BlockManipulationOverlay | null;
  isManipulating: boolean;
  suppressBackgroundClear: boolean;
  beginMove: (event: PointerStartLike) => void;
  beginResize: (corner: ResizeHandleCorner, event: PointerStartLike) => void;
  beginRotate: (event: PointerStartLike) => void;
}

interface PointerStartLike {
  clientX: number;
  clientY: number;
  preventDefault: () => void;
  stopPropagation: () => void;
}

function px(value: number): string {
  return `${Math.round(value * 100) / 100}px`;
}

function clampSize(value: number): number {
  return Math.max(value, 48);
}

function clampStageSize(value: number, scale: number): number {
  return Math.max(value, 48 * scale);
}

function parseTransformParts(transformValue: string | null | undefined) {
  const rawValue = transformValue || "";
  const translateMatch = rawValue.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/i);
  const rotateMatch = rawValue.match(/rotate\(([-\d.]+)deg\)/i);

  return {
    translateX: translateMatch ? Number.parseFloat(translateMatch[1] || "0") || 0 : 0,
    translateY: translateMatch ? Number.parseFloat(translateMatch[2] || "0") || 0 : 0,
    rotate: rotateMatch ? Number.parseFloat(rotateMatch[1] || "0") || 0 : 0,
  };
}

function composeTransform(
  translateX: number,
  translateY: number,
  rotate: number
): string | null {
  const parts: string[] = [];

  if (Math.abs(translateX) > 0.01 || Math.abs(translateY) > 0.01) {
    parts.push(`translate(${Math.round(translateX * 100) / 100}px, ${Math.round(translateY * 100) / 100}px)`);
  }

  if (Math.abs(rotate) > 0.01) {
    parts.push(`rotate(${Math.round(rotate * 100) / 100}deg)`);
  }

  return parts.length ? parts.join(" ") : null;
}

function isLayoutEditable(element: EditableElement | undefined): boolean {
  return element?.type === "block" || element?.type === "text";
}

function isManipulable(element: EditableElement | undefined): boolean {
  return element?.type === "block" || element?.type === "text";
}

function getRotationDeltaDegrees(pointerX: number, pointerY: number, centerX: number, centerY: number) {
  return (Math.atan2(pointerY - centerY, pointerX - centerX) * 180) / Math.PI;
}

function useBlockManipulation({
  activeSlide,
  selectedElement,
  selectedElementId,
  selectedStageRect,
  iframeRef,
  stageGeometry,
  isEditingText,
  onCommitOperation,
}: UseBlockManipulationOptions): UseBlockManipulationResult {
  const sessionRef = useRef<ManipulationSession | null>(null);
  const suppressClearTimerRef = useRef<number | null>(null);
  const [isManipulating, setIsManipulating] = useState(false);
  const [suppressBackgroundClear, setSuppressBackgroundClear] = useState(false);
  const [transientStageRect, setTransientStageRect] = useState<StageRect | null>(null);

  const baseStageRect = transientStageRect ?? selectedStageRect;
  const overlayBounds =
    baseStageRect && selectedElementId && isManipulable(selectedElement) && !isEditingText
      ? baseStageRect
      : null;

  const manipulationOverlay =
    overlayBounds
      ? {
          selectionBounds: overlayBounds,
          resizeHandles: [
            {
              corner: "top-left",
              x: overlayBounds.x,
              y: overlayBounds.y,
            },
            {
              corner: "top-right",
              x: overlayBounds.x + overlayBounds.width,
              y: overlayBounds.y,
            },
            {
              corner: "bottom-right",
              x: overlayBounds.x + overlayBounds.width,
              y: overlayBounds.y + overlayBounds.height,
            },
            {
              corner: "bottom-left",
              x: overlayBounds.x,
              y: overlayBounds.y + overlayBounds.height,
            },
          ],
          rotationHandle: {
            x: overlayBounds.x + overlayBounds.width / 2,
            y: overlayBounds.y + overlayBounds.height + 20,
          },
        }
      : null;

  useEffect(() => {
    return () => {
      sessionRef.current = null;
      if (suppressClearTimerRef.current) {
        window.clearTimeout(suppressClearTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeSlide || !selectedElementId || !isLayoutEditable(selectedElement) || isEditingText) {
      sessionRef.current = null;
      setIsManipulating(false);
      setTransientStageRect(null);
    }
  }, [activeSlide, isEditingText, selectedElement, selectedElementId]);

  useEffect(() => {
    if (!isManipulating) {
      setTransientStageRect(null);
    }
  }, [activeSlide?.htmlSource, isManipulating, selectedElementId]);

  const suppressBackgroundClearTemporarily = useCallback(() => {
    setSuppressBackgroundClear(true);
    if (suppressClearTimerRef.current) {
      window.clearTimeout(suppressClearTimerRef.current);
    }

    suppressClearTimerRef.current = window.setTimeout(() => {
      setSuppressBackgroundClear(false);
      suppressClearTimerRef.current = null;
    }, 0);
  }, []);

  const beginManipulation = useCallback((
    mode: ManipulationMode,
    event: PointerStartLike,
    resizeCorner: ResizeHandleCorner | null = null
  ) => {
    if (
      !activeSlide ||
      !selectedElementId ||
      !selectedStageRect ||
      !isLayoutEditable(selectedElement) ||
      isEditingText
    ) {
      return;
    }

    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      return;
    }

    const rootNode = doc.querySelector<HTMLElement>(activeSlide.rootSelector);
    const targetNode = doc.querySelector<HTMLElement>(`[data-editor-id="${selectedElementId}"]`);
    if (!rootNode || !targetNode) {
      return;
    }
    const iframeElement = iframeRef.current;
    const previousIframePointerEvents = iframeElement?.style.pointerEvents || "";

    event.preventDefault();
    event.stopPropagation();

    const startRect = targetNode.getBoundingClientRect();
    sessionRef.current = {
      slideId: activeSlide.id,
      elementId: selectedElementId,
      mode,
      resizeCorner,
      startPointer: { x: event.clientX, y: event.clientY },
      startRect,
      startStageRect: selectedStageRect,
      centerPoint: {
        x: startRect.left + startRect.width / 2,
        y: startRect.top + startRect.height / 2,
      },
      previousStyle: captureElementLayoutStyleSnapshot(targetNode),
    };
    setIsManipulating(true);
    if (iframeElement) {
      iframeElement.style.pointerEvents = "none";
    }

    const applySnapshot = (snapshot: ElementLayoutStyleSnapshot) => {
      for (const [key, value] of Object.entries(snapshot)) {
        targetNode.style[key as keyof CSSStyleDeclaration] = value ?? "";
      }
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const session = sessionRef.current;
      if (!session) {
        return;
      }

      moveEvent.preventDefault();
      const stageDeltaX = moveEvent.clientX - session.startPointer.x;
      const stageDeltaY = moveEvent.clientY - session.startPointer.y;
      const deltaX = stageDeltaX / stageGeometry.scale;
      const deltaY = stageDeltaY / stageGeometry.scale;
      const transformParts = parseTransformParts(session.previousStyle.transform);

      if (session.mode === "move") {
        setTransientStageRect({
          x: (selectedStageRect?.x ?? 0) + stageDeltaX,
          y: (selectedStageRect?.y ?? 0) + stageDeltaY,
          width: selectedStageRect?.width ?? 0,
          height: selectedStageRect?.height ?? 0,
        });
        applySnapshot({
          ...session.previousStyle,
          transform: composeTransform(
            transformParts.translateX + deltaX,
            transformParts.translateY + deltaY,
            transformParts.rotate
          ),
          transformOrigin: session.previousStyle.transformOrigin || "center center",
        });
        return;
      }

      if (session.mode === "resize") {
        const transformParts = parseTransformParts(session.previousStyle.transform);
        let nextStageX = session.startStageRect.x;
        let nextStageY = session.startStageRect.y;
        let nextStageWidth = session.startStageRect.width;
        let nextStageHeight = session.startStageRect.height;

        switch (session.resizeCorner) {
          case "top-left": {
            nextStageWidth = clampStageSize(
              session.startStageRect.width - stageDeltaX,
              stageGeometry.scale
            );
            nextStageHeight = clampStageSize(
              session.startStageRect.height - stageDeltaY,
              stageGeometry.scale
            );
            nextStageX =
              session.startStageRect.x +
              (session.startStageRect.width - nextStageWidth);
            nextStageY =
              session.startStageRect.y +
              (session.startStageRect.height - nextStageHeight);
            break;
          }
          case "top-right": {
            nextStageWidth = clampStageSize(
              session.startStageRect.width + stageDeltaX,
              stageGeometry.scale
            );
            nextStageHeight = clampStageSize(
              session.startStageRect.height - stageDeltaY,
              stageGeometry.scale
            );
            nextStageY =
              session.startStageRect.y +
              (session.startStageRect.height - nextStageHeight);
            break;
          }
          case "bottom-left": {
            nextStageWidth = clampStageSize(
              session.startStageRect.width - stageDeltaX,
              stageGeometry.scale
            );
            nextStageHeight = clampStageSize(
              session.startStageRect.height + stageDeltaY,
              stageGeometry.scale
            );
            nextStageX =
              session.startStageRect.x +
              (session.startStageRect.width - nextStageWidth);
            break;
          }
          case "bottom-right":
          default: {
            nextStageWidth = clampStageSize(
              session.startStageRect.width + stageDeltaX,
              stageGeometry.scale
            );
            nextStageHeight = clampStageSize(
              session.startStageRect.height + stageDeltaY,
              stageGeometry.scale
            );
            break;
          }
        }

        setTransientStageRect({
          x: nextStageX,
          y: nextStageY,
          width: nextStageWidth,
          height: nextStageHeight,
        });
        applySnapshot({
          ...session.previousStyle,
          width: px(nextStageWidth / stageGeometry.scale),
          height: px(nextStageHeight / stageGeometry.scale),
          transform: composeTransform(
            transformParts.translateX + (nextStageX - session.startStageRect.x) / stageGeometry.scale,
            transformParts.translateY + (nextStageY - session.startStageRect.y) / stageGeometry.scale,
            transformParts.rotate
          ),
        });
        return;
      }

      const startAngle = getRotationDeltaDegrees(
        session.startPointer.x,
        session.startPointer.y,
        session.centerPoint.x,
        session.centerPoint.y
      );
      const currentAngle = getRotationDeltaDegrees(
        moveEvent.clientX,
        moveEvent.clientY,
        session.centerPoint.x,
        session.centerPoint.y
      );

      applySnapshot({
        ...session.previousStyle,
        transform: composeTransform(
          transformParts.translateX,
          transformParts.translateY,
          transformParts.rotate + (currentAngle - startAngle)
        ),
        transformOrigin: "center center",
      });
    };

    const teardown = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      if (iframeElement) {
        iframeElement.style.pointerEvents = previousIframePointerEvents;
      }
    };

    const onMouseUp = () => {
      const session = sessionRef.current;
      teardown();
      setIsManipulating(false);
      suppressBackgroundClearTemporarily();
      sessionRef.current = null;

      if (!session) {
        return;
      }

      const nextStyle = captureElementLayoutStyleSnapshot(targetNode);
      if (JSON.stringify(nextStyle) === JSON.stringify(session.previousStyle)) {
        setTransientStageRect(null);
        return;
      }

      onCommitOperation({
        type: "element.layout.update",
        slideId: session.slideId,
        elementId: session.elementId,
        previousStyle: session.previousStyle,
        nextStyle,
        timestamp: Date.now(),
      });
    };

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== "Escape") {
        return;
      }

      const session = sessionRef.current;
      teardown();
      setIsManipulating(false);
      suppressBackgroundClearTemporarily();
      sessionRef.current = null;

      if (!session) {
        return;
      }

      applySnapshot(session.previousStyle);
      setTransientStageRect(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
  }, [
    activeSlide,
    iframeRef,
    isEditingText,
    onCommitOperation,
    selectedElement,
    selectedElementId,
    selectedStageRect,
    stageGeometry.scale,
    suppressBackgroundClearTemporarily,
  ]);

  return {
    manipulationOverlay,
    isManipulating,
    suppressBackgroundClear,
    beginMove: (event) => {
      beginManipulation("move", event);
    },
    beginResize: (corner, event) => {
      beginManipulation("resize", event, corner);
    },
    beginRotate: (event) => {
      beginManipulation("rotate", event);
    },
  };
}

export { useBlockManipulation };
