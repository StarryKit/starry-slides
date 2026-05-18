import { SELECTOR_ATTR, isPersistedGroupNode } from "@starrykit/slides-core";

const EDITING_TEXT_STYLE_ID = "hse-editing-text-style";
const EDITING_TEXT_STYLE = `
html:not([data-hse-allow-native-selection]),
html:not([data-hse-allow-native-selection]) body,
html:not([data-hse-allow-native-selection]) [data-editable] {
  user-select: none;
  -webkit-user-select: none;
}

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

function isElementNode(node: Node | null | undefined): node is Element {
  return Boolean(node && node.nodeType === 1);
}

function isStructuralGroupNode(node: HTMLElement | null): node is HTMLElement {
  return Boolean(
    node &&
      node.getAttribute("data-editable") === "block" &&
      Array.from(node.children).some((child) => {
        if (!isElementNode(child) || !child.hasAttribute("data-editable")) {
          return false;
        }

        const editableType = child.getAttribute("data-editable");
        return (
          editableType === "text" ||
          editableType === "image" ||
          (editableType === "block" &&
            Array.from(child.children).some(
              (grandchild) => isElementNode(grandchild) && grandchild.hasAttribute("data-editable")
            ))
        );
      })
  );
}

function getPersistedStructuralGroupAncestor(node: HTMLElement | null): HTMLElement | null {
  let current: HTMLElement | null = node;
  while (current) {
    if (isPersistedGroupNode(current) && isStructuralGroupNode(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

export function getEditableSelectionTarget(target: Element): HTMLElement | null {
  return target.closest<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`);
}

export function getDeepestEditableElementFromPoint(
  doc: Document,
  x: number,
  y: number,
  activeGroupScopeId: string | null
): HTMLElement | null {
  const pointedElement = doc.elementFromPoint(x, y);
  if (!pointedElement) {
    return null;
  }

  return getEditableSelectionTargetInScope(pointedElement, activeGroupScopeId);
}

export function getOutermostSelectedAncestorFromPoint(
  doc: Document,
  x: number,
  y: number,
  activeGroupScopeId: string | null,
  selectedElementIds: string[]
): HTMLElement | null {
  const pointedElement = doc.elementFromPoint(x, y);
  if (!pointedElement) {
    return null;
  }

  const editableTarget = getEditableSelectionTargetInScope(pointedElement, activeGroupScopeId);
  if (!editableTarget) {
    return null;
  }

  const selectedIdSet = new Set(selectedElementIds);
  let current: HTMLElement | null = editableTarget;
  let selectedAncestor: HTMLElement | null = null;

  while (current) {
    const currentId = current.getAttribute(SELECTOR_ATTR);
    if (
      current.matches(`[data-editable][${SELECTOR_ATTR}]`) &&
      currentId &&
      selectedIdSet.has(currentId)
    ) {
      selectedAncestor = current;
    }
    current = current.parentElement;
  }

  return selectedAncestor;
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
  const groupCandidate = doc.querySelector<HTMLElement>(
    `[data-editable="block"][${SELECTOR_ATTR}="${activeGroupScopeId}"]`
  );
  const group = isStructuralGroupNode(groupCandidate) ? groupCandidate : null;
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
    const structuralGroupTarget = getPersistedStructuralGroupAncestor(editableTarget);
    return structuralGroupTarget ?? editableTarget;
  }

  const activeGroupCandidate = editableTarget.closest<HTMLElement>(
    `[data-editable="block"][${SELECTOR_ATTR}="${activeGroupScopeId}"]`
  );
  const activeGroup =
    activeGroupCandidate &&
    isPersistedGroupNode(activeGroupCandidate) &&
    isStructuralGroupNode(activeGroupCandidate)
      ? activeGroupCandidate
      : null;

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

export function setNativeTextSelectionEnabled(doc: Document, enabled: boolean): void {
  doc.documentElement.toggleAttribute("data-hse-allow-native-selection", enabled);
}

export function selectEditableNodeEnd(editableNode: HTMLElement): void {
  const selection = editableNode.ownerDocument.getSelection();
  const range = editableNode.ownerDocument.createRange();
  range.selectNodeContents(editableNode);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function getEditableTextTargetFromPoint(
  doc: Document,
  point: { x: number; y: number },
  activeScopeId: string | null
): HTMLElement | null {
  const candidates = Array.from(
    doc.querySelectorAll<HTMLElement>(`[data-editable="text"][${SELECTOR_ATTR}]`)
  ).filter(
    (candidate) => getEditableSelectionTargetInScope(candidate, activeScopeId) === candidate
  );
  const directHit = candidates.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return (
      point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
    );
  });

  if (directHit) {
    return directHit;
  }

  const nearest = candidates
    .map((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const clampedX = Math.min(Math.max(point.x, rect.left), rect.right);
      const clampedY = Math.min(Math.max(point.y, rect.top), rect.bottom);
      return {
        candidate,
        distance: Math.hypot(point.x - clampedX, point.y - clampedY),
      };
    })
    .sort((left, right) => left.distance - right.distance)[0];

  return nearest && nearest.distance <= 24 ? nearest.candidate : null;
}
