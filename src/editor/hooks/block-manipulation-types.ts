import type { RefObject } from "react";
import type {
  EditableElement,
  ElementLayoutStyleSnapshot,
  ElementLayoutUpdateOperation,
  SlideBatchOperation,
  SlideModel,
  StageGeometry,
  StageRect,
} from "../../core";
import type {
  ResizeHandleCorner,
  ResizeHandlePosition,
  SnapGuide,
  SnapTarget,
} from "../lib/block-snap-types";

export type ManipulationMode = "move" | "resize" | "rotate";

export interface BlockManipulationOverlay {
  selectionBounds: StageRect;
  snapGuides: SnapGuide[];
  resizeHandles: Array<{
    position: ResizeHandlePosition;
    x: number;
    y: number;
  }>;
  rotationZones: Array<{
    corner: ResizeHandleCorner;
    x: number;
    y: number;
  }>;
}

export interface ManipulationSession {
  slideId: string;
  elementId: string;
  elementIds: string[];
  mode: ManipulationMode;
  resizeHandle: ResizeHandlePosition | null;
  startPointer: { x: number; y: number };
  startStageRect: StageRect;
  centerPoint: { x: number; y: number };
  previousStyle: ElementLayoutStyleSnapshot;
  previousStyles: Record<string, ElementLayoutStyleSnapshot>;
  startComputedMargins: Record<
    string,
    { top: number; right: number; bottom: number; left: number }
  >;
  startElementStageRects: Record<string, StageRect>;
  resizeParentElementIds: Record<string, string | null>;
  startParentStageRects: Record<string, StageRect>;
  targetNodes: Record<string, HTMLElement>;
  snapTargets: {
    vertical: SnapTarget[];
    horizontal: SnapTarget[];
  };
}

export interface UseBlockManipulationOptions {
  activeSlide: SlideModel | undefined;
  selectedElement: EditableElement | undefined;
  selectedElementId: string | null;
  selectedElementIds: string[];
  selectedStageRect: StageRect | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  stageGeometry: StageGeometry;
  isEditingText: boolean;
  onCommitOperation: (operation: ElementLayoutUpdateOperation | SlideBatchOperation) => void;
  isElementLocked: (elementId: string) => boolean;
}

export interface UseBlockManipulationResult {
  manipulationOverlay: BlockManipulationOverlay | null;
  isManipulating: boolean;
  suppressBackgroundClear: boolean;
  beginMove: (event: PointerStartLike, targetElementId?: string) => void;
  beginResize: (position: ResizeHandlePosition, event: PointerStartLike) => void;
  beginRotate: (event: PointerStartLike) => void;
}

export interface PointerStartLike {
  clientX: number;
  clientY: number;
  sourceWindow?: Window | null;
  toStagePoint?: (clientX: number, clientY: number) => { x: number; y: number };
  preventDefault: () => void;
  stopPropagation: () => void;
}
