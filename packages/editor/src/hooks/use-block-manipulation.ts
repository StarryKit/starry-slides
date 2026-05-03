import {
  type EditableElement,
  type ElementLayoutStyleSnapshot,
  type ElementLayoutUpdateOperation,
  type SlideModel,
  type StageGeometry,
  type StageRect,
  captureElementLayoutStyleSnapshot,
  composeTransform,
  elementRectToStageRect,
  parseTransformParts,
  querySlideElement,
} from "@starry-slides/core";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type ManipulationMode = "move" | "resize" | "rotate";
type ResizeHandleCorner = "top-left" | "top-right" | "bottom-right" | "bottom-left";

interface BlockManipulationOverlay {
  selectionBounds: StageRect;
  snapGuides: SnapGuide[];
  resizeHandles: Array<{
    corner: ResizeHandleCorner;
    x: number;
    y: number;
  }>;
  rotationHandle: { x: number; y: number };
}

interface SnapGuide {
  orientation: "vertical" | "horizontal";
  start: { x: number; y: number };
  end: { x: number; y: number };
  variant: "alignment" | "spacing";
}

interface SnapTarget {
  position: number;
  rect: StageRect;
  kind: "slide" | "element" | "spacing";
  role: "start" | "center" | "end";
  anchor: SnapCandidate["anchor"] | null;
  priority: number;
  spacingPriority?: number;
  elementId: string | null;
  relatedRects: StageRect[];
}

