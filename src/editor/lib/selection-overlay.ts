import type { RectLike, StageGeometry, StageRect } from "../../core";
import { elementRectToStageRect } from "../../core";
import { type ContentBounds, getVisualContentBounds } from "./content-bounds";

export const SELECTION_OVERLAY_PADDING_X = 8;
export const SELECTION_OVERLAY_PADDING_Y = 14;

/**
 * Add Keynote-style padding around a stage rect so the selection indicator
 * sits just outside the visual content instead of touching it.
 */
export function expandSelectionOverlay(stageRect: StageRect): StageRect {
  return {
    x: stageRect.x - SELECTION_OVERLAY_PADDING_X,
    y: stageRect.y - SELECTION_OVERLAY_PADDING_Y,
    width: stageRect.width + SELECTION_OVERLAY_PADDING_X * 2,
    height: stageRect.height + SELECTION_OVERLAY_PADDING_Y * 2,
  };
}

/**
 * Compute a tight stage rect for a single element using visual content bounds
 * instead of the raw CSS layout box. This is the main entry point for
 * Keynote-style selection that hugs the actual visible content.
 */
export function elementToTightStageRect(
  element: HTMLElement,
  rootRect: RectLike,
  geometry: StageGeometry
): StageRect {
  const contentBounds: ContentBounds = getVisualContentBounds(element);
  const rectLike: RectLike = {
    left: contentBounds.left,
    top: contentBounds.top,
    width: contentBounds.width,
    height: contentBounds.height,
  };
  return elementRectToStageRect(rectLike, rootRect, geometry);
}
