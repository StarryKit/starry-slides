import type { SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SELECTOR_ATTR, getSlideElementSelector, querySlideElement } from "../../core";
import {
  clearSelectionForEscape,
  ensureSelectionContainsTarget,
  nextSingleSelection,
} from "./iframe-editing-session";
import {
  applyGroupScopeFocus,
  ensureEditingTextStyle,
  getDeepestEditableElementFromPoint,
  getEditableSelectionTargetInScope,
  selectEditableNodeEnd,
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
  onOpenSelectionContextMenu,
  onStageWheel,
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
  const onStageWheelRef = useRef(onStageWheel);
  const selectedElementId = selectedElementIds[selectedElementIds.length - 1] ?? null;

  onStageWheelRef.current = onStageWheel;

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

  const beginGroupEditingScope = useCallback((elementId: string) => {
    setActiveGroupScopeId(elementId);
    activeGroupScopeIdRef.current = elementId;
    setSelectedElementIds([elementId]);
  }, []);

  const exitGroupEditingScope = useCallback(() => {
    const groupElementId = activeGroupScopeIdRef.current;
    activeGroupScopeIdRef.current = null;
    setActiveGroupScopeId(null);
    setSelectedElementIds(groupElementId ? [groupElementId] : []);
  }, []);

  const clearSelection = useCallback(() => {
    if (textEditingRef.current) {
      setSelectedElementIds((currentIds) => {
        if (!currentIds.length) {
          return currentIds;
        }
        return [];
      });
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
    if (!activeSlide || !textEditing || textEditing.slideId === activeSlide.id) {
      return;
    }

    setTextEditing(null);
  }, [activeSlide, textEditing]);

  commitTextEditRef.current = commitTextEdit;
  cancelTextEditRef.current = cancelTextEdit;
  useEffect(() => {
    if (!activeSlide) {
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const doc = iframe.contentDocument;
    if (!doc) {
      return;
    }

    doc.open();
    doc.write(activeSlide.htmlSource);
    doc.close();

    ensureEditingTextStyle(doc);
    applyGroupScopeFocus(doc, activeGroupScopeIdRef.current);

    const commitNodeText = (node: HTMLElement) => {
      const elementId = node.getAttribute(SELECTOR_ATTR);
      if (!elementId) {
        return;
      }

      commitTextEditRef.current(elementId, node.textContent || "");
    };

    doc.onclick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        if (textEditingRef.current) {
          const editingNode = querySlideElement<HTMLElement>(doc, textEditingRef.current.elementId);
          if (editingNode) {
            commitNodeText(editingNode);
            setSelectedElementIds([]);
            return;
          }
        }

        setSelectedElementIds([]);
        return;
      }

      const activeEditing = textEditingRef.current;
      if (activeEditing) {
        clearPreselection();
        const editingNode = querySlideElement<HTMLElement>(doc, activeEditing.elementId);

        if (editingNode && !editingNode.contains(target)) {
          commitNodeText(editingNode);
          setSelectedElementIds([]);
          return;
        }

        return;
      }

      const editableTarget = getEditableSelectionTargetInScope(
        target,
        activeGroupScopeIdRef.current
      );
      if (!editableTarget) {
        if (!activeGroupScopeIdRef.current) {
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

    const onWheel = (event: WheelEvent) => {
      onStageWheelRef.current?.(event);
    };
    doc.addEventListener("wheel", onWheel, { passive: false });
    const onDocumentDoubleClick = (event: MouseEvent) => {
      const scopedTextTarget = getEditableTextTargetFromEvent(event, activeGroupScopeIdRef.current);
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

    const nodes = Array.from(
      doc.querySelectorAll<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`)
    );
    for (const node of nodes) {
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
            setSelectedElementIds((currentIds) =>
              ensureSelectionContainsTarget(currentIds, targetId)
            );
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
        if (!targetId) {
          return;
        }

        const iframeRect = iframe.getBoundingClientRect();
        const iframeScaleX = iframeRect.width > 0 ? iframe.clientWidth / iframeRect.width : 1;
        const iframeScaleY = iframeRect.height > 0 ? iframe.clientHeight / iframeRect.height : 1;

        const toStagePoint = (clientX: number, clientY: number) => ({
          x: iframeRect.left + clientX / iframeScaleX,
          y: iframeRect.top + clientY / iframeScaleY,
        });

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
          if (didStartMove) {
            return;
          }

          if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) <= 4) {
            return;
          }

          didStartMove = true;
          teardown();
          setSelectedElementIds([targetId]);
          setPreselectedElementId(targetId);
          onBeginPointerMove?.(targetId, startX, startY, {
            sourceWindow,
            toStagePoint,
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
          getEditableTextTargetFromEvent(event, activeGroupScopeIdRef.current) ??
          getEditableSelectionTargetInScope(event.target as Element, activeGroupScopeIdRef.current);
        if (scopedTextTarget?.getAttribute("data-editable") === "text") {
          const scopedTextId = scopedTextTarget.getAttribute(SELECTOR_ATTR);
          if (scopedTextId) {
            event.preventDefault();
            event.stopPropagation();
            beginTextEditing(scopedTextId);
            return;
          }
        }

        const elementId = node.getAttribute(SELECTOR_ATTR);
        const activeEditing = textEditingRef.current;

        if (elementId && node.getAttribute("data-group") === "true") {
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

    return () => {
      doc.removeEventListener("wheel", onWheel);
      doc.removeEventListener("dblclick", onDocumentDoubleClick, true);
    };
  }, [
    activeSlide,
    beginGroupEditingScope,
    beginTextEditing,
    clearPreselection,
    iframeRef,
    onBeginPointerMove,
    openPointerSelectionContextMenu,
  ]);

  function getEditableTextTargetFromEvent(
    event: MouseEvent,
    activeScopeId: string | null
  ): HTMLElement | null {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      return null;
    }

    const candidates = Array.from(
      doc.querySelectorAll<HTMLElement>(`[data-editable="text"][${SELECTOR_ATTR}]`)
    ).filter(
      (candidate) => getEditableSelectionTargetInScope(candidate, activeScopeId) === candidate
    );
    const directHit = candidates.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    });

    if (directHit) {
      return directHit;
    }

    const nearest = candidates
      .map((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const clampedX = Math.min(Math.max(event.clientX, rect.left), rect.right);
        const clampedY = Math.min(Math.max(event.clientY, rect.top), rect.bottom);
        return {
          candidate,
          distance: Math.hypot(event.clientX - clampedX, event.clientY - clampedY),
        };
      })
      .sort((left, right) => left.distance - right.distance)[0];

    return nearest && nearest.distance <= 24 ? nearest.candidate : null;
  }

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      applyGroupScopeFocus(doc, activeGroupScopeId);
    }
  }, [activeGroupScopeId, iframeRef]);

  useEffect(() => {
    const editing = textEditing;
    if (!editing || !activeSlide || editing.slideId !== activeSlide.id) {
      return;
    }

    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) {
      return;
    }

    const editableNode = doc.querySelector<HTMLElement>(getSlideElementSelector(editing.elementId));
    if (!editableNode) {
      return;
    }

    const commitNodeText = () => {
      commitTextEditRef.current(editing.elementId, editableNode.textContent || "");
    };
    let preserveSelectionOnClick = false;
    const originalInlineDisplay = editableNode.style.display;
    const originalInlineAlignItems = editableNode.style.alignItems;
    const originalInlineOverflow = editableNode.style.overflow;
    const originalInlineCursor = editableNode.style.cursor;
    const originalOnBlur = editableNode.onblur;
    const originalOnClick = editableNode.onclick;
    const originalOnKeyDown = editableNode.onkeydown;
    const originalOnMouseDown = editableNode.onmousedown;
    const originalOnMouseUp = editableNode.onmouseup;
    const computedStyles = editableNode.ownerDocument.defaultView?.getComputedStyle(editableNode);
    const computedDisplay = computedStyles?.display ?? "";

    editableNode.setAttribute("contenteditable", "plaintext-only");
    editableNode.setAttribute("spellcheck", "false");
    editableNode.setAttribute("data-hse-editing", "true");
    editableNode.style.cursor = "text";
    editableNode.style.overflow = "visible";

    if (computedDisplay === "inline-flex") {
      editableNode.style.display = "inline-block";
      editableNode.style.alignItems = "normal";
    } else if (
      computedDisplay === "flex" ||
      computedDisplay === "grid" ||
      computedDisplay === "inline-grid"
    ) {
      editableNode.style.display = "block";
      editableNode.style.alignItems = "normal";
    }

    editableNode.focus();

    selectEditableNodeEnd(editableNode);

    editableNode.onkeydown = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        commitNodeText();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelTextEditRef.current();
      }
    };

    editableNode.onmousedown = () => {
      preserveSelectionOnClick = false;
    };

    editableNode.onmouseup = () => {
      const nextSelection = editableNode.ownerDocument.getSelection();
      const anchorNode = nextSelection?.anchorNode;
      const focusNode = nextSelection?.focusNode;
      const containsAnchor = anchorNode ? editableNode.contains(anchorNode) : false;
      const containsFocus = focusNode ? editableNode.contains(focusNode) : false;

      preserveSelectionOnClick = Boolean(
        nextSelection && !nextSelection.isCollapsed && containsAnchor && containsFocus
      );
    };

    editableNode.onclick = (event) => {
      event.stopPropagation();

      if (preserveSelectionOnClick) {
        event.preventDefault();
        preserveSelectionOnClick = false;
      }
    };

    editableNode.onblur = () => {
      window.setTimeout(() => {
        if (textEditingRef.current?.elementId !== editing.elementId) {
          return;
        }

        const nextSelection = editableNode.ownerDocument.getSelection();
        const anchorNode = nextSelection?.anchorNode;
        const focusNode = nextSelection?.focusNode;
        const activeElement = editableNode.ownerDocument.activeElement;
        const selectionStaysInside =
          Boolean(nextSelection && !nextSelection.isCollapsed) &&
          Boolean(anchorNode && editableNode.contains(anchorNode)) &&
          Boolean(focusNode && editableNode.contains(focusNode));

        if (activeElement === editableNode || selectionStaysInside) {
          return;
        }

        commitNodeText();
      }, 0);
    };

    return () => {
      editableNode.ownerDocument.getSelection()?.removeAllRanges();
      if (editableNode.ownerDocument.activeElement === editableNode) {
        editableNode.blur();
      }

      editableNode.removeAttribute("contenteditable");
      editableNode.removeAttribute("spellcheck");
      editableNode.removeAttribute("data-hse-editing");
      editableNode.style.cursor = originalInlineCursor;
      editableNode.style.display = originalInlineDisplay;
      editableNode.style.alignItems = originalInlineAlignItems;
      editableNode.style.overflow = originalInlineOverflow;
      editableNode.onblur = originalOnBlur;
      editableNode.onclick = originalOnClick;
      editableNode.onkeydown = originalOnKeyDown;
      editableNode.onmousedown = originalOnMouseDown;
      editableNode.onmouseup = originalOnMouseUp;
    };
  }, [activeSlide, iframeRef, textEditing]);

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
