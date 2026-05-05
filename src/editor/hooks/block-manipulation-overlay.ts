import type { EditableElement, StageRect } from "../../core";
import type { SnapGuide } from "../lib/block-snap-types";
import { isManipulable } from "./block-manipulation-geometry";
import type { BlockManipulationOverlay } from "./block-manipulation-types";

export function createBlockManipulationOverlay({
  isEditingText,
  isManipulating,
  selectedElement,
  selectedElementId,
  snapGuides,
  stageRect,
}: {
  isEditingText: boolean;
  isManipulating: boolean;
  selectedElement: EditableElement | undefined;
  selectedElementId: string | null;
  snapGuides: SnapGuide[];
  stageRect: StageRect | null;
}): BlockManipulationOverlay | null {
  if (!stageRect || !selectedElementId || !isManipulable(selectedElement) || isEditingText) {
    return null;
  }

  return {
    selectionBounds: stageRect,
    snapGuides: isManipulating ? snapGuides : [],
    resizeHandles: [
      { corner: "top-left", x: stageRect.x, y: stageRect.y },
      { corner: "top-right", x: stageRect.x + stageRect.width, y: stageRect.y },
      {
        corner: "bottom-right",
        x: stageRect.x + stageRect.width,
        y: stageRect.y + stageRect.height,
      },
      { corner: "bottom-left", x: stageRect.x, y: stageRect.y + stageRect.height },
    ],
    rotationHandle: {
      x: stageRect.x + stageRect.width / 2,
      y: stageRect.y + stageRect.height + 20,
    },
  };
}
