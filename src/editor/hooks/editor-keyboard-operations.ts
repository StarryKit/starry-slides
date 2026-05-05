import type { AtomicSlideOperation, EditableElement, SlideOperation } from "../../core";

export const ARROW_DELTAS: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

export function isEditableElementTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]'
    )
  );
}

export function isLayoutEditable(element: EditableElement | undefined): boolean {
  return element?.type === "block" || element?.type === "text";
}

export function getShortcutStep(event: KeyboardEvent): number {
  if (event.altKey) {
    return 1;
  }

  if (event.shiftKey) {
    return 10;
  }

  return 5;
}

export function createIdMapForCopiedElement(
  html: string,
  sourceElementId: string,
  nextElementId: string
) {
  const idMap: Record<string, string> = {
    [sourceElementId]: nextElementId,
  };

  if (typeof DOMParser === "undefined") {
    return idMap;
  }

  const doc = new DOMParser().parseFromString(`<template>${html}</template>`, "text/html");
  const root = doc.querySelector("template")?.content.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    return idMap;
  }

  for (const node of root.querySelectorAll<HTMLElement>("[data-editor-id]")) {
    const currentId = node.getAttribute("data-editor-id");
    if (currentId) {
      idMap[currentId] = `${nextElementId}-${currentId}`;
    }
  }

  return idMap;
}

export function commitOperations(
  slideId: string,
  operations: AtomicSlideOperation[],
  onCommitOperation: (operation: SlideOperation) => void
) {
  if (!operations.length) {
    return false;
  }

  onCommitOperation(
    operations.length === 1
      ? operations[0]
      : {
          type: "operation.batch",
          slideId,
          operations,
          timestamp: Date.now(),
        }
  );
  return true;
}
