import { type RefObject, useEffect } from "react";
import {
  SELECTOR_ATTR,
  type SlideModel,
  injectBaseTag,
  isPersistedGroupNode,
  querySlideElement,
} from "../../core";
import { ensureSelectionContainsTarget } from "./iframe-editing-session";
import {
  applyGroupScopeFocus,
  ensureEditingTextStyle,
  getDeepestEditableElementFromPoint,
  getEditableSelectionTargetInScope,
  getEditableTextTargetFromPoint,
} from "./iframe-text-editing-dom";
import type { TextEditingState } from "./iframe-text-editing-types";

interface UseIframeTextDocumentEventsOptions {
  activeGroupScopeIdRef: RefObject<string | null>;
  activeSlide: SlideModel | undefined;
  beginGroupEditingScope: (elementId: string) => void;
  beginTextEditing: (elementId: string) => void;
  clearPreselection: () => void;
  commitTextEditRef: RefObject<(elementId: string, nextText: string) => void>;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  isElementLocked?: (elementId: string) => boolean;
  onBeginPointerMove?: (
    elementId: string,
    clientX: number,
    clientY: number,
    pointerOptions?: {
      sourceWindow?: Window | null;
      toStagePoint?: (clientX: number, clientY: number) => { x: number; y: number };
    }
  ) => void;
  openPointerSelectionContextMenu: (clientX: number, clientY: number) => boolean;
  setPreselectedElementId: (updater: (currentId: string | null) => string | null) => void;
  setSelectedElementIds: (updater: string[] | ((currentIds: string[]) => string[])) => void;
  textEditingRef: RefObject<TextEditingState | null>;
}

