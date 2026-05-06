import { useCallback } from "react";
import type { EditableElement, SlideModel } from "../../core";
import {
  SELECTOR_ATTR,
  captureElementLayoutStyleSnapshot,
  composeTransform,
  parseTransformParts,
  querySlideElement,
} from "../../core";

interface GroupOperationsOptions {
  activeSlide: SlideModel | undefined;
  selectedElementIds: string[];
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onCommitOperation: (operation: unknown) => void;
}

interface GroupOperationsResult {
  groupElements: () => void;
  ungroupElement: (groupId: string) => void;
  canGroup: boolean;
  canUngroup: (elementId: string) => boolean;
}

function useGroupOperations({
  activeSlide,
  selectedElementIds,
  iframeRef,
  onCommitOperation,
}: GroupOperationsOptions): GroupOperationsResult {
  const groupElements = useCallback(() => {
    if (!activeSlide || selectedElementIds.length < 2) return;

    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const rootNode = doc.querySelector<HTMLElement>(activeSlide.rootSelector);
    if (!rootNode) return;

    // Gather the DOM nodes for selected elements
    const nodes: Array<{ id: string; node: HTMLElement }> = [];
    for (const id of selectedElementIds) {
      const node = querySlideElement<HTMLElement>(doc, id);
      if (node) nodes.push({ id, node });
    }
    if (nodes.length < 2) return;

    // Calculate bounding box of all selected elements in stage coordinates
    const rootRect = rootNode.getBoundingClientRect();
    const rects = nodes.map(({ node }) => node.getBoundingClientRect());
    const minLeft = Math.min(...rects.map((r) => r.left));
    const minTop = Math.min(...rects.map((r) => r.top));
    const maxRight = Math.max(...rects.map((r) => r.right));
    const maxBottom = Math.max(...rects.map((r) => r.bottom));
    const groupRect = {
      x: minLeft - rootRect.left,
      y: minTop - rootRect.top,
      width: maxRight - minLeft,
      height: maxBottom - minTop,
    };

    // Create group container
    const groupContainer = doc.createElement("div");
    const groupId = `group-${Date.now()}`;
    groupContainer.setAttribute(SELECTOR_ATTR, groupId);
    groupContainer.setAttribute("data-editable", "block");
    groupContainer.setAttribute("data-group", "true");
    groupContainer.style.position = "relative";
    groupContainer.style.left = `${groupRect.x}px`;
    groupContainer.style.top = `${groupRect.y}px`;
    groupContainer.style.width = `${groupRect.width}px`;
    groupContainer.style.height = `${groupRect.height}px`;

    // Insert group container before the first selected element in DOM order
    const firstNode = nodes[0].node;
    firstNode.parentElement?.insertBefore(groupContainer, firstNode);

    // Move elements into group, adjusting positions to be relative to group
    const operations: unknown[] = [];
    for (const { id, node } of nodes) {
      const nodeRect = node.getBoundingClientRect();
      const relativeX = nodeRect.left - minLeft;
      const relativeY = nodeRect.top - minTop;

      const snapshot = captureElementLayoutStyleSnapshot(node);
      const transformParts = parseTransformParts(snapshot.transform);

      // Set position relative to group container
      node.style.position = "absolute";
      node.style.left = `${relativeX}px`;
      node.style.top = `${relativeY}px`;
      node.style.transform = composeTransform(
        transformParts.translateX,
        transformParts.translateY,
        transformParts.rotate
      );

      groupContainer.appendChild(node);

      operations.push({
        type: "element.layout.update" as const,
        slideId: activeSlide.id,
        elementId: id,
        previousStyle: snapshot,
        nextStyle: captureElementLayoutStyleSnapshot(node),
        timestamp: Date.now(),
      });
    }

    // Commit as batch operation
    if (operations.length > 0) {
      onCommitOperation({
        type: "operation.batch" as const,
        slideId: activeSlide.id,
        operations,
        timestamp: Date.now(),
      });
    }
  }, [activeSlide, selectedElementIds, iframeRef, onCommitOperation]);

  const ungroupElement = useCallback(
    (groupId: string) => {
      if (!activeSlide) return;

      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;

      const rootNode = doc.querySelector<HTMLElement>(activeSlide.rootSelector);
      if (!rootNode) return;

      const groupNode = querySlideElement<HTMLElement>(doc, groupId);
      if (!groupNode || groupNode.getAttribute("data-group") !== "true") return;

      const groupRect = groupNode.getBoundingClientRect();
      const rootRect = rootNode.getBoundingClientRect();
      const groupOffsetX = groupRect.left - rootRect.left;
      const groupOffsetY = groupRect.top - rootRect.top;

      const children = Array.from(groupNode.children) as HTMLElement[];
      const parent = groupNode.parentElement;
      if (!parent) return;

      const operations: unknown[] = [];
      const insertBefore = groupNode.nextSibling;

      for (const child of children) {
        const childId = child.getAttribute(SELECTOR_ATTR);
        if (!childId) continue;

        const snapshot = captureElementLayoutStyleSnapshot(child);

        // Convert child position from group-relative to slide-relative
        const childLeft = parseFloat(child.style.left || "0");
        const childTop = parseFloat(child.style.top || "0");
        const transformParts = parseTransformParts(snapshot.transform);

        child.style.position = "absolute";
        child.style.left = `${groupOffsetX + childLeft}px`;
        child.style.top = `${groupOffsetY + childTop}px`;
        child.style.transform = composeTransform(
          transformParts.translateX,
          transformParts.translateY,
          transformParts.rotate
        );

        // Insert child back into parent at group position
        if (insertBefore) {
          parent.insertBefore(child, insertBefore);
        } else {
          parent.appendChild(child);
        }

        operations.push({
          type: "element.layout.update" as const,
          slideId: activeSlide.id,
          elementId: childId,
          previousStyle: snapshot,
          nextStyle: captureElementLayoutStyleSnapshot(child),
          timestamp: Date.now(),
        });
      }

      // Remove the group container
      groupNode.remove();

      if (operations.length > 0) {
        onCommitOperation({
          type: "operation.batch" as const,
          slideId: activeSlide.id,
          operations,
          timestamp: Date.now(),
        });
      }
    },
    [activeSlide, iframeRef, onCommitOperation]
  );

  const canGroup = selectedElementIds.length >= 2;

  const canUngroup = useCallback(
    (elementId: string): boolean => {
      if (!activeSlide) return false;
      const element = activeSlide.elements.find((e) => e.id === elementId);
      return element?.type === "group";
    },
    [activeSlide]
  );

  return { groupElements, ungroupElement, canGroup, canUngroup };
}

export { useGroupOperations };
