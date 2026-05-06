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
import type { ResizeHandleCorner, SnapGuide, SnapTarget } from "../lib/block-snap-types";

export type ManipulationMode = "move" | "resize" | "rotate";

export interface BlockManipulationOverlay {
  selectionBounds: StageRect;
  snapGuides: SnapGuide[];
  resizeHandles: Array<{
    corner: ResizeHandleCorner;
    x: number;
    y: number;
  }>;
  rotationHandle: { x: number; y: number };
}

export interface ManipulationSession {
  slideId: string;
  elementId: string;
  elementIds: string[];
  mode: ManipulationMode;
  resizeCorner: ResizeHandleCorner | null;
  startPointer: { x: number; y: number };
  startStageRect: StageRect;
  centerPoint: { x: number; y: number };
  previousStyle: ElementLayoutStyleSnapshot;
  previousStyles: Record<string, ElementLayoutStyleSnapshot>;
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
}

export interface UseBlockManipulationResult {
  manipulationOverlay: BlockManipulationOverlay | null;
  isManipulating: boolean;
  suppressBackgroundClear: boolean;
  beginMove: (event: PointerStartLike) => void;
  beginResize: (corner: ResizeHandleCorner, event: PointerStartLike) => void;
  beginRotate: (event: PointerStartLike) => void;
}

export interface PointerStartLike {
  clientX: number;
  clientY: number;
  preventDefault: () => void;
  stopPropagation: () => void;
}
