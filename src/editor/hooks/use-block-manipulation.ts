import { useCallback, useEffect, useRef, useState } from "react";
import {
  SELECTOR_ATTR,
  type StageRect,
  captureElementLayoutStyleSnapshot,
  composeTransform,
  elementRectToStageRect,
  parseTransformParts,
  querySlideElement,
} from "../../core";
import type { SnapGuide } from "../lib/block-snap-types";
import type { ResizeHandleCorner } from "../lib/block-snap-types";
import { collectSnapTargets, snapResizeRect, snapStageRect } from "../lib/block-snapping";
import {
  applyGeometryScaledResize,
  createResizedStageRect,
  getManipulationElementIds,
  getParentStageRectKey,
  getResizeParentElementId,
  getRotationDeltaDegrees,
  isLayoutEditable,
  unionStageRects,
} from "./block-manipulation-geometry";
import {
  applyLayoutSnapshot,
  createLayoutUpdateOperations,
  toLayoutCommitOperation,
} from "./block-manipulation-operations";
import { createBlockManipulationOverlay } from "./block-manipulation-overlay";
import type {
  ManipulationMode,
  ManipulationSession,
  PointerStartLike,
  UseBlockManipulationOptions,
  UseBlockManipulationResult,
} from "./block-manipulation-types";

