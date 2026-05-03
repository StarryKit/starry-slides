import type { SlideModel, TextUpdateOperation } from "@starry-slide/core";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface TextEditingState {
  slideId: string;
  elementId: string;
  initialText: string;
}

interface UseIframeTextEditingOptions {
  activeSlide: SlideModel | undefined;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  canUndo: boolean;
  canRedo: boolean;
  onCommitOperation: (operation: TextUpdateOperation) => void;
  onUndo: () => void;
  onRedo: () => void;
}

interface UseIframeTextEditingResult {
  selectedElementId: string | null;
  isEditingText: boolean;
  setSelectedElementId: Dispatch<SetStateAction<string | null>>;
  beginTextEditing: (elementId: string) => void;
  clearSelection: () => void;
}

const EDITING_TEXT_STYLE_ID = "hse-editing-text-style";
const EDITING_TEXT_STYLE = `
[data-hse-editing="true"] {
  outline: none !important;
  box-shadow: none !important;
  overflow: visible;
  caret-color: currentColor;
  white-space: pre-wrap;
  user-select: text;
  -webkit-user-select: text;
}

[data-hse-editing="true"]:focus,
[data-hse-editing="true"]:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
`;

function useIframeTextEditing({
  activeSlide,
  iframeRef,
  canUndo,
  canRedo,
  onCommitOperation,
  onUndo,
  onRedo,
}: UseIframeTextEditingOptions): UseIframeTextEditingResult {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [textEditing, setTextEditing] = useState<TextEditingState | null>(null);
  const textEditingRef = useRef<TextEditingState | null>(null);
  const commitTextEditRef = useRef<(elementId: string, nextText: string) => void>(() => {});
  const cancelTextEditRef = useRef<() => void>(() => {});
  const runUndoRef = useRef<() => void>(() => {});
  const runRedoRef = useRef<() => void>(() => {});

  const beginTextEditing = useCallback(
    (elementId: string) => {
      if (!activeSlide) {
        return;
      }

      const doc = iframeRef.current?.contentDocument;
      const node = doc?.querySelector<HTMLElement>(`[data-editor-id="${elementId}"]`);
      if (!node || node.getAttribute("data-editable") !== "text") {
        return;
      }

      const nextEditingState = {
        slideId: activeSlide.id,
        elementId,
        initialText: node.textContent || "",
      };

      setSelectedElementId(elementId);
      textEditingRef.current = nextEditingState;
      setTextEditing(nextEditingState);
    },
    [activeSlide, iframeRef]
  );

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
      const editableNode = doc.querySelector<HTMLElement>(
        `[data-editor-id="${editing.elementId}"]`
      );

      if (editableNode) {
        editableNode.textContent = editing.initialText;
      }
    }

    textEditingRef.current = null;
    setTextEditing(null);
  }

  function runUndo() {
    textEditingRef.current = null;
    onUndo();
    setTextEditing(null);
  }

  function runRedo() {
    textEditingRef.current = null;
    onRedo();
    setTextEditing(null);
  }

  useEffect(() => {
    textEditingRef.current = textEditing;
  }, [textEditing]);

  useEffect(() => {
    if (!activeSlide || !textEditing || textEditing.slideId === activeSlide.id) {
      return;
    }

    setTextEditing(null);
  }, [activeSlide, textEditing]);

  commitTextEditRef.current = commitTextEdit;
  cancelTextEditRef.current = cancelTextEdit;
  runUndoRef.current = runUndo;
  runRedoRef.current = runRedo;

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

    if (!doc.getElementById(EDITING_TEXT_STYLE_ID)) {
      const style = doc.createElement("style");
      style.id = EDITING_TEXT_STYLE_ID;
      style.textContent = EDITING_TEXT_STYLE;
      doc.head.appendChild(style);
    }

    const commitNodeText = (node: HTMLElement) => {
      const elementId = node.getAttribute("data-editor-id");
      if (!elementId) {
        return;
      }

      commitTextEditRef.current(elementId, node.textContent || "");
    };

    doc.onclick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        if (textEditingRef.current) {
          const editingNode = doc.querySelector<HTMLElement>(
            `[data-editor-id="${textEditingRef.current.elementId}"]`
          );
          if (editingNode) {
            commitNodeText(editingNode);
            return;
          }
        }

        setSelectedElementId(null);
        return;
      }

      const activeEditing = textEditingRef.current;
      if (activeEditing) {
        const editingNode = doc.querySelector<HTMLElement>(
          `[data-editor-id="${activeEditing.elementId}"]`
        );

        if (editingNode && !editingNode.contains(target)) {
          commitNodeText(editingNode);
          return;
        }

        return;
      }

      const editableTarget = target.closest<HTMLElement>("[data-editable][data-editor-id]");
      if (!editableTarget) {
        setSelectedElementId(null);
        return;
      }

      const id = editableTarget.getAttribute("data-editor-id");
      if (id) {
        setSelectedElementId(id);
      }
    };

    const nodes = Array.from(doc.querySelectorAll<HTMLElement>("[data-editable][data-editor-id]"));
    for (const node of nodes) {
      node.style.cursor = "pointer";
      node.ondblclick = null;
      node.onblur = null;
      node.onkeydown = null;
      node.onclick = (event) => {
        event.stopPropagation();

        if (textEditingRef.current?.elementId === node.getAttribute("data-editor-id")) {
          return;
        }

        const id = node.getAttribute("data-editor-id");
        if (id) {
          setSelectedElementId(id);
        }
      };

      if (node.getAttribute("data-editable") !== "text") {
        continue;
      }

      node.ondblclick = (event) => {
        const elementId = node.getAttribute("data-editor-id");
        const activeEditing = textEditingRef.current;

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
        beginTextEditing(elementId);
      };
    }
  }, [activeSlide, beginTextEditing, iframeRef]);

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

    const editableNode = doc.querySelector<HTMLElement>(`[data-editor-id="${editing.elementId}"]`);
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

    const selection = editableNode.ownerDocument.getSelection();
    const range = editableNode.ownerDocument.createRange();
    range.selectNodeContents(editableNode);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);

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
      editableNode.removeAttribute("contenteditable");
      editableNode.removeAttribute("spellcheck");
      editableNode.removeAttribute("data-hse-editing");
      editableNode.style.cursor = "pointer";
      editableNode.style.display = originalInlineDisplay;
      editableNode.style.alignItems = originalInlineAlignItems;
      editableNode.style.overflow = originalInlineOverflow;
      editableNode.onblur = null;
      editableNode.onclick = null;
      editableNode.onkeydown = null;
      editableNode.onmousedown = null;
      editableNode.onmouseup = null;
    };
  }, [activeSlide, iframeRef, textEditing]);

  useEffect(() => {
    // The iframe document is rewritten after commits, undo, and redo.
    // Rebind shortcuts whenever the rendered slide HTML changes so keyboard
    // events continue to reach the current iframe document.
    const activeDocumentMarkup = activeSlide?.htmlSource;
    if (!activeDocumentMarkup) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const isUndo =
        (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z";
      const isRedo =
        (event.metaKey || event.ctrlKey) &&
        ((event.shiftKey && event.key.toLowerCase() === "z") || event.key.toLowerCase() === "y");

      if (textEditingRef.current) {
        return;
      }

      if (isUndo && canUndo) {
        event.preventDefault();
        event.stopPropagation();
        runUndoRef.current();
        return;
      }

      if (isRedo && canRedo) {
        event.preventDefault();
        event.stopPropagation();
        runRedoRef.current();
      }
    };

    const iframeDocument = iframeRef.current?.contentDocument;
    window.addEventListener("keydown", onKeyDown);
    iframeDocument?.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      iframeDocument?.removeEventListener("keydown", onKeyDown);
    };
  }, [activeSlide?.htmlSource, canRedo, canUndo, iframeRef]);

  return {
    selectedElementId,
    isEditingText: Boolean(activeSlide && textEditing?.slideId === activeSlide.id),
    setSelectedElementId,
    beginTextEditing,
    clearSelection: () => {
      if (!textEditingRef.current) {
        setSelectedElementId(null);
      }
    },
  };
}

export { useIframeTextEditing };