interface SnapCandidate {
  anchor: "start" | "center" | "end";
  delta: number;
  target: SnapTarget;
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
  snapTargets: {
    vertical: SnapTarget[];
    horizontal: SnapTarget[];
  };
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

function isLayoutEditable(element: EditableElement | undefined): boolean {
  return element?.type === "block" || element?.type === "text";
}

function isManipulable(element: EditableElement | undefined): boolean {
  return element?.type === "block" || element?.type === "text";
}

function getRotationDeltaDegrees(
  pointerX: number,
  pointerY: number,
  centerX: number,
  centerY: number
) {
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
  const { offsetX, offsetY, scale, slideHeight, slideWidth } = stageGeometry;
  const sessionRef = useRef<ManipulationSession | null>(null);
  const suppressClearTimerRef = useRef<number | null>(null);
  const [isManipulating, setIsManipulating] = useState(false);
  const [suppressBackgroundClear, setSuppressBackgroundClear] = useState(false);
  const [transientStageRect, setTransientStageRect] = useState<StageRect | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  const baseStageRect = transientStageRect ?? selectedStageRect;
  const overlayBounds =
    baseStageRect && selectedElementId && isManipulable(selectedElement) && !isEditingText
      ? baseStageRect
      : null;

  const manipulationOverlay = overlayBounds
    ? {
        selectionBounds: overlayBounds,
        snapGuides: isManipulating ? snapGuides : [],
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
        snapTargets,
      };
      setIsManipulating(true);
      setSnapGuides([]);
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
        const transformParts = parseTransformParts(session.previousStyle.transform);

        if (session.mode === "move") {
          const unsnappedRect = {
            x: (selectedStageRect?.x ?? 0) + stageDeltaX,
            y: (selectedStageRect?.y ?? 0) + stageDeltaY,
            width: selectedStageRect?.width ?? 0,
            height: selectedStageRect?.height ?? 0,
          };
          const snapResult = moveEvent.altKey
            ? { rect: unsnappedRect, guides: [] }
            : snapStageRect(unsnappedRect, session.snapTargets);

          setTransientStageRect(snapResult.rect);
          setSnapGuides(snapResult.guides);
          applySnapshot({
            ...session.previousStyle,
            transform: composeTransform(
              transformParts.translateX + (snapResult.rect.x - session.startStageRect.x) / scale,
              transformParts.translateY + (snapResult.rect.y - session.startStageRect.y) / scale,
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
              nextStageWidth = clampStageSize(session.startStageRect.width - stageDeltaX, scale);
              nextStageHeight = clampStageSize(session.startStageRect.height - stageDeltaY, scale);
              nextStageX =
                session.startStageRect.x + (session.startStageRect.width - nextStageWidth);
              nextStageY =
                session.startStageRect.y + (session.startStageRect.height - nextStageHeight);
              break;
            }
            case "top-right": {
              nextStageWidth = clampStageSize(session.startStageRect.width + stageDeltaX, scale);
              nextStageHeight = clampStageSize(session.startStageRect.height - stageDeltaY, scale);
              nextStageY =
                session.startStageRect.y + (session.startStageRect.height - nextStageHeight);
              break;
            }
            case "bottom-left": {
              nextStageWidth = clampStageSize(session.startStageRect.width - stageDeltaX, scale);
              nextStageHeight = clampStageSize(session.startStageRect.height + stageDeltaY, scale);
              nextStageX =
                session.startStageRect.x + (session.startStageRect.width - nextStageWidth);
              break;
            }
            default: {
              nextStageWidth = clampStageSize(session.startStageRect.width + stageDeltaX, scale);
              nextStageHeight = clampStageSize(session.startStageRect.height + stageDeltaY, scale);
              break;
            }
          }

          const unsnappedRect = {
            x: nextStageX,
            y: nextStageY,
            width: nextStageWidth,
            height: nextStageHeight,
          };
          const snapResult =
            moveEvent.altKey || !session.resizeCorner
              ? { rect: unsnappedRect, guides: [] }
              : snapResizeRect(unsnappedRect, session.resizeCorner, session.snapTargets);

          setTransientStageRect(snapResult.rect);
          setSnapGuides(snapResult.guides);
          applySnapshot({
            ...session.previousStyle,
            width: px(snapResult.rect.width / scale),
            height: px(snapResult.rect.height / scale),
            transform: composeTransform(
              transformParts.translateX + (snapResult.rect.x - session.startStageRect.x) / scale,
              transformParts.translateY + (snapResult.rect.y - session.startStageRect.y) / scale,
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
        setIsManipulating(false);
        suppressBackgroundClearTemporarily();
        sessionRef.current = null;
        setSnapGuides([]);

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
        setSnapGuides([]);

        if (!session) {
          return;
        }

        applySnapshot(session.previousStyle);
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

const SNAP_THRESHOLD_PX = 8;
const SPACING_SNAP_DISTANCE_BONUS_PX = 6;
const SNAP_AXIS_PROXIMITY_PX = 80;
const SNAP_GUIDE_EXTENSION_PX = 24;
const SPACING_ALIGNMENT_TOLERANCE_PX = 24;
const MIN_SPACING_TARGET_GAP_PX = 12;
const MAX_SPACING_TARGET_GAP_PX = 360;

function collectSnapTargets({
  activeSlide,
  doc,
  rootRect,
  selectedElementId,
  slideStageRect,
  stageGeometry,
}: {
  activeSlide: SlideModel;
  doc: Document;
  rootRect: DOMRect;
  selectedElementId: string;
  slideStageRect: StageRect;
  stageGeometry: StageGeometry;
}): { vertical: SnapTarget[]; horizontal: SnapTarget[] } {
  const slideTarget = (position: number, role: SnapTarget["role"]): SnapTarget => ({
    position,
    rect: slideStageRect,
    kind: "slide",
    role,
    anchor: null,
    priority: role === "center" ? -2000 : 2,
    elementId: null,
    relatedRects: [],
  });
  const vertical: SnapTarget[] = [
    slideTarget(slideStageRect.x, "start"),
    slideTarget(slideStageRect.x + slideStageRect.width / 2, "center"),
    slideTarget(slideStageRect.x + slideStageRect.width, "end"),
  ];
  const horizontal: SnapTarget[] = [
    slideTarget(slideStageRect.y, "start"),
    slideTarget(slideStageRect.y + slideStageRect.height / 2, "center"),
    slideTarget(slideStageRect.y + slideStageRect.height, "end"),
  ];

  const selectedNode = doc.querySelector<HTMLElement>(`[data-editor-id="${selectedElementId}"]`);
  const spacingSourceRects: Array<{ elementId: string; rect: StageRect }> = [];
  for (const element of activeSlide.elements) {
    if (element.id === selectedElementId) {
      continue;
    }

    const node = doc.querySelector<HTMLElement>(`[data-editor-id="${element.id}"]`);
    if (!node) {
      continue;
    }
    if (selectedNode && (selectedNode.contains(node) || node.contains(selectedNode))) {
      continue;
    }

    const computedStyle = doc.defaultView?.getComputedStyle(node);
    if (computedStyle?.display === "none" || computedStyle?.visibility === "hidden") {
      continue;
    }

    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    const stageRect = elementRectToStageRect(rect, rootRect, stageGeometry);
    if (element.type === "block" || element.type === "image") {
      spacingSourceRects.push({ elementId: element.id, rect: stageRect });
    }
    const left = stageRect.x;
    const centerX = stageRect.x + stageRect.width / 2;
    const right = stageRect.x + stageRect.width;
    const top = stageRect.y;
    const centerY = stageRect.y + stageRect.height / 2;
    const bottom = stageRect.y + stageRect.height;

    const target = (position: number, role: SnapTarget["role"]): SnapTarget => ({
      position,
      rect: stageRect,
      kind: "element",
      role,
      anchor: null,
      priority: role === "center" ? 3 : 4,
      elementId: element.id,
      relatedRects: [],
    });

    vertical.push(target(left, "start"), target(centerX, "center"), target(right, "end"));
    horizontal.push(target(top, "start"), target(centerY, "center"), target(bottom, "end"));
  }

  const spacingTargets = collectSpacingTargets(spacingSourceRects);
  vertical.push(...spacingTargets.vertical);
  horizontal.push(...spacingTargets.horizontal);

  return { vertical, horizontal };
}

function collectSpacingTargets(siblingRects: Array<{ elementId: string; rect: StageRect }>): {
  vertical: SnapTarget[];
  horizontal: SnapTarget[];
} {
  const vertical: SnapTarget[] = [];
  const horizontal: SnapTarget[] = [];
  const horizontallyOrdered = siblingRects
    .slice()
    .sort((first, second) => first.rect.x - second.rect.x)
    .filter((item) => item.rect.width > 0 && item.rect.height > 0);
  const verticallyOrdered = siblingRects
    .slice()
    .sort((first, second) => first.rect.y - second.rect.y)
    .filter((item) => item.rect.width > 0 && item.rect.height > 0);

  for (let index = 0; index < horizontallyOrdered.length - 1; index += 1) {
    const first = horizontallyOrdered[index];
    const second = horizontallyOrdered[index + 1];
    if (!first || !second) {
      continue;
    }

    const hasHorizontalSeparation = !rangesOverlapOrNear(
      first.rect.x,
      first.rect.x + first.rect.width,
      second.rect.x,
      second.rect.x + second.rect.width,
      0
    );
    if (hasHorizontalSeparation) {
      const horizontalGap = second.rect.x - (first.rect.x + first.rect.width);
      if (
        horizontalGap >= MIN_SPACING_TARGET_GAP_PX &&
        horizontalGap <= MAX_SPACING_TARGET_GAP_PX &&
        rangesOverlapOrNear(
          first.rect.y,
          first.rect.y + first.rect.height,
          second.rect.y,
          second.rect.y + second.rect.height,
          SPACING_ALIGNMENT_TOLERANCE_PX
        )
      ) {
        vertical.push(
          createSpacingTarget({
            position: second.rect.x + second.rect.width + horizontalGap,
            rect: second.rect,
            anchor: "start",
            relatedRects: [first.rect, second.rect],
          }),
          createSpacingTarget({
            position: first.rect.x - horizontalGap,
            rect: first.rect,
            anchor: "end",
            relatedRects: [first.rect, second.rect],
          })
        );
      }
    }
  }

  for (let index = 0; index < verticallyOrdered.length - 1; index += 1) {
    const first = verticallyOrdered[index];
    const second = verticallyOrdered[index + 1];
    if (!first || !second) {
      continue;
    }

    const hasVerticalSeparation = !rangesOverlapOrNear(
      first.rect.y,
      first.rect.y + first.rect.height,
      second.rect.y,
      second.rect.y + second.rect.height,
      0
    );
    if (hasVerticalSeparation) {
      const verticalGap = second.rect.y - (first.rect.y + first.rect.height);
      if (
        verticalGap >= MIN_SPACING_TARGET_GAP_PX &&
        verticalGap <= MAX_SPACING_TARGET_GAP_PX &&
        rangesOverlapOrNear(
          first.rect.x,
          first.rect.x + first.rect.width,
          second.rect.x,
          second.rect.x + second.rect.width,
          SPACING_ALIGNMENT_TOLERANCE_PX
        )
      ) {
        horizontal.push(
          createSpacingTarget({
            position: second.rect.y + second.rect.height + verticalGap,
            rect: second.rect,
            anchor: "start",
            relatedRects: [first.rect, second.rect],
          }),
          createSpacingTarget({
            position: first.rect.y - verticalGap,
            rect: first.rect,
            anchor: "end",
            relatedRects: [first.rect, second.rect],
          })
        );
      }
    }
  }

  return { vertical, horizontal };
}

function createSpacingTarget({
  position,
  rect,
  anchor,
  relatedRects,
}: {
  position: number;
  rect: StageRect;
  anchor: SnapCandidate["anchor"];
  relatedRects: StageRect[];
}): SnapTarget {
  return {
    position,
    rect,
    kind: "spacing",
    role: "end",
    anchor,
    priority: 1,
    elementId: null,
    relatedRects,
  };
}

function snapStageRect(
  rect: StageRect,
  targets: ManipulationSession["snapTargets"]
): { rect: StageRect; guides: SnapGuide[] } {
  const verticalSnap = findSnapCandidate(
    [
      { anchor: "start", position: rect.x },
      { anchor: "center", position: rect.x + rect.width / 2 },
      { anchor: "end", position: rect.x + rect.width },
    ],
    targets.vertical,
    rect,
    "vertical"
  );
  const horizontalSnap = findSnapCandidate(
    [
      { anchor: "start", position: rect.y },
      { anchor: "center", position: rect.y + rect.height / 2 },
      { anchor: "end", position: rect.y + rect.height },
    ],
    targets.horizontal,
    rect,
    "horizontal"
  );
  const snappedRect = {
    ...rect,
    x: rect.x + (verticalSnap?.delta ?? 0),
    y: rect.y + (horizontalSnap?.delta ?? 0),
  };

  return {
    rect: snappedRect,
    guides: buildSnapGuides(snappedRect, {
      vertical: verticalSnap,
      horizontal: horizontalSnap,
    }),
  };
}

function snapResizeRect(
  rect: StageRect,
  resizeCorner: ResizeHandleCorner,
  targets: ManipulationSession["snapTargets"]
): { rect: StageRect; guides: SnapGuide[] } {
  const nextRect = { ...rect };
  const horizontalAnchor =
    resizeCorner === "top-left" || resizeCorner === "bottom-left" ? "start" : "end";
  const verticalAnchor =
    resizeCorner === "top-left" || resizeCorner === "top-right" ? "start" : "end";
  const horizontalSnap = findSnapCandidate(
    [
      {
        anchor: horizontalAnchor,
        position: horizontalAnchor === "start" ? rect.x : rect.x + rect.width,
      },
    ],
    targets.vertical,
    rect,
    "vertical"
  );
  const verticalSnap = findSnapCandidate(
    [
      {
        anchor: verticalAnchor,
        position: verticalAnchor === "start" ? rect.y : rect.y + rect.height,
      },
    ],
    targets.horizontal,
    rect,
    "horizontal"
  );

  if (horizontalSnap) {
    if (horizontalAnchor === "start") {
      const nextWidth = nextRect.width - horizontalSnap.delta;
      if (nextWidth >= 48) {
        nextRect.x += horizontalSnap.delta;
        nextRect.width = nextWidth;
      }
    } else {
      const nextWidth = nextRect.width + horizontalSnap.delta;
      if (nextWidth >= 48) {
        nextRect.width = nextWidth;
      }
    }
  }

  if (verticalSnap) {
    if (verticalAnchor === "start") {
      const nextHeight = nextRect.height - verticalSnap.delta;
      if (nextHeight >= 48) {
        nextRect.y += verticalSnap.delta;
        nextRect.height = nextHeight;
      }
    } else {
      const nextHeight = nextRect.height + verticalSnap.delta;
      if (nextHeight >= 48) {
        nextRect.height = nextHeight;
      }
    }
  }

  return {
    rect: nextRect,
    guides: buildSnapGuides(nextRect, {
      vertical: verticalSnap,
      horizontal: horizontalSnap,
    }),
  };
}

function findSnapCandidate(
  anchors: Array<{ anchor: SnapCandidate["anchor"]; position: number }>,
  targets: SnapTarget[],
  rect: StageRect,
  orientation: SnapGuide["orientation"]
): SnapCandidate | null {
  const groupedTargets = prioritizeSnapTargets(targets);
  let bestCandidate: SnapCandidate | null = null;

  for (const anchor of anchors) {
    for (const target of groupedTargets) {
      if (!isRelevantSnapTarget(rect, target, orientation)) {
        continue;
      }
      if (target.anchor && target.anchor !== anchor.anchor) {
        continue;
      }

      const delta = target.position - anchor.position;
      const distance = Math.abs(delta);
      if (distance > SNAP_THRESHOLD_PX) {
        continue;
      }

      const effectiveDistance =
        target.kind === "spacing"
          ? Math.max(0, distance - SPACING_SNAP_DISTANCE_BONUS_PX)
          : distance;
      const candidatePriority = effectiveDistance * 100 + target.priority;
      const bestPriority = bestCandidate
        ? getSnapCandidatePriority(bestCandidate)
        : Number.POSITIVE_INFINITY;
      if (candidatePriority >= bestPriority) {
        continue;
      }

      bestCandidate = {
        anchor: anchor.anchor,
        delta,
        target,
      };
    }
  }

  return bestCandidate;
}

function getSnapCandidatePriority(candidate: SnapCandidate): number {
  const distance = Math.abs(candidate.delta);
  const effectiveDistance =
    candidate.target.kind === "spacing"
      ? Math.max(0, distance - SPACING_SNAP_DISTANCE_BONUS_PX)
      : distance;
  return effectiveDistance * 100 + candidate.target.priority;
}

function isRelevantSnapTarget(
  rect: StageRect,
  target: SnapTarget,
  orientation: SnapGuide["orientation"]
): boolean {
  if (target.kind === "slide") {
    return true;
  }

  if (target.kind === "spacing") {
    return isRelevantSpacingTarget(rect, target, orientation);
  }

  if (orientation === "vertical") {
    return rangesOverlapOrNear(
      rect.y,
      rect.y + rect.height,
      target.rect.y,
      target.rect.y + target.rect.height,
      SNAP_AXIS_PROXIMITY_PX
    );
  }

  return rangesOverlapOrNear(
    rect.x,
    rect.x + rect.width,
    target.rect.x,
    target.rect.x + target.rect.width,
    SNAP_AXIS_PROXIMITY_PX
  );
}

function isRelevantSpacingTarget(
  rect: StageRect,
  target: SnapTarget,
  orientation: SnapGuide["orientation"]
): boolean {
  if (target.relatedRects.length < 2) {
    return false;
  }

  if (orientation === "vertical") {
    const top = Math.min(...target.relatedRects.map((relatedRect) => relatedRect.y));
    const bottom = Math.max(
      ...target.relatedRects.map((relatedRect) => relatedRect.y + relatedRect.height)
    );
    return rangesOverlapOrNear(
      rect.y,
      rect.y + rect.height,
      top,
      bottom,
      SPACING_ALIGNMENT_TOLERANCE_PX
    );
  }

  const left = Math.min(...target.relatedRects.map((relatedRect) => relatedRect.x));
  const right = Math.max(
    ...target.relatedRects.map((relatedRect) => relatedRect.x + relatedRect.width)
  );
  return rangesOverlapOrNear(
    rect.x,
    rect.x + rect.width,
    left,
    right,
    SPACING_ALIGNMENT_TOLERANCE_PX
  );
}

function rangesOverlapOrNear(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
  proximity: number
): boolean {
  return Math.max(startA, startB) - Math.min(endA, endB) <= proximity;
}

function prioritizeSnapTargets(targets: SnapTarget[]): SnapTarget[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.kind}:${target.elementId ?? "slide"}:${target.position.toFixed(2)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildSnapGuides(
  rect: StageRect,
  snap: {
    vertical: SnapCandidate | null;
    horizontal: SnapCandidate | null;
  }
): SnapGuide[] {
  const guides: SnapGuide[] = [];
  if (snap.vertical) {
    guides.push(...buildGuidesForCandidate(rect, snap.vertical, "vertical"));
  }
  if (snap.horizontal) {
    guides.push(...buildGuidesForCandidate(rect, snap.horizontal, "horizontal"));
  }
  return guides;
}

function buildGuidesForCandidate(
  rect: StageRect,
  snap: SnapCandidate,
  orientation: SnapGuide["orientation"]
): SnapGuide[] {
  if (snap.target.kind === "spacing") {
    return buildSpacingGuides(rect, snap, orientation);
  }

  return [buildConnectionGuide(rect, snap, orientation)];
}

function buildConnectionGuide(
  rect: StageRect,
  snap: SnapCandidate,
  orientation: SnapGuide["orientation"]
): SnapGuide {
  const target = snap.target;
  const rectCenter = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
  const targetCenter = {
    x: target.rect.x + target.rect.width / 2,
    y: target.rect.y + target.rect.height / 2,
  };

  if (orientation === "vertical") {
    const x = getRectAnchorPosition(rect, snap.anchor, "vertical");
    if (target.kind === "slide") {
      return {
        orientation,
        start: { x: target.position, y: rect.y },
        end: {
          x: target.position,
          y: rect.y + rect.height,
        },
        ...(target.role === "center"
          ? {
              start: { x: target.position, y: target.rect.y },
              end: { x: target.position, y: target.rect.y + target.rect.height },
            }
          : {}),
        variant: "alignment",
      };
    }

    const top = Math.min(rect.y, target.rect.y);
    const bottom = Math.max(rect.y + rect.height, target.rect.y + target.rect.height);
    return {
      orientation,
      start: {
        x,
        y: top - SNAP_GUIDE_EXTENSION_PX,
      },
      end: {
        x,
        y: bottom + SNAP_GUIDE_EXTENSION_PX,
      },
      variant: "alignment",
    };
  }

  const y = getRectAnchorPosition(rect, snap.anchor, "horizontal");
  if (target.kind === "slide") {
    return {
      orientation,
      start: { x: rect.x, y: target.position },
      end: {
        x: rect.x + rect.width,
        y: target.position,
      },
      ...(target.role === "center"
        ? {
            start: { x: target.rect.x, y: target.position },
            end: { x: target.rect.x + target.rect.width, y: target.position },
          }
        : {}),
      variant: "alignment",
    };
  }

  const left = Math.min(rect.x, target.rect.x);
  const right = Math.max(rect.x + rect.width, target.rect.x + target.rect.width);

  return {
    orientation,
    start: {
      x: left - SNAP_GUIDE_EXTENSION_PX,
      y,
    },
    end: {
      x: right + SNAP_GUIDE_EXTENSION_PX,
      y,
    },
    variant: "alignment",
  };
}

function buildSpacingGuides(
  rect: StageRect,
  snap: SnapCandidate,
  orientation: SnapGuide["orientation"]
): SnapGuide[] {
  const relatedRects = snap.target.relatedRects;
  if (relatedRects.length < 2) {
    return [];
  }

  const [first, second] = relatedRects;
  if (!first || !second) {
    return [];
  }

  if (orientation === "vertical") {
    const leftRect = first.x <= second.x ? first : second;
    const rightRect = leftRect === first ? second : first;
    const gapStart = leftRect.x + leftRect.width;
    const gapEnd = rightRect.x;
    const snapStart = snap.anchor === "start" ? rect.x : rect.x + rect.width;
    const firstGapGuide: SnapGuide = {
      orientation: "horizontal",
      start: { x: gapStart, y: leftRect.y + leftRect.height / 2 },
      end: { x: gapEnd, y: rightRect.y + rightRect.height / 2 },
      variant: "spacing",
    };
    const movingGapGuide: SnapGuide = {
      orientation: "horizontal",
      start:
        snap.anchor === "start"
          ? { x: rightRect.x + rightRect.width, y: rightRect.y + rightRect.height / 2 }
          : { x: leftRect.x, y: leftRect.y + leftRect.height / 2 },
      end: { x: snapStart, y: rect.y + rect.height / 2 },
      variant: "spacing",
    };
    return [firstGapGuide, movingGapGuide];
  }

  const topRect = first.y <= second.y ? first : second;
  const bottomRect = topRect === first ? second : first;
  const gapStart = topRect.y + topRect.height;
  const gapEnd = bottomRect.y;
  const snapStart = snap.anchor === "start" ? rect.y : rect.y + rect.height;
  const topGapGuide: SnapGuide = {
    orientation: "vertical",
    start: { x: topRect.x + topRect.width / 2, y: gapStart },
    end: { x: bottomRect.x + bottomRect.width / 2, y: gapEnd },
    variant: "spacing",
  };
  const movingGapGuide: SnapGuide = {
    orientation: "vertical",
    start:
      snap.anchor === "start"
        ? { x: bottomRect.x + bottomRect.width / 2, y: bottomRect.y + bottomRect.height }
        : { x: topRect.x + topRect.width / 2, y: topRect.y },
    end: { x: rect.x + rect.width / 2, y: snapStart },
    variant: "spacing",
  };
  return [topGapGuide, movingGapGuide];
}

function getRectAnchorPosition(
  rect: StageRect,
  anchor: SnapCandidate["anchor"],
  orientation: SnapGuide["orientation"]
): number {
  if (orientation === "vertical") {
    if (anchor === "start") {
      return rect.x;
    }
    if (anchor === "end") {
      return rect.x + rect.width;
    }
    return rect.x + rect.width / 2;
  }

  if (anchor === "start") {
    return rect.y;
  }
  if (anchor === "end") {
    return rect.y + rect.height;
  }
  return rect.y + rect.height / 2;
}

export { useBlockManipulation };
