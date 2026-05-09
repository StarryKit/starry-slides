import { useCallback, useMemo, useRef, useState } from "react";
import {
  type AtomicSlideOperation,
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type ElementInsertOperation,
  type ElementLayoutUpdateOperation,
  type ElementPresentationStyleMap,
  type ElementRemoveOperation,
  type GroupElementRectMap,
  type PdfExportSelection,
  SELECTOR_ATTR,
  type SlideModel,
  type StyleUpdateOperation,
  captureElementLayoutStyleSnapshot,
  composeTransform,
  createBlankSlide,
  createDuplicatedSlide,
  createElementPlacement,
  createGroupCreateOperation,
  createGroupUngroupOperation,
  createUniqueElementId,
  getSlideElementHtml,
  normalizeElementLayoutStyleSnapshot,
  parseTransformParts,
  querySlideElement,
  updateSlideElementHtmlIds,
} from "../core";
import { EditorHeader } from "./components/editor-header";
import { PresenterView } from "./components/presenter-view";
import { SlideSidebar } from "./components/slide-sidebar";
import { StageCanvas } from "./components/stage-canvas";
import { TooltipProvider } from "./components/ui/tooltip";
import {
  createAttributeUpdateOperation,
  createStyleUpdateOperation,
  getHtmlAttributeValue,
  getInlineStyleValue,
} from "./editor-operations";
import {
  elementRectToSlideRect,
  offsetSlideRect,
  placeCopiedElement,
} from "./hooks/editor-keyboard-geometry";
import { useBlockManipulation } from "./hooks/use-block-manipulation";
import { useEditorKeyboardShortcuts } from "./hooks/use-editor-keyboard-shortcuts";
import { useIframeTextEditing } from "./hooks/use-iframe-text-editing";
import { useSlideHistory } from "./hooks/use-slide-history";
import { useSlideInspector } from "./hooks/use-slide-inspector";
import { useSlideThumbnails } from "./hooks/use-slide-thumbnails";
import { useStageViewport } from "./hooks/use-stage-viewport";

export interface SlidesEditorProps {
  slides: SlideModel[];
  deckTitle?: string;
  isSaving?: boolean;
  onSlidesChange?: (slides: SlideModel[]) => void;
  onDeckTitleChange?: (title: string) => void;
  onExportPdf?: (selection: PdfExportSelection) => void;
  onExportHtml?: () => void;
}

const EMPTY_LOCKED_ELEMENT_IDS: string[] = [];

