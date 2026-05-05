import {
  type AtomicSlideOperation,
  ELEMENT_LAYOUT_STYLE_KEYS,
  type ElementLayoutStyleSnapshot,
  type ElementLayoutUpdateOperation,
  captureElementLayoutStyleSnapshot,
} from "../../core";
import type { ManipulationSession } from "./block-manipulation-types";

export function applyLayoutSnapshot(node: HTMLElement, snapshot: ElementLayoutStyleSnapshot): void {
  for (const key of ELEMENT_LAYOUT_STYLE_KEYS) {
    node.style[key] = snapshot[key] ?? "";
  }
}

export function createLayoutUpdateOperations(
  session: ManipulationSession
): ElementLayoutUpdateOperation[] {
  return session.elementIds
    .map((elementId) => {
      const node = session.targetNodes[elementId];
      const previousStyle = session.previousStyles[elementId];
      if (!node || !previousStyle) {
        return null;
      }

      const nextStyle = captureElementLayoutStyleSnapshot(node);
      if (JSON.stringify(nextStyle) === JSON.stringify(previousStyle)) {
        return null;
      }

      return {
        type: "element.layout.update" as const,
        slideId: session.slideId,
        elementId,
        previousStyle,
        nextStyle,
        timestamp: Date.now(),
      };
    })
    .filter((operation): operation is ElementLayoutUpdateOperation => Boolean(operation));
}

export function toLayoutCommitOperation(
  session: ManipulationSession,
  operations: ElementLayoutUpdateOperation[]
) {
  return operations.length === 1
    ? operations[0]
    : {
        type: "operation.batch" as const,
        slideId: session.slideId,
        operations: operations as AtomicSlideOperation[],
        timestamp: Date.now(),
      };
}
