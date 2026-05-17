import type { EditableElement, StageRect } from "@starrykit/slides-core";
import type { SnapGuide } from "../lib/block-snap-types";
import { isManipulable } from "./block-manipulation-geometry";
import type { BlockManipulationOverlay } from "./block-manipulation-types";

export function createBlockManipulationOverlay({
  isEditingText,
  isManipulating,
  isLocked,
  selectedElement,
  selectedElementId,
  snapGuides,
  stageRect,
}: {
  isEditingText: boolean;
  isManipulating: boolean;
  isLocked: boolean;
  selectedElement: EditableElement | undefined;
  selectedElementId: string | null;
  snapGuides: SnapGuide[];
  stageRect: StageRect | null;
}): BlockManipulationOverlay | null {
  if (
    !stageRect ||
    !selectedElementId ||
    !isManipulable(selectedElement) ||
    isEditingText ||
    isLocked
  ) {
    return null;
  }

  return {
    selectionBounds: stageRect,
    snapGuides: isManipulating ? snapGuides : [],
    resizeHandles: isManipulating
      ? []
      : [
          { position: "top-left", x: stageRect.x, y: stageRect.y },
          { position: "top-center", x: stageRect.x + stageRect.width / 2, y: stageRect.y },
          { position: "top-right", x: stageRect.x + stageRect.width, y: stageRect.y },
          {
            position: "right-center",
            x: stageRect.x + stageRect.width,
            y: stageRect.y + stageRect.height / 2,
          },
          {
            position: "bottom-right",
            x: stageRect.x + stageRect.width,
            y: stageRect.y + stageRect.height,
          },
          {
            position: "bottom-center",
            x: stageRect.x + stageRect.width / 2,
            y: stageRect.y + stageRect.height,
          },
          { position: "bottom-left", x: stageRect.x, y: stageRect.y + stageRect.height },
          {
            position: "left-center",
            x: stageRect.x,
            y: stageRect.y + stageRect.height / 2,
          },
        ],
    rotationZones: isManipulating
      ? []
      : [
          { corner: "top-left", x: stageRect.x - 18, y: stageRect.y - 18 },
          {
            corner: "top-right",
            x: stageRect.x + stageRect.width + 18,
            y: stageRect.y - 18,
          },
          {
            corner: "bottom-right",
            x: stageRect.x + stageRect.width + 18,
            y: stageRect.y + stageRect.height + 18,
          },
          {
            corner: "bottom-left",
            x: stageRect.x - 18,
            y: stageRect.y + stageRect.height + 18,
          },
        ],
  };
}
