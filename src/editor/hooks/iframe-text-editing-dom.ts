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

body[data-hse-group-scope] [data-editable] {
  transition: opacity 120ms ease, filter 120ms ease;
}

body[data-hse-group-scope] [data-editable][data-hse-outside-group-scope="true"] {
  opacity: 0.28;
  filter: blur(1.5px);
}

body[data-hse-group-scope] [data-editable][data-hse-active-group-scope="true"] {
  outline: 1px solid rgba(15, 23, 42, 0.22);
  outline-offset: 4px;
}
`;

export function getEditableSelectionTarget(target: Element): HTMLElement | null {
  return target.closest<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`);
}

export function applyGroupScopeFocus(doc: Document, activeGroupScopeId: string | null): void {
  const editableNodes = Array.from(doc.querySelectorAll<HTMLElement>("[data-editable]"));
  for (const node of editableNodes) {
    node.removeAttribute("data-hse-active-group-scope");
    node.removeAttribute("data-hse-outside-group-scope");
  }

  if (!activeGroupScopeId) {
    doc.body.removeAttribute("data-hse-group-scope");
    return;
  }

  doc.body.setAttribute("data-hse-group-scope", activeGroupScopeId);
  const group = doc.querySelector<HTMLElement>(
    `[data-editable="block"][data-group="true"][${SELECTOR_ATTR}="${activeGroupScopeId}"]`
  );
  if (!group) {
    doc.body.removeAttribute("data-hse-group-scope");
    return;
  }

  group.setAttribute("data-hse-active-group-scope", "true");
  for (const node of editableNodes) {
    if (node !== group && !group.contains(node)) {
      node.setAttribute("data-hse-outside-group-scope", "true");
    }
  }
}

export function getEditableSelectionTargetInScope(
  target: Element,
  activeGroupScopeId: string | null
): HTMLElement | null {
  const editableTarget = getEditableSelectionTarget(target);
  if (!editableTarget) {
    return null;
  }

  if (!activeGroupScopeId) {
    return editableTarget.closest<HTMLElement>(
      `[data-editable="block"][data-group="true"][${SELECTOR_ATTR}]`
    ) ?? editableTarget;
  }

  const activeGroup = editableTarget.closest<HTMLElement>(
    `[data-editable="block"][data-group="true"][${SELECTOR_ATTR}="${activeGroupScopeId}"]`
  );

  return activeGroup ? editableTarget : null;
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
