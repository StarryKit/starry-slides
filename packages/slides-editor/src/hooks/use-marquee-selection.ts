import {
  SELECTOR_ATTR,
  type SlideModel,
  type StageGeometry,
  type StageRect,
  elementRectToStageRect,
} from "@starrykit/slides-core";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ensureSelectionContainsTarget } from "./iframe-editing-session";
import { getEditableSelectionTargetInScope } from "./iframe-text-editing-dom";

interface UseMarqueeSelectionOptions {
  activeGroupScopeId: string | null;
  activeSlide: SlideModel | undefined;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  isEditingText: boolean;
  onClearPreselection: () => void;
  onSelectElementIds: Dispatch<SetStateAction<string[]>>;
  selectedElementIds: string[];
  stageGeometry: StageGeometry;
}

interface MarqueeSession {
  additive: boolean;
  hasDragged: boolean;
  startPoint: { x: number; y: number };
  selectedElementIds: string[];
}

const MARQUEE_DRAG_THRESHOLD = 4;

function isStructuralGroupNode(node: HTMLElement | null): node is HTMLElement {
  return Boolean(
    node &&
      node.getAttribute("data-editable") === "block" &&
      Array.from(node.children).some(
        (child) => child instanceof HTMLElement && child.hasAttribute("data-editable")
      )
  );
}