function SlidesEditor({
  slides: loadedSlides,
  deckTitle,
  isSaving = false,
  onSlidesChange,
  onDeckTitleChange,
  onExportPdf,
  onExportHtml,
}: SlidesEditorProps) {
  const {
    slides,
    activeSlide,
    activeSlideId,
    undoDepth,
    redoDepth,
    setActiveSlideId,
    commitOperation,
    runUndo,
    runRedo,
  } = useSlideHistory(loadedSlides, {
    onSlidesChange,
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const selectionOverlayRef = useRef<HTMLDivElement>(null);
  const selectionContextMenuTriggerRef = useRef<HTMLSpanElement>(null);
  const beginPointerMoveRef = useRef<
    (
      elementId: string,
      clientX: number,
      clientY: number,
      pointerOptions?: {
        sourceWindow?: Window | null;
        toStagePoint?: (clientX: number, clientY: number) => { x: number; y: number };
      }
    ) => void
  >(() => {});
  const overlayPointerDownRef = useRef<{
    clientX: number;
    clientY: number;
    additive: boolean;
    targetElementId: string | null;
  } | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isToolbarSuppressed, setIsToolbarSuppressed] = useState(false);
  const [lockedElementIdsBySlideId, setLockedElementIdsBySlideId] = useState<
    Record<string, string[]>
  >({});
  const lockedElementIds = activeSlide
    ? (lockedElementIdsBySlideId[activeSlide.id] ?? EMPTY_LOCKED_ELEMENT_IDS)
    : EMPTY_LOCKED_ELEMENT_IDS;
  const lockedElementIdSet = useMemo(() => new Set(lockedElementIds), [lockedElementIds]);
  const isElementLocked = useCallback(
    (elementId: string) => lockedElementIdSet.has(elementId),
    [lockedElementIdSet]
  );
  const thumbnails = useSlideThumbnails(slides);
  const openSelectionContextMenu = useCallback((clientX: number, clientY: number) => {
    const trigger = selectionContextMenuTriggerRef.current;
    if (!trigger) {
      return;
    }

    trigger.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        button: 2,
        buttons: 2,
      })
    );
  }, []);
  const {
    selectedElementId,
    selectedElementIds,
    preselectedElementId,
    isEditingText,
    activeGroupScopeId,
    setSelectedElementId,
    setSelectedElementIds,
    beginTextEditing,
    beginGroupEditingScope,
    clearSelection,
    clearPreselection,
    updatePointerPreselection,
    retargetPointerSelection,
    openPointerSelectionContextMenu,
  } = useIframeTextEditing({
    activeSlide,
    iframeRef,
    onCommitOperation: commitOperation,
    isElementLocked,
    onOpenSelectionContextMenu: openSelectionContextMenu,
    onBeginPointerMove: useCallback(
      (
        elementId: string,
        clientX: number,
        clientY: number,
        pointerOptions?: {
          sourceWindow?: Window | null;
          toStagePoint?: (clientX: number, clientY: number) => { x: number; y: number };
        }
      ) => {
        beginPointerMoveRef.current(elementId, clientX, clientY, pointerOptions);
      },
      []
    ),
  });

  const selectedElement = activeSlide?.elements.find((element) => element.id === selectedElementId);
  const activeGroupScopeElement = activeSlide?.elements.find(
    (element) => element.id === activeGroupScopeId
  );
  const selectedElementType =
    selectedElementIds.length > 1
      ? "multi"
      : (selectedElement?.type ?? activeGroupScopeElement?.type ?? "block");
  const selectedElements = activeSlide
    ? selectedElementIds
        .map((elementId) => activeSlide.elements.find((element) => element.id === elementId))
        .filter((element): element is SlideModel["elements"][number] => Boolean(element))
    : [];
  const selectionCommandAvailability = {
    group: selectedElementIds.length >= 2 && selectedElements.length === selectedElementIds.length,
    ungroup:
      selectedElementIds.length === 1 &&
      Boolean(
        selectedElement?.type === "group" ||
          (activeSlide && selectedElementId
            ? hasDirectEditableChildren(activeSlide.htmlSource, selectedElementId)
            : false)
      ),
  };
  const groupScopeOverlayPassive =
    Boolean(activeGroupScopeId) &&
    selectedElementIds.length === 1 &&
    selectedElementId === activeGroupScopeId;
  const isSelectedElementLocked = Boolean(selectedElementId && isElementLocked(selectedElementId));
  const resolvedDeckTitle = deckTitle ?? "";

  const slideWidth = activeSlide?.width || DEFAULT_SLIDE_WIDTH;
  const slideHeight = activeSlide?.height || DEFAULT_SLIDE_HEIGHT;
  const { scale, offsetX, offsetY } = useStageViewport({
    stageViewportRef,
    slideWidth,
    slideHeight,
  });
  const { selectedStageRect, preselectionOverlay, selectionOverlay, inspectedStyles } =
    useSlideInspector({
      iframeRef,
      activeSlide,
      selectedElement,
      selectedElementIds,
      preselectedElementId,
      scale,
      offsetX,
      offsetY,
      slideWidth,
      slideHeight,
    });
  const {
    manipulationOverlay,
    isManipulating,
    suppressBackgroundClear,
    beginMove,
    beginResize,
    beginRotate,
  } = useBlockManipulation({
    activeSlide,
    selectedElement,
    selectedElementId,
    selectedElementIds,
    selectedStageRect,
    iframeRef,
    stageGeometry: {
      scale,
      offsetX,
      offsetY,
      slideWidth,
      slideHeight,
    },
    isEditingText,
    onCommitOperation: commitOperation,
    isElementLocked,
  });
  beginPointerMoveRef.current = (elementId, clientX, clientY, pointerOptions) => {
    beginMove(
      {
        clientX,
        clientY,
        ...pointerOptions,
        preventDefault: () => {},
        stopPropagation: () => {},
      },
      elementId
    );
  };
  const unifiedSelectionOverlay = manipulationOverlay?.selectionBounds ?? selectionOverlay;
  const selectedTargetElementId = selectedElementId ?? "slide-root";
  const attributeValues = {
    locked: isSelectedElementLocked ? "true" : "",
    altText: activeSlide ? getHtmlAttributeValue(activeSlide, selectedTargetElementId, "alt") : "",
    ariaLabel: activeSlide
      ? getHtmlAttributeValue(activeSlide, selectedTargetElementId, "aria-label")
      : "",
    linkUrl: activeSlide
      ? getHtmlAttributeValue(activeSlide, selectedTargetElementId, "data-link-url")
      : "",
  };

  function commitStyleChange(propertyName: string, nextValue: string) {
    if (!activeSlide) {
      return;
    }

    const operation = createStyleUpdateOperation({
      elementId: selectedTargetElementId,
      nextValue,
      propertyName,
      slide: activeSlide,
    });

    if (operation) {
      commitOperation(operation);
    }
  }

  function previewStyleChange(propertyName: string, nextValue: string | null) {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      return;
    }

    const selectedNode = querySlideElement<HTMLElement>(doc, selectedTargetElementId);
    if (!selectedNode) {
      return;
    }

    const previewAttribute = `data-editor-preview-${propertyName}`;
    const previewOriginalValue = selectedNode.getAttribute(previewAttribute);
    if (nextValue === null) {
      if (previewOriginalValue === null) {
        return;
      }

      selectedNode.style.setProperty(propertyName, previewOriginalValue);
      selectedNode.removeAttribute(previewAttribute);
      return;
    }

    if (previewOriginalValue === null) {
      selectedNode.setAttribute(
        previewAttribute,
        selectedNode.style.getPropertyValue(propertyName)
      );
    }
    selectedNode.style.setProperty(propertyName, nextValue);
  }

  function commitAttributeChange(attributeName: string, nextValue: string) {
    if (!activeSlide) {
      return;
    }

    if (attributeName === "data-editor-locked") {
      const nextLocked = nextValue.trim() === "true";
      if (!selectedElementId) {
        return;
      }

      setLockedElementIdsBySlideId((current) => {
        const nextIds = new Set(current[activeSlide.id] ?? []);
        if (nextLocked) {
          nextIds.add(selectedElementId);
        } else {
          nextIds.delete(selectedElementId);
        }

        return {
          ...current,
          [activeSlide.id]: Array.from(nextIds),
        };
      });
      return;
    }

    const operation = createAttributeUpdateOperation({
      attributeName,
      elementId: selectedTargetElementId,
      nextValue,
      slide: activeSlide,
    });

    if (operation) {
      commitOperation(operation);
    }
  }

  function commitLayerAction(action: string) {
    if (!activeSlide || selectedElementIds.length === 0) {
      return;
    }

    const operations = selectedElementIds
      .map((elementId) => {
        const previousValue = getInlineStyleValue(activeSlide, elementId, "z-index");
        const numericZIndex = Number.parseInt(previousValue, 10);
        const currentZIndex = Number.isFinite(numericZIndex) ? numericZIndex : 0;
        const nextValue =
          action === "front"
            ? "999"
            : action === "back"
              ? "0"
              : String(Math.max(0, currentZIndex + (action === "forward" ? 1 : -1)));

        if (previousValue === nextValue) {
          return null;
        }

        return {
          type: "style.update" as const,
          slideId: activeSlide.id,
          elementId,
          propertyName: "z-index",
          previousValue,
          nextValue,
          timestamp: Date.now(),
        };
      })
      .filter((operation): operation is StyleUpdateOperation => Boolean(operation));

    commitSelectionOperation(operations);
  }

  function commitSelectionOperation(operations: AtomicSlideOperation[]) {
    if (!activeSlide || operations.length === 0) {
      return;
    }

    commitOperation(
      operations.length === 1
        ? operations[0]
        : {
            type: "operation.batch",
            slideId: activeSlide.id,
            operations,
            timestamp: Date.now(),
          }
    );
  }

  function createIdMapForCopiedElement(
    html: string,
    sourceElementId: string,
    nextElementId: string
  ) {
    const idMap: Record<string, string> = {
      [sourceElementId]: nextElementId,
    };
    const doc = new DOMParser().parseFromString(`<template>${html}</template>`, "text/html");
    const root = doc.querySelector("template")?.content.firstElementChild;
    if (!(root instanceof HTMLElement)) {
      return idMap;
    }

    for (const node of root.querySelectorAll<HTMLElement>(`[${SELECTOR_ATTR}]`)) {
      const currentId = node.getAttribute(SELECTOR_ATTR);
      if (currentId) {
        idMap[currentId] = `${nextElementId}-${currentId}`;
      }
    }

    return idMap;
  }

  function duplicateSelection() {
    if (!activeSlide || selectedElementIds.length === 0) {
      return;
    }

    const doc = iframeRef.current?.contentDocument;
    const rootNode = doc?.querySelector<HTMLElement>(activeSlide.rootSelector);
    const rootRect = rootNode?.getBoundingClientRect();
    let htmlSource = activeSlide.htmlSource;
    const nextElementIds: string[] = [];
    const operations = selectedElementIds
      .map((sourceElementId) => {
        const html = getSlideElementHtml(activeSlide.htmlSource, sourceElementId);
        const placement = createElementPlacement(activeSlide.htmlSource, sourceElementId);
        const node = doc ? querySlideElement<HTMLElement>(doc, sourceElementId) : null;
        if (!html || !placement || !node || !rootRect) {
          return null;
        }

        const nextElementId = createUniqueElementId(htmlSource, `${sourceElementId}-copy`);
        const nextHtml = updateSlideElementHtmlIds(
          html,
          createIdMapForCopiedElement(html, sourceElementId, nextElementId)
        );
        const copiedRect = offsetSlideRect(
          elementRectToSlideRect(node.getBoundingClientRect(), rootRect),
          24,
          24
        );
        const shiftedHtml = placeCopiedElement(nextHtml, copiedRect);
        htmlSource = `${htmlSource}\n<!-- ${nextElementId} reserved -->`;
        nextElementIds.push(nextElementId);

        return {
          type: "element.insert" as const,
          slideId: activeSlide.id,
          elementId: nextElementId,
          ...placement,
          html: shiftedHtml,
          timestamp: Date.now(),
        };
      })
      .filter((operation): operation is ElementInsertOperation => Boolean(operation));

    commitSelectionOperation(operations);
    if (nextElementIds.length) {
      setSelectedElementIds(nextElementIds);
    }
  }

  function deleteSelection() {
    if (!activeSlide || selectedElementIds.length === 0) {
      return;
    }

    const operations = selectedElementIds
      .map((elementId) => {
        const html = getSlideElementHtml(activeSlide.htmlSource, elementId);
        const placement = createElementPlacement(activeSlide.htmlSource, elementId);
        if (!html || !placement) {
          return null;
        }

        return {
          type: "element.remove" as const,
          slideId: activeSlide.id,
          elementId,
          ...placement,
          html,
          timestamp: Date.now(),
        };
      })
      .filter((operation): operation is ElementRemoveOperation => Boolean(operation));

    commitSelectionOperation(operations);
    if (operations.length) {
      setSelectedElementIds([]);
    }
  }

  function selectSlideByDirection(direction: "previous" | "next") {
    if (!activeSlide || slides.length <= 1) {
      return false;
    }

    const activeIndex = slides.findIndex((slide) => slide.id === activeSlide.id);
    if (activeIndex < 0) {
      return false;
    }

    const nextIndex =
      direction === "previous"
        ? Math.max(0, activeIndex - 1)
        : Math.min(slides.length - 1, activeIndex + 1);
    const nextSlide = slides[nextIndex];
    if (!nextSlide || nextSlide.id === activeSlide.id) {
      return false;
    }

    setActiveSlideId(nextSlide.id);
    setSelectedElementId(null);
    return true;
  }

  function addSlideAtIndex(insertIndex: number) {
    if (!activeSlide || slides.length === 0) {
      return;
    }

    const slide = createBlankSlide(slides, insertIndex);

    commitOperation({
      type: "slide.create",
      slide,
      index: insertIndex,
      timestamp: Date.now(),
    });
    setActiveSlideId(slide.id);
    clearSelection();
  }

  function addSlideAfterActive() {
    if (!activeSlide) {
      return;
    }

    const activeIndex = slides.findIndex((slide) => slide.id === activeSlide.id);
    const insertIndex = activeIndex >= 0 ? activeIndex + 1 : slides.length;
    addSlideAtIndex(insertIndex);
  }

  function addSlideAbove(slideId: string) {
    const index = slides.findIndex((slide) => slide.id === slideId);
    if (index < 0) {
      return;
    }

    addSlideAtIndex(index);
  }

  function addSlideBelow(slideId: string) {
    const index = slides.findIndex((slide) => slide.id === slideId);
    if (index < 0) {
      return;
    }

    addSlideAtIndex(index + 1);
  }

  function duplicateSlide(slideId: string) {
    const sourceSlide = slides.find((slide) => slide.id === slideId);
    if (!sourceSlide) {
      return;
    }

    const sourceIndex = slides.findIndex((slide) => slide.id === slideId);
    const insertIndex = sourceIndex >= 0 ? sourceIndex + 1 : slides.length;
    const slide = createDuplicatedSlide(slides, sourceSlide);

    commitOperation({
      type: "slide.duplicate",
      sourceSlideId: slideId,
      slide,
      index: insertIndex,
      timestamp: Date.now(),
    });
    setActiveSlideId(slide.id);
    clearSelection();
  }

  function deleteSlide(slideId: string) {
    if (slides.length <= 1) {
      return;
    }

    const index = slides.findIndex((slide) => slide.id === slideId);
    const slide = slides[index];
    if (!slide) {
      return;
    }

    const fallbackSlide = slides[index + 1] ?? slides[index - 1] ?? slides[0];
    commitOperation({
      type: "slide.delete",
      slide,
      index,
      timestamp: Date.now(),
    });
    if (activeSlideId === slideId) {
      setActiveSlideId(fallbackSlide?.id ?? "");
    }
    clearSelection();
  }

  function toggleSlideHidden(slideId: string) {
    const slide = slides.find((item) => item.id === slideId);
    if (!slide) {
      return;
    }

    commitOperation({
      type: "slide.visibility.update",
      slideId,
      previousHidden: slide.hidden === true,
      nextHidden: slide.hidden !== true,
      timestamp: Date.now(),
    });
  }

  function renameSlide(slideId: string, nextTitle: string) {
    const slide = slides.find((item) => item.id === slideId);
    const normalizedTitle = nextTitle.trim() || "Untitled Slide";
    if (!slide || slide.title === normalizedTitle) {
      return;
    }

    commitOperation({
      type: "slide.title.update",
      slideId,
      previousTitle: slide.title,
      nextTitle: normalizedTitle,
      timestamp: Date.now(),
    });
  }

  function reorderSlide(slideId: string, targetIndex: number) {
    const fromIndex = slides.findIndex((slide) => slide.id === slideId);
    if (fromIndex < 0 || fromIndex === targetIndex) {
      return;
    }

    commitOperation({
      type: "slide.reorder",
      slideId,
      fromIndex,
      toIndex: targetIndex,
      timestamp: Date.now(),
    });
    setActiveSlideId(slideId);
  }

  function groupSelection() {
    if (!activeSlide || selectedElementIds.length < 2) {
      return;
    }

    const elementRects = createGroupElementRectMap();
    const groupElementId = createUniqueElementId(activeSlide.htmlSource, "group-1");
    const operation = createGroupCreateOperation({
      html: activeSlide.htmlSource,
      slideId: activeSlide.id,
      groupElementId,
      elementRects,
      elementIds: selectedElementIds,
    });

    if (operation) {
      commitOperation(operation);
      setSelectedElementIds([groupElementId]);
    }
  }

  function createGroupElementRectMap(flattenRootElementId?: string): GroupElementRectMap {
    const doc = iframeRef.current?.contentDocument;
    const root = doc?.querySelector<HTMLElement>(activeSlide?.rootSelector ?? "");
    if (!doc || !root) {
      return {};
    }

    const rootRect = root.getBoundingClientRect();
    const scaleX = activeSlide ? activeSlide.width / rootRect.width : 1;
    const scaleY = activeSlide ? activeSlide.height / rootRect.height : 1;
    const rects: GroupElementRectMap = {};
    const structuralListIds = createStructuralListIdMap(doc, flattenRootElementId);
    const rectNodes = [
      ...Array.from(doc.querySelectorAll<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`)),
      ...Array.from(structuralListIds.keys()),
    ];
    for (const node of rectNodes) {
      const elementId = node.getAttribute(SELECTOR_ATTR) || structuralListIds.get(node);
      if (!elementId) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      const parent = node.parentElement;
      const parentId =
        parent?.hasAttribute("data-editable") && parent.getAttribute(SELECTOR_ATTR)
          ? parent.getAttribute(SELECTOR_ATTR)
          : null;
      const parentRect = parentId
        ? (rects[parentId] ?? { x: 0, y: 0, width: rootRect.width, height: rootRect.height })
        : { x: 0, y: 0, width: rootRect.width, height: rootRect.height };

      rects[elementId] = {
        x: (rect.left - rootRect.left) * scaleX - parentRect.x,
        y: (rect.top - rootRect.top) * scaleY - parentRect.y,
        width: rect.width * scaleX,
        height: rect.height * scaleY,
      };
    }

    return rects;
  }

  function ungroupSelection() {
    if (!activeSlide || selectedElementIds.length !== 1 || !selectedElementId) {
      return;
    }

    const operation = createGroupUngroupOperation({
      html: activeSlide.htmlSource,
      slideId: activeSlide.id,
      groupElementId: selectedElementId,
      elementRects: createGroupElementRectMap(selectedElementId),
      elementPresentationStyles: createElementPresentationStyleMap(selectedElementId),
    });

    if (operation) {
      commitOperation(operation);
      setSelectedElementIds(operation.childElementIds);
    }
  }

  function createElementPresentationStyleMap(elementId: string): ElementPresentationStyleMap {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      return {};
    }

    const selectedNode = querySlideElement<HTMLElement>(doc, elementId);
    if (!selectedNode || selectedNode.getAttribute("data-group") === "true") {
      return {};
    }

    const result: ElementPresentationStyleMap = {};
    const structuralListIds = createStructuralListIdMap(doc, elementId);
    for (const child of Array.from(selectedNode.children)) {
      if (!child.hasAttribute("data-editable") && !isListWrapperWithEditableItems(child)) {
        continue;
      }

      const childElementId = child.getAttribute(SELECTOR_ATTR) || structuralListIds.get(child);
      const computedStyle = child.ownerDocument.defaultView?.getComputedStyle(child);
      if (!childElementId || !computedStyle) {
        continue;
      }

      result[childElementId] = {
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        fontWeight: computedStyle.fontWeight,
        fontStyle: computedStyle.fontStyle,
        lineHeight: computedStyle.lineHeight,
        textAlign: computedStyle.textAlign,
        paddingTop: computedStyle.paddingTop,
        paddingRight: computedStyle.paddingRight,
        paddingBottom: computedStyle.paddingBottom,
        paddingLeft: computedStyle.paddingLeft,
        listStylePosition: computedStyle.listStylePosition,
        listStyleType: computedStyle.listStyleType,
      };

      for (const descendant of Array.from(
        child.querySelectorAll<HTMLElement>(`[data-editable][${SELECTOR_ATTR}]`)
      )) {
        const descendantElementId = descendant.getAttribute(SELECTOR_ATTR);
        const descendantComputedStyle =
          descendant.ownerDocument.defaultView?.getComputedStyle(descendant);
        if (!descendantElementId || !descendantComputedStyle) {
          continue;
        }

        result[descendantElementId] = {
          color: descendantComputedStyle.color,
          fontSize: descendantComputedStyle.fontSize,
          fontWeight: descendantComputedStyle.fontWeight,
          fontStyle: descendantComputedStyle.fontStyle,
          lineHeight: descendantComputedStyle.lineHeight,
          textAlign: descendantComputedStyle.textAlign,
        };
      }
    }

    return result;
  }

  function commitArrangeAction(action: string) {
    if (!activeSlide || !selectedElementId || !unifiedSelectionOverlay) {
      return;
    }

    const transform = getInlineStyleValue(activeSlide, selectedElementId, "transform");
    const slideRect = {
      x: (unifiedSelectionOverlay.x - offsetX) / scale,
      y: (unifiedSelectionOverlay.y - offsetY) / scale,
      width: unifiedSelectionOverlay.width / scale,
      height: unifiedSelectionOverlay.height / scale,
    };
    let deltaX = 0;
    let deltaY = 0;

    if (action === "left") {
      deltaX = -slideRect.x;
    } else if (action === "hcenter") {
      deltaX = slideWidth / 2 - (slideRect.x + slideRect.width / 2);
    } else if (action === "right") {
      deltaX = slideWidth - (slideRect.x + slideRect.width);
    } else if (action === "top") {
      deltaY = -slideRect.y;
    } else if (action === "vcenter") {
      deltaY = slideHeight / 2 - (slideRect.y + slideRect.height / 2);
    } else if (action === "bottom") {
      deltaY = slideHeight - (slideRect.y + slideRect.height);
    }

    if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) {
      return;
    }

    const transformParts = parseTransformParts(transform);
    commitStyleChange(
      "transform",
      composeTransform(
        transformParts.translateX + deltaX,
        transformParts.translateY + deltaY,
        transformParts.rotate
      ) ?? ""
    );
  }

  function distributeSelection(action: string) {
    if (!activeSlide || selectedElementIds.length < 3) {
      return;
    }

    const doc = iframeRef.current?.contentDocument;
    const rootNode = doc?.querySelector<HTMLElement>(activeSlide.rootSelector);
    const rootRect = rootNode?.getBoundingClientRect();
    if (!doc || !rootRect) {
      return;
    }

    const items = selectedElementIds
      .map((elementId) => {
        const node = querySlideElement<HTMLElement>(doc, elementId);
        if (!node) {
          return null;
        }

        const rect = node.getBoundingClientRect();
        return {
          elementId,
          node,
          rect: {
            x: rect.left - rootRect.left,
            y: rect.top - rootRect.top,
            width: rect.width,
            height: rect.height,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (items.length < 3) {
      return;
    }

    const axis = action === "vertical" ? "y" : "x";
    const sizeKey = action === "vertical" ? "height" : "width";
    const sortedItems = [...items].sort((a, b) => a.rect[axis] - b.rect[axis]);
    const first = sortedItems[0];
    const last = sortedItems[sortedItems.length - 1];
    if (!first || !last) {
      return;
    }

    const firstCenter = first.rect[axis] + first.rect[sizeKey] / 2;
    const lastCenter = last.rect[axis] + last.rect[sizeKey] / 2;
    const step = (lastCenter - firstCenter) / (sortedItems.length - 1);
    const operations = sortedItems
      .map((item, index) => {
        const targetCenter = firstCenter + step * index;
        const currentCenter = item.rect[axis] + item.rect[sizeKey] / 2;
        const delta = targetCenter - currentCenter;
        if (Math.abs(delta) < 0.01) {
          return null;
        }

        const previousStyle = captureElementLayoutStyleSnapshot(item.node);
        const transformParts = parseTransformParts(previousStyle.transform);
        const nextStyle = normalizeElementLayoutStyleSnapshot({
          ...previousStyle,
          transform: composeTransform(
            transformParts.translateX + (axis === "x" ? delta : 0),
            transformParts.translateY + (axis === "y" ? delta : 0),
            transformParts.rotate
          ),
          transformOrigin: previousStyle.transformOrigin || "center center",
        });

        return {
          type: "element.layout.update" as const,
          slideId: activeSlide.id,
          elementId: item.elementId,
          previousStyle,
          nextStyle,
          timestamp: Date.now(),
        };
      })
      .filter((operation): operation is ElementLayoutUpdateOperation => Boolean(operation));

    commitSelectionOperation(operations);
  }

  useEditorKeyboardShortcuts({
    activeSlide,
    selectedElementIds,
    lockedElementIds,
    iframeRef,
    slideWidth,
    slideHeight,
    isEditingText,
    canUndo: undoDepth > 0,
    canRedo: redoDepth > 0,
    onCommitOperation: commitOperation,
    onSelectElementIds: setSelectedElementIds,
    onEscapeSelection: clearSelection,
    onNavigateSlide: selectSlideByDirection,
    onUndo: runUndo,
    onRedo: runRedo,
  });

  if (!activeSlide) {
    return <div className="grid min-h-screen place-items-center">No slides loaded.</div>;
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <div
          className={`flex min-h-0 flex-auto flex-col ${
            isPresenting ? "invisible pointer-events-none absolute inset-0" : ""
          }`}
        >
          <EditorHeader
            title={resolvedDeckTitle}
            onTitleChange={onDeckTitleChange}
            isSaving={isSaving}
            onPresent={() => {
              clearSelection();
              setIsPresenting(true);
            }}
            onExportHtml={onExportHtml}
            pdfSlides={slides.map((slide) => ({
              id: slide.id,
              title: slide.title,
              file: slide.sourceFile,
            }))}
            pdfThumbnails={thumbnails}
            onExportPdf={onExportPdf}
          />

          <div className="flex min-h-0 flex-auto gap-3 overflow-hidden max-[1200px]:block">
            <SlideSidebar
              slides={slides}
              activeSlideId={activeSlide.id}
              slideCount={slides.length}
              thumbnails={thumbnails}
              onSelectSlide={(slideId) => {
                setActiveSlideId(slideId);
                setSelectedElementId(null);
              }}
              onAdd={addSlideAfterActive}
              onAddSlideAbove={addSlideAbove}
              onAddSlideBelow={addSlideBelow}
              onDuplicate={duplicateSlide}
              onDelete={deleteSlide}
              onToggleHidden={toggleSlideHidden}
              onRename={renameSlide}
              onReorder={reorderSlide}
            />

            <main className="flex min-h-0 min-w-0 flex-auto overflow-visible max-[1200px]:block">
              <StageCanvas
                slideWidth={slideWidth}
                slideHeight={slideHeight}
                offsetX={offsetX}
                offsetY={offsetY}
                scale={scale}
                preselectionOverlay={preselectionOverlay}
                selectionOverlay={unifiedSelectionOverlay}
                toolbarKey={
                  selectedElementIds.length
                    ? `${activeSlide.id}:${selectedElementIds.join(",")}`
                    : null
                }
                inspectedStyles={inspectedStyles}
                selectedElementType={selectedElementType}
                selectionCommandAvailability={selectionCommandAvailability}
                isSelectedElementLocked={isSelectedElementLocked}
                groupScopeOverlayPassive={groupScopeOverlayPassive}
                isEditingText={isEditingText}
                manipulationOverlay={manipulationOverlay}
                iframeRef={iframeRef}
                stageViewportRef={stageViewportRef}
                selectionOverlayRef={selectionOverlayRef}
                selectionContextMenuTriggerRef={selectionContextMenuTriggerRef}
                isManipulating={isManipulating}
                isToolbarSuppressed={isToolbarSuppressed}
                onSelectionOverlayMouseDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }

                  if (!selectedElementIds.length) {
                    return;
                  }
                  if (isSelectedElementLocked) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  setIsToolbarSuppressed(true);

                  const additive = event.shiftKey || event.metaKey || event.ctrlKey;
                  const targetElementId = updatePointerPreselection(event.clientX, event.clientY);

                  overlayPointerDownRef.current = {
                    clientX: event.clientX,
                    clientY: event.clientY,
                    additive,
                    targetElementId,
                  };

                  if (targetElementId && targetElementId !== selectedElementId) {
                    event.stopPropagation();
                    return;
                  }

                  if (targetElementId && targetElementId === selectedElementId) {
                    event.stopPropagation();
                  }

                  beginMove({
                    clientX: event.clientX,
                    clientY: event.clientY,
                    preventDefault: () => event.preventDefault(),
                    stopPropagation: () => event.stopPropagation(),
                  });
                }}
                onSelectionOverlayMouseMove={(event) => {
                  if (isSelectedElementLocked) {
                    return;
                  }
                  const pointerDown = overlayPointerDownRef.current;
                  updatePointerPreselection(event.clientX, event.clientY);

                  if (!pointerDown || pointerDown.targetElementId === selectedElementId) {
                    return;
                  }

                  const deltaX = event.clientX - pointerDown.clientX;
                  const deltaY = event.clientY - pointerDown.clientY;
                  if (Math.hypot(deltaX, deltaY) <= 4) {
                    return;
                  }

                  overlayPointerDownRef.current = null;
                  retargetPointerSelection(
                    pointerDown.clientX,
                    pointerDown.clientY,
                    pointerDown.additive
                  );
                  beginMove(
                    {
                      clientX: pointerDown.clientX,
                      clientY: pointerDown.clientY,
                      preventDefault: () => event.preventDefault(),
                      stopPropagation: () => event.stopPropagation(),
                    },
                    pointerDown.targetElementId ?? undefined
                  );
                }}
                onSelectionOverlayContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openSelectionContextMenu(event.clientX, event.clientY);
                }}
                onSelectionOverlayMouseUp={(event) => {
                  if (isSelectedElementLocked) {
                    overlayPointerDownRef.current = null;
                    setIsToolbarSuppressed(false);
                    return;
                  }
                  const pointerDown = overlayPointerDownRef.current;
                  overlayPointerDownRef.current = null;
                  setIsToolbarSuppressed(false);

                  if (!pointerDown) {
                    return;
                  }

                  const deltaX = event.clientX - pointerDown.clientX;
                  const deltaY = event.clientY - pointerDown.clientY;
                  if (Math.hypot(deltaX, deltaY) > 4) {
                    return;
                  }

                  retargetPointerSelection(event.clientX, event.clientY, pointerDown.additive);
                }}
                onStageMouseLeave={clearPreselection}
                onResizeHandleMouseDown={(corner, event) => {
                  if (!selectedElementIds.length) {
                    return;
                  }

                  beginResize(corner, {
                    clientX: event.clientX,
                    clientY: event.clientY,
                    preventDefault: () => event.preventDefault(),
                    stopPropagation: () => event.stopPropagation(),
                  });
                }}
                onRotateHandleMouseDown={(event) => {
                  if (selectedElementIds.length !== 1) {
                    return;
                  }

                  beginRotate({
                    clientX: event.clientX,
                    clientY: event.clientY,
                    preventDefault: () => event.preventDefault(),
                    stopPropagation: () => event.stopPropagation(),
                  });
                }}
                onSelectionOverlayDoubleClick={(event) => {
                  if (activeGroupScopeId && iframeRef.current?.contentDocument) {
                    const iframeRect = iframeRef.current.getBoundingClientRect();
                    const doc = iframeRef.current.contentDocument;
                    const iframeScaleX = iframeRect.width / iframeRef.current.clientWidth || 1;
                    const iframeScaleY = iframeRect.height / iframeRef.current.clientHeight || 1;
                    const iframePoint = {
                      x: (event.clientX - iframeRect.left) / iframeScaleX,
                      y: (event.clientY - iframeRect.top) / iframeScaleY,
                    };
                    const scopedEditable = getScopedTextTargetAtPoint(
                      doc,
                      activeGroupScopeId,
                      iframePoint
                    );

                    const scopedElementId = scopedEditable?.getAttribute(SELECTOR_ATTR);
                    if (scopedElementId) {
                      beginTextEditing(scopedElementId);
                      return;
                    }
                  }

                  if (
                    selectedElementIds.length === 1 &&
                    selectedElement?.type === "text" &&
                    selectedElementId
                  ) {
                    beginTextEditing(selectedElementId);
                    return;
                  }

                  if (
                    selectedElementIds.length === 1 &&
                    selectedElement?.type === "group" &&
                    selectedElementId
                  ) {
                    beginGroupEditingScope(selectedElementId);
                  }
                }}
                onBackgroundClick={() => {
                  if (!suppressBackgroundClear) {
                    clearSelection();
                  }
                }}
                onStyleChange={commitStyleChange}
                onStylePreview={previewStyleChange}
                onAttributeChange={commitAttributeChange}
                onAlignToSlide={commitArrangeAction}
                onDistribute={distributeSelection}
                onGroup={groupSelection}
                onLayerOrder={commitLayerAction}
                onUngroup={ungroupSelection}
                onDuplicate={duplicateSelection}
                onDelete={deleteSelection}
                attributeValues={attributeValues}
              />
            </main>
          </div>
        </div>
        {isPresenting ? (
          <PresenterView
            slides={slides}
            startSlideId={activeSlide.id}
            onExit={() => setIsPresenting(false)}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}

function hasDirectEditableChildren(html: string, elementId: string): boolean {
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

function createStructuralListIdMap(
  doc: Document,
  flattenRootElementId: string | undefined
): Map<Element, string> {
  const result = new Map<Element, string>();
  if (!flattenRootElementId) {
    return result;
  }

  const flattenRoot = querySlideElement<HTMLElement>(doc, flattenRootElementId);
  if (!flattenRoot || flattenRoot.getAttribute("data-group") === "true") {
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

function isListWrapperWithEditableItems(node: Element): node is HTMLElement {
  const tagName = node.tagName.toLowerCase();
  if (tagName !== "ul" && tagName !== "ol") {
    return false;
  }

  return Array.from(node.children).some(
    (child) => child.tagName.toLowerCase() === "li" && child.hasAttribute("data-editable")
  );
}

function getScopedTextTargetAtPoint(
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

export { SlidesEditor };
export * from "../core";