function useBlockManipulation({
  activeSlide,
  selectedElement,
  selectedElementId,
  selectedElementIds,
  selectedStageRect,
  iframeRef,
  stageGeometry,
  isEditingText,
  onCommitOperation,
  isElementLocked,
}: UseBlockManipulationOptions): UseBlockManipulationResult {
  const { offsetX, offsetY, scale, slideHeight, slideWidth } = stageGeometry;
  const sessionRef = useRef<ManipulationSession | null>(null);
  const isManipulatingRef = useRef(false);
  const suppressClearTimerRef = useRef<number | null>(null);
  const [isManipulating, setIsManipulating] = useState(false);
  const [suppressBackgroundClear, setSuppressBackgroundClear] = useState(false);
  const [transientStageRect, setTransientStageRect] = useState<StageRect | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  const baseStageRect = transientStageRect ?? selectedStageRect;
  const manipulationOverlay = createBlockManipulationOverlay({
    isEditingText,
    isManipulating,
    isLocked: Boolean(selectedElementId && isElementLocked(selectedElementId)),
    selectedElement,
    selectedElementId,
    snapGuides,
    stageRect: baseStageRect,
  });

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
      setSnapGuides([]);
    }
  }, [isManipulating]);

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

  const beginManipulation = useCallback(
    (
      mode: ManipulationMode,
      event: PointerStartLike,
      resizeCorner: ResizeHandleCorner | null = null,
      targetElementId = selectedElementId
    ) => {
      const targetElement = targetElementId
        ? activeSlide?.elements.find((element) => element.id === targetElementId)
        : undefined;
      if (
        !activeSlide ||
        !targetElementId ||
        !isLayoutEditable(targetElement) ||
        isEditingText ||
        isElementLocked(targetElementId)
      ) {
        return;
      }

      const doc = iframeRef.current?.contentDocument;
      if (!doc) {
        return;
      }

      const rootNode = doc.querySelector<HTMLElement>(activeSlide.rootSelector);
      const targetNode = querySlideElement<HTMLElement>(doc, targetElementId);
      if (!rootNode || !targetNode) {
        return;
      }
      const movableElementIds = getManipulationElementIds({
        activeSlide,
        doc,
        mode,
        selectedElementId: targetElementId,
        selectedElementIds,
      });
      const targetNodes = Object.fromEntries(
        movableElementIds
          .map((elementId) => [elementId, querySlideElement<HTMLElement>(doc, elementId)] as const)
          .filter((entry): entry is [string, HTMLElement] => Boolean(entry[1]))
      );

      if (!Object.keys(targetNodes).length) {
        return;
      }

      const previousStyles = Object.fromEntries(
        Object.entries(targetNodes).map(([elementId, node]) => [
          elementId,
          captureElementLayoutStyleSnapshot(node),
        ])
      );
      const startComputedMargins = Object.fromEntries(
        Object.entries(targetNodes).map(([elementId, node]) => {
          const computedStyle = window.getComputedStyle(node);
          return [
            elementId,
            {
              top: Number.parseFloat(computedStyle.marginTop || "0") || 0,
              right: Number.parseFloat(computedStyle.marginRight || "0") || 0,
              bottom: Number.parseFloat(computedStyle.marginBottom || "0") || 0,
              left: Number.parseFloat(computedStyle.marginLeft || "0") || 0,
            },
          ] as const;
        })
      );
      const resizeParentElementIds = Object.fromEntries(
        Object.entries(targetNodes).map(([elementId, node]) => [
          elementId,
          getResizeParentElementId(node, targetNodes),
        ])
      );
      const iframeElement = iframeRef.current;
      const previousIframePointerEvents = iframeElement?.style.pointerEvents || "";
      const pointerSourceWindow = event.sourceWindow ?? window;
      const toStagePoint =
        event.toStagePoint ?? ((clientX, clientY) => ({ x: clientX, y: clientY }));
      const startPointer = toStagePoint(event.clientX, event.clientY);

      event.preventDefault();
      event.stopPropagation();

      const startRect = targetNode.getBoundingClientRect();
      const rootRect = rootNode.getBoundingClientRect();
      const slideStageRect = {
        x: offsetX,
        y: offsetY,
        width: slideWidth * scale,
        height: slideHeight * scale,
      };
      const snapStageGeometry = {
        scale,
        offsetX,
        offsetY,
        slideWidth,
        slideHeight,
      };
      const snapTargets = collectSnapTargets({
        activeSlide,
        doc,
        rootRect,
        selectedElementId: targetElementId,
        slideStageRect,
        stageGeometry: snapStageGeometry,
      });
      const freshStageRects = Object.values(targetNodes).map((node) =>
        elementRectToStageRect(node.getBoundingClientRect(), rootRect, snapStageGeometry)
      );
      const startElementStageRects = Object.fromEntries(
        Object.entries(targetNodes).map(([elementId, node]) => [
          elementId,
          elementRectToStageRect(node.getBoundingClientRect(), rootRect, snapStageGeometry),
        ])
      );
      const startParentStageRects = Object.fromEntries(
        Object.values(targetNodes)
          .map((node) => node.parentElement)
          .filter((node): node is HTMLElement => Boolean(node))
          .map((node) => [
            getParentStageRectKey(node),
            elementRectToStageRect(node.getBoundingClientRect(), rootRect, snapStageGeometry),
          ])
      );
      if (!freshStageRects.length) {
        return;
      }

      const freshSelectedStageRect = unionStageRects(freshStageRects);
      sessionRef.current = {
        slideId: activeSlide.id,
        elementId: targetElementId,
        elementIds: Object.keys(targetNodes),
        mode,
        resizeCorner,
        startPointer,
        startStageRect: freshSelectedStageRect,
        centerPoint: {
          x: startRect.left + startRect.width / 2,
          y: startRect.top + startRect.height / 2,
        },
        previousStyle: previousStyles[targetElementId],
        previousStyles,
        startComputedMargins,
        startElementStageRects,
        resizeParentElementIds,
        startParentStageRects,
        targetNodes,
        snapTargets,
      };
      isManipulatingRef.current = true;
      setIsManipulating(true);
      setSnapGuides([]);
      if (iframeElement) {
        iframeElement.style.pointerEvents = "none";
      }

      const handleMouseMove = (
        moveEvent: MouseEvent,
        mapPoint: (clientX: number, clientY: number) => { x: number; y: number }
      ) => {
        const session = sessionRef.current;
        if (!session) {
          return;
        }

        moveEvent.preventDefault();
        const stagePoint = mapPoint(moveEvent.clientX, moveEvent.clientY);
        const stageDeltaX = stagePoint.x - session.startPointer.x;
        const stageDeltaY = stagePoint.y - session.startPointer.y;
        if (session.mode === "move") {
          const unsnappedRect = {
            x: session.startStageRect.x + stageDeltaX,
            y: session.startStageRect.y + stageDeltaY,
            width: session.startStageRect.width,
            height: session.startStageRect.height,
          };
          const snapResult = moveEvent.altKey
            ? { rect: unsnappedRect, guides: [] }
            : snapStageRect(unsnappedRect, session.snapTargets);

          setTransientStageRect(snapResult.rect);
          setSnapGuides(snapResult.guides);
          const deltaX = (snapResult.rect.x - session.startStageRect.x) / scale;
          const deltaY = (snapResult.rect.y - session.startStageRect.y) / scale;
          for (const elementId of session.elementIds) {
            const node = session.targetNodes[elementId];
            const previousStyle = session.previousStyles[elementId];
            if (!node || !previousStyle) {
              continue;
            }

            const elementTransformParts = parseTransformParts(previousStyle.transform);
            applyLayoutSnapshot(node, {
              ...previousStyle,
              transform: composeTransform(
                elementTransformParts.translateX + deltaX,
                elementTransformParts.translateY + deltaY,
                elementTransformParts.rotate
              ),
              transformOrigin: previousStyle.transformOrigin || "center center",
            });
          }
          return;
        }

        if (session.mode === "resize") {
          const unsnappedRect = createResizedStageRect({
            resizeCorner: session.resizeCorner,
            scale,
            stageDeltaX,
            stageDeltaY,
            startStageRect: session.startStageRect,
          });
          const snapResult =
            moveEvent.altKey || !session.resizeCorner
              ? { rect: unsnappedRect, guides: [] }
              : snapResizeRect(unsnappedRect, session.resizeCorner, session.snapTargets);

          setTransientStageRect(snapResult.rect);
          setSnapGuides(snapResult.guides);
          applyGeometryScaledResize(session, snapResult.rect, {
            offsetX,
            offsetY,
            scale,
            slideHeight,
            slideWidth,
          });
          return;
        }

        const transformParts = parseTransformParts(session.previousStyle.transform);
        const startAngle = getRotationDeltaDegrees(
          session.startPointer.x,
          session.startPointer.y,
          session.centerPoint.x,
          session.centerPoint.y
        );
        const currentAngle = getRotationDeltaDegrees(
          stagePoint.x,
          stagePoint.y,
          session.centerPoint.x,
          session.centerPoint.y
        );

        applyLayoutSnapshot(targetNode, {
          ...session.previousStyle,
          transform: composeTransform(
            transformParts.translateX,
            transformParts.translateY,
            transformParts.rotate + (currentAngle - startAngle)
          ),
          transformOrigin: "center center",
        });
        setSnapGuides([]);
      };
      const onMouseMove = (moveEvent: MouseEvent) => {
        handleMouseMove(moveEvent, toStagePoint);
      };
      const onParentMouseMove = (moveEvent: MouseEvent) => {
        handleMouseMove(moveEvent, (clientX, clientY) => ({ x: clientX, y: clientY }));
      };

      const teardown = () => {
        pointerSourceWindow.removeEventListener("mousemove", onMouseMove);
        pointerSourceWindow.removeEventListener("mouseup", onMouseUp);
        pointerSourceWindow.removeEventListener("keydown", onKeyDown);
        if (pointerSourceWindow !== window) {
          window.removeEventListener("mousemove", onParentMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        }
        if (iframeElement) {
          iframeElement.style.pointerEvents = previousIframePointerEvents;
        }
      };

      const onMouseUp = () => {
        const session = sessionRef.current;
        teardown();
        isManipulatingRef.current = false;
        setIsManipulating(false);
        suppressBackgroundClearTemporarily();
        sessionRef.current = null;
        setSnapGuides([]);

        if (!session) {
          return;
        }

        const operations = createLayoutUpdateOperations(session);

        if (!operations.length) {
          setTransientStageRect(null);
          return;
        }

        onCommitOperation(toLayoutCommitOperation(session, operations));
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
        setSnapGuides([]);

        if (!session) {
          return;
        }

        for (const elementId of session.elementIds) {
          const node = session.targetNodes[elementId];
          const previousStyle = session.previousStyles[elementId];
          if (node && previousStyle) {
            applyLayoutSnapshot(node, previousStyle);
          }
        }
        setTransientStageRect(null);
      };

      pointerSourceWindow.addEventListener("mousemove", onMouseMove);
      pointerSourceWindow.addEventListener("mouseup", onMouseUp);
      pointerSourceWindow.addEventListener("keydown", onKeyDown);
      if (pointerSourceWindow !== window) {
        window.addEventListener("mousemove", onParentMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      }
    },
    [
      activeSlide,
      iframeRef,
      isEditingText,
      onCommitOperation,
      selectedElementId,
      selectedElementIds,
      scale,
      offsetX,
      offsetY,
      slideWidth,
      slideHeight,
      suppressBackgroundClearTemporarily,
      isElementLocked,
    ]
  );

  return {
    manipulationOverlay,
    isManipulating: isManipulating || isManipulatingRef.current,
    suppressBackgroundClear,
    beginMove: (event, targetElementId) => {
      beginManipulation("move", event, null, targetElementId);
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
