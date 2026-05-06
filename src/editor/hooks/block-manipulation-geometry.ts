import type { EditableElement, StageRect } from "../../core";
import type { ResizeHandleCorner } from "../lib/block-snap-types";

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
  return element?.type === "block" || element?.type === "text" || element?.type === "group";
}

export function isManipulable(element: EditableElement | undefined): boolean {
  return element?.type === "block" || element?.type === "text" || element?.type === "group";
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
