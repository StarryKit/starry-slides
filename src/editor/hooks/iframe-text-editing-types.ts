import type { Dispatch, RefObject, SetStateAction } from "react";
import type { SlideModel, TextUpdateOperation } from "../../core";

export interface TextEditingState {
  slideId: string;
  elementId: string;
  initialText: string;
}

export interface UseIframeTextEditingOptions {
  activeSlide: SlideModel | undefined;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onCommitOperation: (operation: TextUpdateOperation) => void;
  onOpenSelectionContextMenu?: (clientX: number, clientY: number) => void;
  onBeginPointerMove?: (
    elementId: string,
    clientX: number,
    clientY: number,
    pointerOptions?: {
      sourceWindow?: Window | null;
      toStagePoint?: (clientX: number, clientY: number) => { x: number; y: number };
    }
  ) => void;
}

export interface UseIframeTextEditingResult {
  selectedElementId: string | null;
  selectedElementIds: string[];
  preselectedElementId: string | null;
  activeGroupScopeId: string | null;
  isEditingText: boolean;
  setSelectedElementId: Dispatch<SetStateAction<string | null>>;
  setSelectedElementIds: Dispatch<SetStateAction<string[]>>;
  beginTextEditing: (elementId: string) => void;
  beginGroupEditingScope: (elementId: string) => void;
  exitGroupEditingScope: () => void;
  clearSelection: () => boolean;
  clearPreselection: () => void;
  updatePointerPreselection: (clientX: number, clientY: number) => string | null;
  retargetPointerSelection: (clientX: number, clientY: number, additive: boolean) => string | null;
  openPointerSelectionContextMenu: (clientX: number, clientY: number) => boolean;
}
