import { SELECTOR_ATTR, querySlideElement } from "@starrykit/slides-core";
import type { SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActiveTextEditingSession } from "./iframe-active-text-session";
import {
  clearSelectionForEscape,
  ensureSelectionContainsTarget,
  nextSingleSelection,
} from "./iframe-editing-session";
import { useIframeTextDocumentEvents } from "./iframe-text-document-events";
import {
  applyGroupScopeFocus,
  getDeepestEditableElementFromPoint,
  setNativeTextSelectionEnabled,
} from "./iframe-text-editing-dom";
import type {
  TextEditingState,
  UseIframeTextEditingOptions,
  UseIframeTextEditingResult,
} from "./iframe-text-editing-types";

function useIframeTextEditing({
  activeSlide,
  iframeRef,
  onCommitOperation,
  isElementLocked,
  onOpenSelectionContextMenu,
  onBeginPointerMove,
}: UseIframeTextEditingOptions): UseIframeTextEditingResult {
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [preselectedElementId, setPreselectedElementId] = useState<string | null>(null);
  const [activeGroupScopeId, setActiveGroupScopeId] = useState<string | null>(null);
  const [textEditing, setTextEditing] = useState<TextEditingState | null>(null);
  const textEditingRef = useRef<TextEditingState | null>(null);
  const activeGroupScopeIdRef = useRef<string | null>(null);
  const commitTextEditRef = useRef<(elementId: string, nextText: string) => void>(() => {});
  const cancelTextEditRef = useRef<() => void>(() => {});
  const selectedElementId = selectedElementIds[selectedElementIds.length - 1] ?? null;

  const clearPreselection = useCallback(() => {
    setPreselectedElementId((currentId) => (currentId === null ? currentId : null));
  }, []);

  function setSelectedElementId(value: SetStateAction<string | null>) {
    setSelectedElementIds((currentIds) => {
      const nextValue =
        typeof value === "function" ? value(currentIds[currentIds.length - 1] ?? null) : value;
      return nextSingleSelection(nextValue);
    });
  }

  const getPointerEditableTargetId = useCallback(
    (clientX: number, clientY: number) => {
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument;
      if (!iframe || !doc || textEditingRef.current) {
        return null;
      }

      const iframeRect = iframe.getBoundingClientRect();
      const iframeScaleX = iframeRect.width > 0 ? iframe.clientWidth / iframeRect.width : 1;
      const iframeScaleY = iframeRect.height > 0 ? iframe.clientHeight / iframeRect.height : 1;
      const target = getDeepestEditableElementFromPoint(
        doc,
        (clientX - iframeRect.left) * iframeScaleX,
        (clientY - iframeRect.top) * iframeScaleY,
        activeGroupScopeIdRef.current
      );
      return target?.getAttribute(SELECTOR_ATTR) ?? null;
    },
    [iframeRef]
  );

  const updatePointerPreselection = useCallback(
    (clientX: number, clientY: number) => {
      const targetId = getPointerEditableTargetId(clientX, clientY);
      setPreselectedElementId((currentId) => (currentId === targetId ? currentId : targetId));
      return targetId;
    },
    [getPointerEditableTargetId]
  );

  const retargetPointerSelection = useCallback(
    (clientX: number, clientY: number, additive: boolean) => {
      const targetId = getPointerEditableTargetId(clientX, clientY);
      if (!targetId) {
        return null;
      }

      if (additive) {
        setSelectedElementIds((currentIds) => ensureSelectionContainsTarget(currentIds, targetId));
      } else {
        setSelectedElementIds([targetId]);
      }
      return targetId;
    },
    [getPointerEditableTargetId]
  );

  const openPointerSelectionContextMenu = useCallback(
    (clientX: number, clientY: number) => {
      const targetId = getPointerEditableTargetId(clientX, clientY);
      if (!targetId) {
        return false;
      }

      setSelectedElementIds((currentIds) => ensureSelectionContainsTarget(currentIds, targetId));
      setPreselectedElementId(targetId);
      onOpenSelectionContextMenu?.(clientX, clientY);
      return true;
    },
    [getPointerEditableTargetId, onOpenSelectionContextMenu]
  );

  const beginTextEditing = useCallback(
    (elementId: string) => {
      if (!activeSlide) {
        return;
      }

      const doc = iframeRef.current?.contentDocument;
      const node = doc ? querySlideElement<HTMLElement>(doc, elementId) : null;
      if (!node || node.getAttribute("data-editable") !== "text") {
        return;
      }

      const nextEditingState = {
        slideId: activeSlide.id,
        elementId,
        initialText: node.textContent || "",
      };
      setSelectedElementIds([elementId]);
      textEditingRef.current = nextEditingState;
      setTextEditing(nextEditingState);
    },
    [activeSlide, iframeRef]
  );

  const beginGroupEditingScope = useCallback(
    (elementId: string) => {
      const doc = iframeRef.current?.contentDocument;
      setActiveGroupScopeId(elementId);
      activeGroupScopeIdRef.current = elementId;
      setSelectedElementIds([elementId]);
      if (doc) {
        applyGroupScopeFocus(doc, elementId);
      }
    },
    [iframeRef]
  );

  const exitGroupEditingScope = useCallback(() => {
    const groupElementId = activeGroupScopeIdRef.current;
    const doc = iframeRef.current?.contentDocument;
    activeGroupScopeIdRef.current = null;
    setActiveGroupScopeId(null);
    setSelectedElementIds(groupElementId ? [groupElementId] : []);
    if (doc) {
      applyGroupScopeFocus(doc, null);
    }
  }, [iframeRef]);

  const clearSelection = useCallback(() => {
    if (textEditingRef.current) {
      setSelectedElementIds((currentIds) => (currentIds.length ? [] : currentIds));
      return true;
    }

    const result = clearSelectionForEscape({
      selectedElementIds,
      activeGroupScopeId: activeGroupScopeIdRef.current,
    });
    if (result.handled) {
      if (result.exitGroupScope) {
        activeGroupScopeIdRef.current = null;
        setActiveGroupScopeId(null);
      }
      setSelectedElementIds(result.nextSelection);
    }
    return result.handled;
  }, [selectedElementIds]);

  function commitTextEdit(elementId: string, nextText: string) {
    const editing = textEditing;
    if (
      !activeSlide ||
      !editing ||
      editing.slideId !== activeSlide.id ||
      editing.elementId !== elementId
    ) {
      textEditingRef.current = null;
      setTextEditing(null);
      return;
    }

    const previousText = editing.initialText;
    textEditingRef.current = null;
    setTextEditing(null);
    if (nextText === previousText) {
      return;
    }

    onCommitOperation({
      type: "text.update",
      slideId: activeSlide.id,
      elementId,
      previousText,
      nextText,
      timestamp: Date.now(),
    });
  }

  function cancelTextEdit() {
    const doc = iframeRef.current?.contentDocument;
    const editing = textEditingRef.current;
    if (editing && doc) {
      const editableNode = querySlideElement<HTMLElement>(doc, editing.elementId);
      if (editableNode) {
        editableNode.textContent = editing.initialText;
      }
    }

    textEditingRef.current = null;
    setTextEditing(null);
  }

  useEffect(() => {
    textEditingRef.current = textEditing;
  }, [textEditing]);

  useEffect(() => {
    activeGroupScopeIdRef.current = activeGroupScopeId;
  }, [activeGroupScopeId]);

  useEffect(() => {
    if (activeSlide && textEditing && textEditing.slideId !== activeSlide.id) {
      setTextEditing(null);
    }
  }, [activeSlide, textEditing]);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      setNativeTextSelectionEnabled(
        doc,
        Boolean(activeSlide && textEditing?.slideId === activeSlide.id)
      );
    }
  }, [activeSlide, iframeRef, textEditing]);

  commitTextEditRef.current = commitTextEdit;
  cancelTextEditRef.current = cancelTextEdit;

  useIframeTextDocumentEvents({
    activeGroupScopeIdRef,
    activeSlide,
    beginGroupEditingScope,
    beginTextEditing,
    clearPreselection,
    commitTextEditRef,
    iframeRef,
    isElementLocked,
    onBeginPointerMove,
    openPointerSelectionContextMenu,
    setPreselectedElementId,
    setSelectedElementIds,
    textEditingRef,
  });

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      applyGroupScopeFocus(doc, activeGroupScopeId);
    }
  }, [activeGroupScopeId, iframeRef]);

  useActiveTextEditingSession({
    activeSlide,
    cancelTextEditRef,
    commitTextEditRef,
    iframeRef,
    textEditing,
    textEditingRef,
  });

  return {
    selectedElementId,
    selectedElementIds,
    preselectedElementId,
    activeGroupScopeId,
    isEditingText: Boolean(activeSlide && textEditing?.slideId === activeSlide.id),
    setSelectedElementId,
    setSelectedElementIds,
    beginTextEditing,
    beginGroupEditingScope,
    exitGroupEditingScope,
    clearSelection,
    clearPreselection,
    updatePointerPreselection,
    retargetPointerSelection,
    openPointerSelectionContextMenu,
  };
}

export { useIframeTextEditing };
