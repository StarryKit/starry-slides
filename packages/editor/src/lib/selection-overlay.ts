import type { StageRect } from "@starry-slide/core";

export const SELECTION_OVERLAY_PADDING_X = 8;
export const SELECTION_OVERLAY_PADDING_Y = 14;

export function expandSelectionOverlay(stageRect: StageRect): StageRect {
  return {
    x: stageRect.x - SELECTION_OVERLAY_PADDING_X,
    y: stageRect.y - SELECTION_OVERLAY_PADDING_Y,
    width: stageRect.width + SELECTION_OVERLAY_PADDING_X * 2,
    height: stageRect.height + SELECTION_OVERLAY_PADDING_Y * 2,
  };
}
