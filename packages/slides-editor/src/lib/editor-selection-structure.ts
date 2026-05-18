import { SELECTOR_ATTR, isPersistedGroupNode, querySlideElement } from "@starrykit/slides-core";

export function hasDirectEditableChildren(html: string, elementId: string): boolean {
  if (typeof DOMParser === "undefined") {
    return false;
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const node = querySlideElement<HTMLElement>(doc, elementId);
  if (!node || node.getAttribute("data-editable") !== "block") {
    return false;
  }

  return Array.from(node.children).some(
    (child) =>
      child instanceof HTMLElement &&
      (child.hasAttribute("data-editable") || isListWrapperWithEditableItems(child))
  );
}

export function createStructuralListIdMap(
  doc: Document,
  flattenRootElementId: string | undefined
): Map<Element, string> {
  const result = new Map<Element, string>();
  if (!flattenRootElementId) {
    return result;
  }

  const flattenRoot = querySlideElement<HTMLElement>(doc, flattenRootElementId);
  if (!flattenRoot || isPersistedGroupNode(flattenRoot)) {
    return result;
  }

  const existingIds = new Set(
    Array.from(doc.querySelectorAll<HTMLElement>(`[${SELECTOR_ATTR}]`))
      .map((node) => node.getAttribute(SELECTOR_ATTR))
      .filter((value): value is string => Boolean(value))
  );
  const nextUniqueId = (preferredId: string) => {
    if (!existingIds.has(preferredId)) {
      existingIds.add(preferredId);
      return preferredId;
    }

    const match = preferredId.match(/^(.*?)(?:-(\d+))?$/);
    const base = match?.[1] || preferredId;
    let index = Number.parseInt(match?.[2] || "1", 10) + 1;

    while (existingIds.has(`${base}-${index}`)) {
      index += 1;
    }

    const elementId = `${base}-${index}`;
    existingIds.add(elementId);
    return elementId;
  };

  for (const child of Array.from(flattenRoot.children)) {
    if (isListWrapperWithEditableItems(child)) {
      result.set(child, child.getAttribute(SELECTOR_ATTR) || nextUniqueId("block-1"));
    }
  }

  return result;
}

export function isListWrapperWithEditableItems(node: Element): node is HTMLElement {
  const tagName = node.tagName.toLowerCase();
  if (tagName !== "ul" && tagName !== "ol") {
    return false;
  }

  return Array.from(node.children).some(
    (child) => child.tagName.toLowerCase() === "li" && child.hasAttribute("data-editable")
  );
}

export function getScopedTextTargetAtPoint(
  doc: Document,
  activeGroupScopeId: string,
  point: { x: number; y: number }
): HTMLElement | null {
  const activeGroup = querySlideElement<HTMLElement>(doc, activeGroupScopeId);
  if (!activeGroup) {
    return null;
  }

  const directTarget = doc.elementFromPoint(point.x, point.y);
  const directText = directTarget?.closest<HTMLElement>(`[data-editable="text"][${SELECTOR_ATTR}]`);
  if (directText && activeGroup.contains(directText)) {
    return directText;
  }

  const candidates = Array.from(
    activeGroup.querySelectorAll<HTMLElement>(`[data-editable="text"][${SELECTOR_ATTR}]`)
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
