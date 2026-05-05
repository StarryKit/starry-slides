import { SELECTOR_ATTR } from "../../core";

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

export function getEditableSelectionTarget(target: Element): HTMLElement | null {
  return target.closest<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`);
}

export function ensureEditingTextStyle(doc: Document): void {
  if (doc.getElementById(EDITING_TEXT_STYLE_ID)) {
    return;
  }

  const style = doc.createElement("style");
  style.id = EDITING_TEXT_STYLE_ID;
  style.textContent = EDITING_TEXT_STYLE;
  doc.head.appendChild(style);
}

export function selectEditableNodeEnd(editableNode: HTMLElement): void {
  const selection = editableNode.ownerDocument.getSelection();
  const range = editableNode.ownerDocument.createRange();
  range.selectNodeContents(editableNode);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}