export function useMarqueeSelection({
  activeGroupScopeId,
  activeSlide,
  iframeRef,
  isEditingText,
  onClearPreselection,
  onSelectElementIds,
  selectedElementIds,
  stageGeometry,
}: UseMarqueeSelectionOptions): {
  marqueeOverlay: StageRect | null;
  isMarqueeSelecting: boolean;
} {
  const { offsetX, offsetY, scale, slideHeight, slideWidth } = stageGeometry;
  const sessionRef = useRef<MarqueeSession | null>(null);
  const suppressNextClickRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const selectedElementIdsRef = useRef(selectedElementIds);
  const [marqueeOverlay, setMarqueeOverlay] = useState<StageRect | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);

  useEffect(() => {
    selectedElementIdsRef.current = selectedElementIds;
  }, [selectedElementIds]);

  const clearNativeSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    iframeRef.current?.contentWindow?.getSelection()?.removeAllRanges();
  }, [iframeRef]);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const iframeWindow = iframe?.contentWindow;
    if (!activeSlide || !iframe || !doc || !iframeWindow || isEditingText) {
      return;
    }

    const rootNode = doc.querySelector<HTMLElement>(activeSlide.rootSelector);
    if (!rootNode) {
      return;
    }

    const toStagePointFromIframe = (clientX: number, clientY: number) => {
      const rootRect = rootNode.getBoundingClientRect();
      return {
        x: offsetX + (clientX - rootRect.left) * scale,
        y: offsetY + (clientY - rootRect.top) * scale,
      };
    };

    const toStagePointFromParent = (clientX: number, clientY: number) => {
      const iframeRect = iframe.getBoundingClientRect();
      return {
        x: offsetX + (clientX - iframeRect.left),
        y: offsetY + (clientY - iframeRect.top),
      };
    };

    const selectIntersectingElements = (marqueeRect: StageRect, additive: boolean) => {
      const rootRect = rootNode.getBoundingClientRect();
      const touchedTargets = new Map<string, HTMLElement>();

      for (const candidate of Array.from(
        doc.querySelectorAll<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`)
      )) {
        if (!isElementInMarqueeScope(candidate, activeGroupScopeId)) {
          continue;
        }

        const target = getMarqueeSelectionTarget(candidate, activeGroupScopeId);
        const targetId = target?.getAttribute(SELECTOR_ATTR);
        if (!target || !targetId || touchedTargets.has(targetId)) {
          continue;
        }

        const targetRect = elementRectToStageRect(candidate.getBoundingClientRect(), rootRect, {
          offsetX,
          offsetY,
          scale,
          slideHeight,
          slideWidth,
        });
        if (rectsIntersect(marqueeRect, targetRect)) {
          touchedTargets.set(targetId, target);
        }
      }

      const targetIds = Array.from(touchedTargets.entries())
        .filter(([, target]) => !hasSelectedEditableAncestor(target, touchedTargets))
        .map(([targetId]) => targetId);

      if (!targetIds.length) {
        if (!additive) {
          onSelectElementIds([]);
        }
        return;
      }

      if (!additive) {
        onSelectElementIds(targetIds);
        return;
      }

      onSelectElementIds((currentIds) =>
        targetIds.reduce(ensureSelectionContainsTarget, currentIds)
      );
    };

    const finishSession = (finalRect: StageRect | null) => {
      const session = sessionRef.current;
      sessionRef.current = null;
      setIsMarqueeSelecting(false);
      setMarqueeOverlay(null);
      teardown();
      clearNativeSelection();

      if (!session) {
        return;
      }

      if (!finalRect) {
        if (!session.additive && !activeGroupScopeId) {
          onSelectElementIds([]);
        }
        return;
      }

      suppressNextClickRef.current = true;
      suppressClickUntilRef.current = Date.now() + 750;
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 100);
      selectIntersectingElements(finalRect, session.additive);
    };

    const updateSession = (point: { x: number; y: number }) => {
      const session = sessionRef.current;
      if (!session) {
        return null;
      }

      const distance = Math.hypot(point.x - session.startPoint.x, point.y - session.startPoint.y);
      session.hasDragged ||= distance > MARQUEE_DRAG_THRESHOLD;
      if (!session.hasDragged) {
        return null;
      }

      const nextRect = normalizeStageRect(session.startPoint, point);
      setIsMarqueeSelecting(true);
      setMarqueeOverlay(nextRect);
      return nextRect;
    };

    const onIframeMouseMove = (event: MouseEvent) => {
      if (!sessionRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      clearNativeSelection();
      updateSession(toStagePointFromIframe(event.clientX, event.clientY));
    };

    const onParentMouseMove = (event: MouseEvent) => {
      if (!sessionRef.current) {
        return;
      }

      event.preventDefault();
      clearNativeSelection();
      updateSession(toStagePointFromParent(event.clientX, event.clientY));
    };

    const onMouseUp = (event: MouseEvent) => {
      const session = sessionRef.current;
      if (!session) {
        return;
      }

      event.preventDefault();
      const point =
        event.view === iframeWindow
          ? toStagePointFromIframe(event.clientX, event.clientY)
          : toStagePointFromParent(event.clientX, event.clientY);
      const finalRect = updateSession(point);
      finishSession(finalRect);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !sessionRef.current) {
        return;
      }

      event.preventDefault();
      const session = sessionRef.current;
      finishSession(null);
      onSelectElementIds(session.selectedElementIds);
    };

    const teardown = () => {
      iframeWindow.removeEventListener("mousemove", onIframeMouseMove);
      iframeWindow.removeEventListener("mouseup", onMouseUp);
      iframeWindow.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousemove", onParentMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || isEditingText || sessionRef.current) {
        return;
      }

      const targetElement = getEventTargetElement(event.target);
      if (targetElement && getEditableSelectionTargetInScope(targetElement, activeGroupScopeId)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      clearNativeSelection();
      onClearPreselection();
      sessionRef.current = {
        additive: event.shiftKey || event.metaKey || event.ctrlKey,
        hasDragged: false,
        selectedElementIds: selectedElementIdsRef.current,
        startPoint: toStagePointFromIframe(event.clientX, event.clientY),
      };
      iframeWindow.addEventListener("mousemove", onIframeMouseMove);
      iframeWindow.addEventListener("mouseup", onMouseUp);
      iframeWindow.addEventListener("keydown", onKeyDown);
      window.addEventListener("mousemove", onParentMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("keydown", onKeyDown);
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!suppressNextClickRef.current && Date.now() > suppressClickUntilRef.current) {
        return;
      }

      suppressNextClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    doc.addEventListener("mousedown", onMouseDown, true);
    doc.addEventListener("click", onClickCapture, true);

    return () => {
      doc.removeEventListener("mousedown", onMouseDown, true);
      doc.removeEventListener("click", onClickCapture, true);
      teardown();
    };
  }, [
    activeGroupScopeId,
    activeSlide,
    clearNativeSelection,
    iframeRef,
    isEditingText,
    offsetX,
    offsetY,
    onClearPreselection,
    onSelectElementIds,
    scale,
    slideHeight,
    slideWidth,
  ]);

  return { marqueeOverlay, isMarqueeSelecting };
}

function normalizeStageRect(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number }
): StageRect {
  const x = Math.min(startPoint.x, endPoint.x);
  const y = Math.min(startPoint.y, endPoint.y);

  return {
    x,
    y,
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y),
  };
}

function rectsIntersect(left: StageRect, right: StageRect): boolean {
  return (
    left.x <= right.x + right.width &&
    left.x + left.width >= right.x &&
    left.y <= right.y + right.height &&
    left.y + left.height >= right.y
  );
}

function hasSelectedEditableAncestor(
  target: HTMLElement,
  touchedTargets: Map<string, HTMLElement>
): boolean {
  for (const ancestor of touchedTargets.values()) {
    if (ancestor !== target && ancestor.contains(target)) {
      return true;
    }
  }

  return false;
}

function isElementInMarqueeScope(
  candidate: HTMLElement,
  activeGroupScopeId: string | null
): boolean {
  if (!activeGroupScopeId) {
    const groupCandidate = candidate.closest<HTMLElement>(
      `[data-editable="block"][${SELECTOR_ATTR}]`
    );
    const groupTarget = isStructuralGroupNode(groupCandidate) ? groupCandidate : null;
    return !groupTarget || groupTarget === candidate;
  }

  const activeGroupCandidate = candidate.closest<HTMLElement>(
    `[data-editable="block"][${SELECTOR_ATTR}="${activeGroupScopeId}"]`
  );
  return isStructuralGroupNode(activeGroupCandidate);
}

function getMarqueeSelectionTarget(
  candidate: HTMLElement,
  activeGroupScopeId: string | null
): HTMLElement | null {
  const editableAncestors = getEditableAncestors(candidate);
  if (!editableAncestors.length) {
    return null;
  }

  if (!activeGroupScopeId) {
    const groupAncestor = editableAncestors.find((ancestor) => isStructuralGroupNode(ancestor));
    return groupAncestor ?? editableAncestors[editableAncestors.length - 1] ?? null;
  }

  const activeGroupIndex = editableAncestors.findIndex(
    (ancestor) => ancestor.getAttribute(SELECTOR_ATTR) === activeGroupScopeId
  );
  if (activeGroupIndex < 0) {
    return null;
  }

  return editableAncestors[activeGroupIndex - 1] ?? editableAncestors[activeGroupIndex] ?? null;
}

function getEditableAncestors(candidate: HTMLElement): HTMLElement[] {
  const ancestors: HTMLElement[] = [];
  let current: HTMLElement | null = candidate;

  while (current) {
    if (current.matches(`[data-editable][${SELECTOR_ATTR}]`)) {
      ancestors.push(current);
    }
    current = current.parentElement;
  }

  return ancestors;
}

function getEventTargetElement(target: EventTarget | null): Element | null {
  const node = target as Node | null;
  if (!node || typeof node.nodeType !== "number") {
    return null;
  }

  if (node.nodeType === node.ELEMENT_NODE) {
    return node as Element;
  }

  return node.parentElement;
}
