import {
  type EditableElement,
  SELECTOR_ATTR,
  type SlideModel,
  type StageGeometry,
  type StageRect,
  composeTransform,
  parseTransformParts,
  querySlideElement,
} from "../../core";
import type { ResizeHandleCorner } from "../lib/block-snap-types";
import { applyLayoutSnapshot } from "./block-manipulation-operations";
import type { ManipulationSession } from "./block-manipulation-types";

export function px(value: number): string {
  return `${Math.round(value * 100) / 100}px`;
}

export function clampSize(value: number): number {
  return Math.max(value, 48);
}

export function clampStageSize(value: number, scale: number): number {
  return Math.max(value, 48 * scale);
}

export function isLayoutEditable(element: EditableElement | undefined): boolean {
  return (
    element?.type === "block" ||
    element?.type === "text" ||
    element?.type === "image" ||
    element?.type === "group"
  );
}

export function isManipulable(element: EditableElement | undefined): boolean {
  return (
    element?.type === "block" ||
    element?.type === "text" ||
    element?.type === "image" ||
    element?.type === "group"
  );
}

export function unionStageRects(rects: StageRect[]): StageRect {
  const [firstRect, ...restRects] = rects;
  if (!firstRect) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  return restRects.reduce((accumulator, rect) => {
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
  }, firstRect);
}

export function getRotationDeltaDegrees(
  pointerX: number,
  pointerY: number,
  centerX: number,
  centerY: number
) {
  return (Math.atan2(pointerY - centerY, pointerX - centerX) * 180) / Math.PI;
}

export function createResizedStageRect({
  resizeCorner,
  scale,
  stageDeltaX,
  stageDeltaY,
  startStageRect,
}: {
  resizeCorner: ResizeHandleCorner | null;
  scale: number;
  stageDeltaX: number;
  stageDeltaY: number;
  startStageRect: StageRect;
}): StageRect {
  let nextStageX = startStageRect.x;
  let nextStageY = startStageRect.y;
  let nextStageWidth = startStageRect.width;
  let nextStageHeight = startStageRect.height;

  switch (resizeCorner) {
    case "top-left": {
      nextStageWidth = clampStageSize(startStageRect.width - stageDeltaX, scale);
      nextStageHeight = clampStageSize(startStageRect.height - stageDeltaY, scale);
      nextStageX = startStageRect.x + (startStageRect.width - nextStageWidth);
      nextStageY = startStageRect.y + (startStageRect.height - nextStageHeight);
      break;
    }
    case "top-right": {
      nextStageWidth = clampStageSize(startStageRect.width + stageDeltaX, scale);
      nextStageHeight = clampStageSize(startStageRect.height - stageDeltaY, scale);
      nextStageY = startStageRect.y + (startStageRect.height - nextStageHeight);
      break;
    }
    case "bottom-left": {
      nextStageWidth = clampStageSize(startStageRect.width - stageDeltaX, scale);
      nextStageHeight = clampStageSize(startStageRect.height + stageDeltaY, scale);
      nextStageX = startStageRect.x + (startStageRect.width - nextStageWidth);
      break;
    }
    default: {
      nextStageWidth = clampStageSize(startStageRect.width + stageDeltaX, scale);
      nextStageHeight = clampStageSize(startStageRect.height + stageDeltaY, scale);
      break;
    }
  }

  return {
    x: nextStageX,
    y: nextStageY,
    width: nextStageWidth,
    height: nextStageHeight,
  };
}

export function getManipulationElementIds({
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
    return selectedLayoutElementIds.includes(selectedElementId)
      ? selectedLayoutElementIds
      : [selectedElementId];
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

export function getResizeParentElementId(
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

export function applyGeometryScaledResize(
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

export function getParentStageRectKey(node: HTMLElement | null): string {
  return node?.getAttribute(SELECTOR_ATTR)
    ? `editable:${node.getAttribute(SELECTOR_ATTR)}`
    : "slide";
}
