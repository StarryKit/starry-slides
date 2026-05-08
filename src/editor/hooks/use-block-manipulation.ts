import { useCallback, useEffect, useRef, useState } from "react";
import {
  SELECTOR_ATTR,
  type SlideModel,
  type StageGeometry,
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
  createResizedStageRect,
  getRotationDeltaDegrees,
  isLayoutEditable,
  px,
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
      const targetNode = querySlideElement<HTMLElement>(doc, selectedElementId);
      if (!rootNode || !targetNode) {
        return;
      }
      const movableElementIds = getManipulationElementIds({
        activeSlide,
        doc,
        mode,
        selectedElementId,
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
      const resizeParentElementIds = Object.fromEntries(
        Object.entries(targetNodes).map(([elementId, node]) => [
          elementId,
          getResizeParentElementId(node, targetNodes),
        ])
      );
      const iframeElement = iframeRef.current;
      const previousIframePointerEvents = iframeElement?.style.pointerEvents || "";

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
        selectedElementId,
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
      const freshSelectedStageRect = freshStageRects.length
        ? unionStageRects(freshStageRects)
        : selectedStageRect;
      sessionRef.current = {
        slideId: activeSlide.id,
        elementId: selectedElementId,
        elementIds: Object.keys(targetNodes),
        mode,
        resizeCorner,
        startPointer: { x: event.clientX, y: event.clientY },
        startStageRect: freshSelectedStageRect,
        centerPoint: {
          x: startRect.left + startRect.width / 2,
          y: startRect.top + startRect.height / 2,
        },
        previousStyle: previousStyles[selectedElementId],
        previousStyles,
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

      const onMouseMove = (moveEvent: MouseEvent) => {
        const session = sessionRef.current;
        if (!session) {
          return;
        }

        moveEvent.preventDefault();
        const stageDeltaX = moveEvent.clientX - session.startPointer.x;
        const stageDeltaY = moveEvent.clientY - session.startPointer.y;
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
          moveEvent.clientX,
          moveEvent.clientY,
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

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("keydown", onKeyDown);
    },
    [
      activeSlide,
      iframeRef,
      isEditingText,
      onCommitOperation,
      selectedElement,
      selectedElementId,
      selectedElementIds,
      selectedStageRect,
      scale,
      offsetX,
      offsetY,
      slideWidth,
      slideHeight,
      suppressBackgroundClearTemporarily,
    ]
  );

  return {
    manipulationOverlay,
    isManipulating: isManipulating || isManipulatingRef.current,
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

function getManipulationElementIds({
  activeSlide,
  doc,
  mode,
  selectedElementId,
  selectedElementIds,
}: {
  activeSlide: SlideModel;
  doc: Document;
  mode: "move" | "resize" | "rotate";
  selectedElementId: string;
  selectedElementIds: string[];
}) {
  const selectedLayoutElementIds = selectedElementIds.filter((elementId) => {
    const element = activeSlide.elements.find((candidate) => candidate.id === elementId);
    return isLayoutEditable(element);
  });

  if (mode === "move") {
    return selectedLayoutElementIds;
  }

  if (mode === "rotate") {
    return [selectedElementId];
  }

  const resizeElementIds = new Set<string>();
  for (const elementId of selectedLayoutElementIds.length
    ? selectedLayoutElementIds
    : [selectedElementId]) {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (!node) {
      continue;
    }

    resizeElementIds.add(elementId);
    if (node.getAttribute("data-group") === "true") {
      for (const child of node.querySelectorAll<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`)) {
        const childElementId = child.getAttribute(SELECTOR_ATTR);
        if (childElementId) {
          resizeElementIds.add(childElementId);
        }
      }
    }
  }

  return [...resizeElementIds];
}

function getResizeParentElementId(
  node: HTMLElement,
  targetNodes: Record<string, HTMLElement>
): string | null {
  const targetEntries = Object.entries(targetNodes);
  let parent = node.parentElement;

  while (parent) {
    const targetEntry = targetEntries.find(([, targetNode]) => targetNode === parent);
    if (targetEntry) {
      return targetEntry[0];
    }
    parent = parent.parentElement;
  }

  return null;
}

function applyGeometryScaledResize(
  session: ManipulationSession,
  nextSelectionRect: StageRect,
  geometry: StageGeometry
) {
  const scaleX =
    session.startStageRect.width > 0 ? nextSelectionRect.width / session.startStageRect.width : 1;
  const scaleY =
    session.startStageRect.height > 0
      ? nextSelectionRect.height / session.startStageRect.height
      : 1;
  const slideStageRect = {
    x: geometry.offsetX,
    y: geometry.offsetY,
    width: geometry.slideWidth * geometry.scale,
    height: geometry.slideHeight * geometry.scale,
  };
  const nextRects = Object.fromEntries(
    Object.entries(session.startElementStageRects).map(([elementId, startRect]) => [
      elementId,
      {
        x: nextSelectionRect.x + (startRect.x - session.startStageRect.x) * scaleX,
        y: nextSelectionRect.y + (startRect.y - session.startStageRect.y) * scaleY,
        width: startRect.width * scaleX,
        height: startRect.height * scaleY,
      },
    ])
  );

  for (const elementId of session.elementIds) {
    const node = session.targetNodes[elementId];
    const previousStyle = session.previousStyles[elementId];
    const nextRect = nextRects[elementId];
    if (!node || !previousStyle || !nextRect) {
      continue;
    }

    const parentRect = session.resizeParentElementIds[elementId]
      ? nextRects[session.resizeParentElementIds[elementId] as string]
      : (session.startParentStageRects[getParentStageRectKey(node.parentElement)] ??
        slideStageRect);
    if (!parentRect) {
      continue;
    }

    const transformParts = parseTransformParts(previousStyle.transform);
    applyLayoutSnapshot(node, {
      ...previousStyle,
      position: previousStyle.position || "absolute",
      left: px((nextRect.x - parentRect.x) / geometry.scale),
      top: px((nextRect.y - parentRect.y) / geometry.scale),
      width: px(nextRect.width / geometry.scale),
      height: px(nextRect.height / geometry.scale),
      transform: composeTransform(0, 0, transformParts.rotate),
      transformOrigin: previousStyle.transformOrigin || "center center",
    });
  }
}

function getParentStageRectKey(node: HTMLElement | null): string {
  return node?.getAttribute(SELECTOR_ATTR)
    ? `editable:${node.getAttribute(SELECTOR_ATTR)}`
    : "slide";
}
export { useBlockManipulation };
