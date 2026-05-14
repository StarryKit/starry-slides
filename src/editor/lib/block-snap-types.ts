import type { StageRect } from "../../core";

export interface SnapGuide {
  orientation: "vertical" | "horizontal";
  start: { x: number; y: number };
  end: { x: number; y: number };
  variant: "alignment" | "spacing";
}

export interface SnapTarget {
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

export interface SnapCandidate {
  anchor: "start" | "center" | "end";
  delta: number;
  target: SnapTarget;
}

export type ResizeHandleCorner = "top-left" | "top-right" | "bottom-right" | "bottom-left";

export type ResizeHandleEdge = "top-center" | "right-center" | "bottom-center" | "left-center";

export type ResizeHandlePosition = ResizeHandleCorner | ResizeHandleEdge;
