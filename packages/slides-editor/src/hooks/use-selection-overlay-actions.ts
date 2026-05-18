import {
  type EditableElement,
  SELECTOR_ATTR,
  isPersistedGroupElementId,
  isPersistedGroupNode,
  querySlideElement,
} from "@starrykit/slides-core";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import type { ResizeHandlePosition } from "../lib/block-snap-types";
import { getScopedTextTargetAtPoint } from "../lib/editor-selection-structure";
import type { PointerStartLike } from "./block-manipulation-types";
import { getOutermostSelectedAncestorFromPoint } from "./iframe-text-editing-dom";

interface OverlayPointerDown {
  clientX: number;
  clientY: number;
  additive: boolean;
  targetElementId: string | null;
}

interface UseSelectionOverlayActionsOptions {
  selectedElementId: string | null;
  selectedElementIds: string[];
  selectedElement: EditableElement | undefined;
  activeGroupScopeId: string | null;
  isSelectedElementLocked: boolean;
  suppressBackgroundClear: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  overlayPointerDownRef: RefObject<OverlayPointerDown | null>;
  onToolbarSuppressedChange: (suppressed: boolean) => void;
  onPointerPreselectionUpdate: (clientX: number, clientY: number) => string | null;
  onPointerSelectionRetarget: (clientX: number, clientY: number, additive: boolean) => void;
  onSelectionContextMenuOpen: (clientX: number, clientY: number) => void;
  onBeginMove: (event: PointerStartLike, targetElementId?: string) => void;
  onBeginResize: (position: ResizeHandlePosition, event: PointerStartLike) => void;
  onBeginRotate: (event: PointerStartLike) => void;
  onBeginTextEditing: (elementId: string) => void;
  onBeginGroupEditingScope: (elementId: string) => void;
  onClearSelection: () => void;
}

