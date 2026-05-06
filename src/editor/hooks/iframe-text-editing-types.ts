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
}

export interface UseIframeTextEditingResult {
  selectedElementId: string | null;
  selectedElementIds: string[];
  activeGroupScopeId: string | null;
  isEditingText: boolean;
  setSelectedElementId: Dispatch<SetStateAction<string | null>>;
  setSelectedElementIds: Dispatch<SetStateAction<string[]>>;
  beginTextEditing: (elementId: string) => void;
  beginGroupEditingScope: (elementId: string) => void;
  exitGroupEditingScope: () => void;
  clearSelection: () => boolean;
}
