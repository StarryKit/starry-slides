import { type SlideModel, getSlideElementSelector } from "@starrykit/slides-core";
import { type RefObject, useEffect } from "react";
import { selectEditableNodeEnd } from "./iframe-text-editing-dom";
import type { TextEditingState } from "./iframe-text-editing-types";

function useActiveTextEditingSession({
  activeSlide,
  cancelTextEditRef,
  commitTextEditRef,
  iframeRef,
  textEditing,
  textEditingRef,
}: {
  activeSlide: SlideModel | undefined;
  cancelTextEditRef: RefObject<() => void>;
  commitTextEditRef: RefObject<(elementId: string, nextText: string) => void>;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  textEditing: TextEditingState | null;
  textEditingRef: RefObject<TextEditingState | null>;
}) {
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

    const original = captureEditableNodeState(editableNode);
    let preserveSelectionOnClick = false;
    const computedDisplay =
      editableNode.ownerDocument.defaultView?.getComputedStyle(editableNode).display ?? "";

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

    const commitNodeText = () => {
      commitTextEditRef.current(editing.elementId, editableNode.textContent || "");
    };
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
      preserveSelectionOnClick = hasNonCollapsedSelectionInside(editableNode);
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

        const activeElement = editableNode.ownerDocument.activeElement;
        if (activeElement === editableNode || hasNonCollapsedSelectionInside(editableNode)) {
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

      restoreEditableNodeState(editableNode, original);
    };
  }, [activeSlide, cancelTextEditRef, commitTextEditRef, iframeRef, textEditing, textEditingRef]);
}

function captureEditableNodeState(editableNode: HTMLElement) {
  return {
    alignItems: editableNode.style.alignItems,
    cursor: editableNode.style.cursor,
    display: editableNode.style.display,
    onblur: editableNode.onblur,
    onclick: editableNode.onclick,
    onkeydown: editableNode.onkeydown,
    onmousedown: editableNode.onmousedown,
    onmouseup: editableNode.onmouseup,
    overflow: editableNode.style.overflow,
  };
}

function restoreEditableNodeState(
  editableNode: HTMLElement,
  original: ReturnType<typeof captureEditableNodeState>
) {
  editableNode.removeAttribute("contenteditable");
  editableNode.removeAttribute("spellcheck");
  editableNode.removeAttribute("data-hse-editing");
  editableNode.style.cursor = original.cursor;
  editableNode.style.display = original.display;
  editableNode.style.alignItems = original.alignItems;
  editableNode.style.overflow = original.overflow;
  editableNode.onblur = original.onblur;
  editableNode.onclick = original.onclick;
  editableNode.onkeydown = original.onkeydown;
  editableNode.onmousedown = original.onmousedown;
  editableNode.onmouseup = original.onmouseup;
}

function hasNonCollapsedSelectionInside(editableNode: HTMLElement) {
  const nextSelection = editableNode.ownerDocument.getSelection();
  const anchorNode = nextSelection?.anchorNode;
  const focusNode = nextSelection?.focusNode;
  return Boolean(
    nextSelection &&
      !nextSelection.isCollapsed &&
      anchorNode &&
      editableNode.contains(anchorNode) &&
      focusNode &&
      editableNode.contains(focusNode)
  );
}

export { useActiveTextEditingSession };