function useSelectionOverlayActions({
  selectedElementId,
  selectedElementIds,
  selectedElement,
  activeGroupScopeId,
  isSelectedElementLocked,
  suppressBackgroundClear,
  iframeRef,
  overlayPointerDownRef,
  onToolbarSuppressedChange,
  onPointerPreselectionUpdate,
  onPointerSelectionRetarget,
  onSelectionContextMenuOpen,
  onBeginMove,
  onBeginResize,
  onBeginRotate,
  onBeginTextEditing,
  onBeginGroupEditingScope,
  onClearSelection,
}: UseSelectionOverlayActionsOptions) {
  const isSelectedPersistedGroup = () => {
    if (!selectedElementId) {
      return false;
    }

    if (isPersistedGroupElementId(selectedElementId)) {
      return true;
    }

    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      return false;
    }

    return isPersistedGroupNode(querySlideElement<HTMLElement>(doc, selectedElementId));
  };
  const selectedPersistedGroup = isSelectedPersistedGroup();
  const shouldDeferSelectedGroupMove =
    selectedPersistedGroup && !activeGroupScopeId && selectedElementIds.length === 1;

  return {
    onSelectionOverlayMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !selectedElementIds.length) {
        return;
      }

      if (isSelectedElementLocked) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      onToolbarSuppressedChange(true);
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      const pointerTargetElementId = onPointerPreselectionUpdate(event.clientX, event.clientY);
      const targetElementId =
        getSelectedAncestorFromPointer({
          activeGroupScopeId,
          clientX: event.clientX,
          clientY: event.clientY,
          iframe: iframeRef.current,
          selectedElementIds,
        }) ?? pointerTargetElementId;
      overlayPointerDownRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        additive,
        targetElementId,
      };

      const isSelectedPointerTarget = Boolean(
        targetElementId && selectedElementIds.includes(targetElementId)
      );

      if (targetElementId && targetElementId !== selectedElementId && !isSelectedPointerTarget) {
        event.stopPropagation();
        return;
      }

      if (targetElementId && (targetElementId === selectedElementId || isSelectedPointerTarget)) {
        event.stopPropagation();
      }

      if (shouldDeferSelectedGroupMove) {
        return;
      }

      onBeginMove(
        {
          clientX: event.clientX,
          clientY: event.clientY,
          preventDefault: () => event.preventDefault(),
          stopPropagation: () => event.stopPropagation(),
        },
        targetElementId && isSelectedPointerTarget ? targetElementId : undefined
      );
    },
    onSelectionOverlayMouseMove: (event: ReactMouseEvent<HTMLDivElement>) => {
      if (isSelectedElementLocked) {
        return;
      }

      const pointerDown = overlayPointerDownRef.current;
      onPointerPreselectionUpdate(event.clientX, event.clientY);
      if (
        !pointerDown ||
        pointerDown.targetElementId === selectedElementId ||
        (pointerDown.targetElementId && selectedElementIds.includes(pointerDown.targetElementId))
      ) {
        return;
      }

      const deltaX = event.clientX - pointerDown.clientX;
      const deltaY = event.clientY - pointerDown.clientY;
      if (shouldDeferSelectedGroupMove && Math.hypot(deltaX, deltaY) > 4 && selectedElementId) {
        overlayPointerDownRef.current = null;
        onBeginMove(
          {
            clientX: pointerDown.clientX,
            clientY: pointerDown.clientY,
            preventDefault: () => event.preventDefault(),
            stopPropagation: () => event.stopPropagation(),
          },
          selectedElementId
        );
        return;
      }

      if (Math.hypot(deltaX, deltaY) <= 4) {
        return;
      }

      overlayPointerDownRef.current = null;
      onPointerSelectionRetarget(pointerDown.clientX, pointerDown.clientY, pointerDown.additive);
      onBeginMove(
        {
          clientX: pointerDown.clientX,
          clientY: pointerDown.clientY,
          preventDefault: () => event.preventDefault(),
          stopPropagation: () => event.stopPropagation(),
        },
        pointerDown.targetElementId ?? undefined
      );
    },
    onSelectionOverlayContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onSelectionContextMenuOpen(event.clientX, event.clientY);
    },
    onSelectionOverlayMouseUp: (event: ReactMouseEvent<HTMLDivElement>) => {
      if (isSelectedElementLocked) {
        overlayPointerDownRef.current = null;
        onToolbarSuppressedChange(false);
        return;
      }

      const pointerDown = overlayPointerDownRef.current;
      overlayPointerDownRef.current = null;
      onToolbarSuppressedChange(false);
      if (!pointerDown) {
        return;
      }

      if (
        event.detail >= 2 &&
        selectedPersistedGroup &&
        !activeGroupScopeId &&
        selectedElementIds.length === 1 &&
        selectedElementId
      ) {
        onBeginGroupEditingScope(selectedElementId);
        return;
      }

      const deltaX = event.clientX - pointerDown.clientX;
      const deltaY = event.clientY - pointerDown.clientY;
      if (Math.hypot(deltaX, deltaY) > 4) {
        return;
      }

      if (
        selectedPersistedGroup &&
        !activeGroupScopeId &&
        selectedElementIds.length === 1 &&
        pointerDown.targetElementId &&
        pointerDown.targetElementId !== selectedElementId
      ) {
        return;
      }

      onPointerSelectionRetarget(event.clientX, event.clientY, pointerDown.additive);
    },
    onResizeHandleMouseDown: (
      position: ResizeHandlePosition,
      event: ReactMouseEvent<HTMLButtonElement>
    ) => {
      if (!selectedElementIds.length) {
        return;
      }

      onBeginResize(position, {
        clientX: event.clientX,
        clientY: event.clientY,
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      });
    },
    onCornerRotationZoneMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (selectedElementIds.length !== 1) {
        return;
      }

      onBeginRotate({
        clientX: event.clientX,
        clientY: event.clientY,
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      });
    },
    onSelectionOverlayDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => {
      if (activeGroupScopeId && iframeRef.current?.contentDocument) {
        const iframeRect = iframeRef.current.getBoundingClientRect();
        const doc = iframeRef.current.contentDocument;
        const iframeScaleX = iframeRect.width / iframeRef.current.clientWidth || 1;
        const iframeScaleY = iframeRect.height / iframeRef.current.clientHeight || 1;
        const scopedEditable = getScopedTextTargetAtPoint(doc, activeGroupScopeId, {
          x: (event.clientX - iframeRect.left) / iframeScaleX,
          y: (event.clientY - iframeRect.top) / iframeScaleY,
        });

        const scopedElementId = scopedEditable?.getAttribute(SELECTOR_ATTR);
        if (scopedElementId) {
          onBeginTextEditing(scopedElementId);
          return;
        }
      }

      if (
        selectedElementIds.length === 1 &&
        selectedElement?.type === "text" &&
        selectedElementId
      ) {
        onBeginTextEditing(selectedElementId);
        return;
      }

      if (
        selectedElementIds.length === 1 &&
        (selectedElement?.type === "group" || selectedPersistedGroup) &&
        selectedElementId
      ) {
        onBeginGroupEditingScope(selectedElementId);
      }
    },
    onBackgroundClick: () => {
      if (!suppressBackgroundClear) {
        onClearSelection();
      }
    },
  };
}

function getSelectedAncestorFromPointer({
  activeGroupScopeId,
  clientX,
  clientY,
  iframe,
  selectedElementIds,
}: {
  activeGroupScopeId: string | null;
  clientX: number;
  clientY: number;
  iframe: HTMLIFrameElement | null;
  selectedElementIds: string[];
}): string | null {
  const doc = iframe?.contentDocument;
  if (!iframe || !doc || !selectedElementIds.length) {
    return null;
  }

  const iframeRect = iframe.getBoundingClientRect();
  const iframeScaleX = iframeRect.width > 0 ? iframe.clientWidth / iframeRect.width : 1;
  const iframeScaleY = iframeRect.height > 0 ? iframe.clientHeight / iframeRect.height : 1;
  const selectedAncestor = getOutermostSelectedAncestorFromPoint(
    doc,
    (clientX - iframeRect.left) * iframeScaleX,
    (clientY - iframeRect.top) * iframeScaleY,
    activeGroupScopeId,
    selectedElementIds
  );

  return selectedAncestor?.getAttribute(SELECTOR_ATTR) ?? null;
}

export { useSelectionOverlayActions };
