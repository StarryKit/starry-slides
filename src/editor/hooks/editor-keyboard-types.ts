import type { RefObject } from "react";
import type {
  ElementInsertOperation,
  ElementLayoutUpdateOperation,
  ElementRemoveOperation,
  SlideModel,
  SlideOperation,
} from "../../core";

export interface ClipboardPayload {
  elements: Array<{
    sourceElementId: string;
    html: string;
    rect: SlideRect;
    parentElementId: string | null;
    previousSiblingElementId: string | null;
    nextSiblingElementId: string | null;
  }>;
  unionRect: SlideRect;
}

export interface SlideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseEditorKeyboardShortcutsOptions {
  activeSlide: SlideModel | undefined;
  selectedElementIds: string[];
  iframeRef: RefObject<HTMLIFrameElement | null>;
  slideWidth: number;
  slideHeight: number;
  isEditingText: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onEscapeSelection: () => boolean;
  onNavigateSlide: (direction: "previous" | "next") => boolean;
  onCommitOperation: (
    operation:
      | ElementInsertOperation
      | ElementLayoutUpdateOperation
      | ElementRemoveOperation
      | SlideOperation
  ) => void;
  onSelectElementIds: (elementIds: string[]) => void;
  onUndo: () => void;
  onRedo: () => void;
}