function useIframeTextDocumentEvents({
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
}: UseIframeTextDocumentEventsOptions) {
  useEffect(() => {
    if (!activeSlide) {
      return;
    }

    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) {
      return;
    }

    doc.open();
    doc.write(injectBaseTag(activeSlide.htmlSource, activeSlide.sourceFile));
    doc.close();

    ensureEditingTextStyle(doc);
    applyGroupScopeFocus(doc, activeGroupScopeIdRef.current);

    const commitNodeText = (node: HTMLElement) => {
      const elementId = node.getAttribute(SELECTOR_ATTR);
      if (elementId) {
        commitTextEditRef.current(elementId, node.textContent || "");
      }
    };

    doc.onclick = (event) => {
      handleDocumentClick({
        activeGroupScopeId: activeGroupScopeIdRef.current,
        commitNodeText,
        doc,
        event,
        setSelectedElementIds,
        textEditing: textEditingRef.current,
      });
    };
    doc.onmousemove = (event) => {
      if (textEditingRef.current) {
        clearPreselection();
        return;
      }

      const editableTarget = getDeepestEditableElementFromPoint(
        doc,
        event.clientX,
        event.clientY,
        activeGroupScopeIdRef.current
      );
      const targetId = editableTarget?.getAttribute(SELECTOR_ATTR) ?? null;
      setPreselectedElementId((currentId) => (currentId === targetId ? currentId : targetId));
    };
    doc.oncontextmenu = (event) => {
      if (textEditingRef.current) {
        return;
      }

      const iframeRect = iframe.getBoundingClientRect();
      const iframeScaleX = iframeRect.width > 0 ? iframe.clientWidth / iframeRect.width : 1;
      const iframeScaleY = iframeRect.height > 0 ? iframe.clientHeight / iframeRect.height : 1;
      const parentClientX = iframeRect.left + event.clientX / iframeScaleX;
      const parentClientY = iframeRect.top + event.clientY / iframeScaleY;

      if (openPointerSelectionContextMenu(parentClientX, parentClientY)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    doc.onmouseleave = () => {
      clearPreselection();
    };

    const onDocumentDoubleClick = (event: MouseEvent) => {
      const scopedTextTarget = getEditableTextTargetFromPoint(
        doc,
        { x: event.clientX, y: event.clientY },
        activeGroupScopeIdRef.current
      );
      const scopedTextId = scopedTextTarget?.getAttribute(SELECTOR_ATTR);
      if (!scopedTextId) {
        return;
      }

      if (textEditingRef.current?.elementId === scopedTextId) {
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      beginTextEditing(scopedTextId);
    };
    doc.addEventListener("dblclick", onDocumentDoubleClick, true);

    for (const node of Array.from(
      doc.querySelectorAll<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`)
    )) {
      installEditableNodeHandlers({
        activeGroupScopeIdRef,
        activeSlide,
        beginGroupEditingScope,
        beginTextEditing,
        iframe,
        isElementLocked,
        node,
        onBeginPointerMove,
        setPreselectedElementId,
        setSelectedElementIds,
        textEditingRef,
      });
    }

    return () => {
      doc.removeEventListener("dblclick", onDocumentDoubleClick, true);
    };
  }, [
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
  ]);
}

function handleDocumentClick({
  activeGroupScopeId,
  commitNodeText,
  doc,
  event,
  setSelectedElementIds,
  textEditing,
}: {
  activeGroupScopeId: string | null;
  commitNodeText: (node: HTMLElement) => void;
  doc: Document;
  event: MouseEvent;
  setSelectedElementIds: (updater: string[] | ((currentIds: string[]) => string[])) => void;
  textEditing: TextEditingState | null;
}) {
  const target = event.target;
  if (!(target instanceof Element)) {
    if (textEditing) {
      const editingNode = querySlideElement<HTMLElement>(doc, textEditing.elementId);
      if (editingNode) {
        commitNodeText(editingNode);
        setSelectedElementIds([]);
        return;
      }
    }

    setSelectedElementIds([]);
    return;
  }

  if (textEditing) {
    const editingNode = querySlideElement<HTMLElement>(doc, textEditing.elementId);
    if (editingNode && !editingNode.contains(target)) {
      commitNodeText(editingNode);
      setSelectedElementIds([]);
    }
    return;
  }

  const editableTarget = getEditableSelectionTargetInScope(target, activeGroupScopeId);
  if (!editableTarget) {
    if (!activeGroupScopeId) {
      setSelectedElementIds([]);
    }
    return;
  }

  const id = editableTarget.getAttribute(SELECTOR_ATTR);
  if (id) {
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      setSelectedElementIds((currentIds) => ensureSelectionContainsTarget(currentIds, id));
    } else {
      setSelectedElementIds([id]);
    }
  }
}

function installEditableNodeHandlers({
  activeGroupScopeIdRef,
  activeSlide,
  beginGroupEditingScope,
  beginTextEditing,
  iframe,
  isElementLocked,
  node,
  onBeginPointerMove,
  setPreselectedElementId,
  setSelectedElementIds,
  textEditingRef,
}: {
  activeGroupScopeIdRef: RefObject<string | null>;
  activeSlide: SlideModel;
  beginGroupEditingScope: (elementId: string) => void;
  beginTextEditing: (elementId: string) => void;
  iframe: HTMLIFrameElement;
  isElementLocked?: (elementId: string) => boolean;
  node: HTMLElement;
  onBeginPointerMove?: UseIframeTextDocumentEventsOptions["onBeginPointerMove"];
  setPreselectedElementId: (updater: (currentId: string | null) => string | null) => void;
  setSelectedElementIds: (updater: string[] | ((currentIds: string[]) => string[])) => void;
  textEditingRef: RefObject<TextEditingState | null>;
}) {
  node.style.cursor = "default";
  node.ondblclick = null;
  node.onblur = null;
  node.onkeydown = null;
  node.onmousedown = null;
  node.onclick = (event) => {
    event.stopPropagation();

    const editableTarget = getEditableSelectionTargetInScope(
      event.target as Element,
      activeGroupScopeIdRef.current
    );
    if (activeGroupScopeIdRef.current && !editableTarget) {
      return;
    }

    const targetId =
      editableTarget?.getAttribute(SELECTOR_ATTR) ?? node.getAttribute(SELECTOR_ATTR);
    if (textEditingRef.current?.elementId === targetId) {
      return;
    }

    if (targetId) {
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        setSelectedElementIds((currentIds) => ensureSelectionContainsTarget(currentIds, targetId));
      } else {
        setSelectedElementIds([targetId]);
      }
    }
  };

  node.onmousedown = (event) => {
    if (event.button !== 0 || textEditingRef.current) {
      return;
    }

    const editableTarget = getEditableSelectionTargetInScope(
      event.target as Element,
      activeGroupScopeIdRef.current
    );
    if (activeGroupScopeIdRef.current && !editableTarget) {
      return;
    }

    const targetId =
      editableTarget?.getAttribute(SELECTOR_ATTR) ?? node.getAttribute(SELECTOR_ATTR);
    if (!targetId || isElementLocked?.(targetId)) {
      return;
    }

    const iframeRect = iframe.getBoundingClientRect();
    const iframeScaleX = iframeRect.width > 0 ? iframe.clientWidth / iframeRect.width : 1;
    const iframeScaleY = iframeRect.height > 0 ? iframe.clientHeight / iframeRect.height : 1;
    const sourceWindow = iframe.contentWindow;
    if (!sourceWindow) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    let didStartMove = false;
    const teardown = () => {
      sourceWindow.removeEventListener("mousemove", onMouseMove);
      sourceWindow.removeEventListener("mouseup", onMouseUp);
    };
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (didStartMove || Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) <= 4) {
        return;
      }

      didStartMove = true;
      teardown();
      setSelectedElementIds([targetId]);
      setPreselectedElementId((currentId) => (currentId === targetId ? currentId : targetId));
      onBeginPointerMove?.(targetId, startX, startY, {
        sourceWindow,
        toStagePoint: (clientX, clientY) => ({
          x: iframeRect.left + clientX / iframeScaleX,
          y: iframeRect.top + clientY / iframeScaleY,
        }),
      });
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
    };
    const onMouseUp = () => {
      teardown();
    };

    sourceWindow.addEventListener("mousemove", onMouseMove);
    sourceWindow.addEventListener("mouseup", onMouseUp);
  };

  node.ondblclick = (event) => {
    const scopedTextTarget =
      getEditableTextTargetFromPoint(
        node.ownerDocument,
        { x: event.clientX, y: event.clientY },
        activeGroupScopeIdRef.current
      ) ??
      getEditableSelectionTargetInScope(event.target as Element, activeGroupScopeIdRef.current);
    const scopedTextId = scopedTextTarget?.getAttribute(SELECTOR_ATTR);
    if (scopedTextId && isElementLocked?.(scopedTextId)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (scopedTextTarget?.getAttribute("data-editable") === "text" && scopedTextId) {
      event.preventDefault();
      event.stopPropagation();
      beginTextEditing(scopedTextId);
      return;
    }

    const elementId = node.getAttribute(SELECTOR_ATTR);
    const activeEditing = textEditingRef.current;
    if (elementId && isPersistedGroupNode(node)) {
      event.preventDefault();
      event.stopPropagation();
      beginGroupEditingScope(elementId);
      return;
    }

    if (node.getAttribute("data-editable") !== "text") {
      return;
    }

    if (
      elementId &&
      activeEditing &&
      activeEditing.slideId === activeSlide.id &&
      activeEditing.elementId === elementId
    ) {
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (elementId) {
      beginTextEditing(elementId);
    }
  };
}

export { useIframeTextDocumentEvents };
