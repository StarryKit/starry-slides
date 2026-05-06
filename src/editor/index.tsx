import { useRef } from "react";
import {
  type AtomicSlideOperation,
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type ElementInsertOperation,
  type ElementLayoutUpdateOperation,
  type ElementRemoveOperation,
  SELECTOR_ATTR,
  type SlideModel,
  type StyleUpdateOperation,
  captureElementLayoutStyleSnapshot,
  composeTransform,
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
import { SlideSidebar } from "./components/slide-sidebar";
import { StageCanvas } from "./components/stage-canvas";
import { TooltipProvider } from "./components/ui/tooltip";
import {
  createAttributeUpdateOperation,
  createStyleUpdateOperation,
  getHtmlAttributeValue,
  getInlineStyleValue,
} from "./editor-operations";
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
  sourceLabel: string;
  isSaving?: boolean;
  onSlidesChange?: (slides: SlideModel[]) => void;
}

function SlidesEditor({
  slides: loadedSlides,
  deckTitle,
  sourceLabel,
  isSaving = false,
  onSlidesChange,
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
  const thumbnails = useSlideThumbnails(slides);
  const {
    selectedElementId,
    selectedElementIds,
    isEditingText,
    setSelectedElementId,
    setSelectedElementIds,
    beginTextEditing,
    clearSelection,
  } = useIframeTextEditing({
    activeSlide,
    iframeRef,
    onCommitOperation: commitOperation,
  });

  const selectedElement = activeSlide?.elements.find((element) => element.id === selectedElementId);
  const selectedElementType =
    selectedElementIds.length > 1 ? "multi" : (selectedElement?.type ?? "block");
  const resolvedDeckTitle = deckTitle?.trim() || "Untitled deck";

  const slideWidth = activeSlide?.width || DEFAULT_SLIDE_WIDTH;
  const slideHeight = activeSlide?.height || DEFAULT_SLIDE_HEIGHT;
  const { scale, offsetX, offsetY } = useStageViewport({
    stageViewportRef,
    slideWidth,
    slideHeight,
  });
  const { selectedStageRect, selectionOverlay, inspectedStyles } = useSlideInspector({
    iframeRef,
    activeSlide,
    selectedElement,
    selectedElementIds,
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
  });
  const unifiedSelectionOverlay = manipulationOverlay?.selectionBounds ?? selectionOverlay;
  const selectedTargetElementId = selectedElementId ?? "slide-root";
  const attributeValues = {
    locked: activeSlide
      ? getHtmlAttributeValue(activeSlide, selectedTargetElementId, "data-editor-locked")
      : "",
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

  function commitAttributeChange(attributeName: string, nextValue: string) {
    if (!activeSlide) {
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

    let htmlSource = activeSlide.htmlSource;
    const nextElementIds: string[] = [];
    const operations = selectedElementIds
      .map((sourceElementId) => {
        const html = getSlideElementHtml(activeSlide.htmlSource, sourceElementId);
        const placement = createElementPlacement(activeSlide.htmlSource, sourceElementId);
        if (!html || !placement) {
          return null;
        }

        const nextElementId = createUniqueElementId(htmlSource, `${sourceElementId}-copy`);
        const nextHtml = updateSlideElementHtmlIds(
          html,
          createIdMapForCopiedElement(html, sourceElementId, nextElementId)
        );
        htmlSource = `${htmlSource}\n<!-- ${nextElementId} reserved -->`;
        nextElementIds.push(nextElementId);

        return {
          type: "element.insert" as const,
          slideId: activeSlide.id,
          elementId: nextElementId,
          ...placement,
          html: nextHtml,
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

  function groupSelection() {
    if (!activeSlide || selectedElementIds.length < 2) {
      return;
    }

    const groupElementId = createUniqueElementId(activeSlide.htmlSource, "group-1");
    const operation = createGroupCreateOperation({
      html: activeSlide.htmlSource,
      slideId: activeSlide.id,
      groupElementId,
      elementIds: selectedElementIds,
    });

    if (operation) {
      commitOperation(operation);
      setSelectedElementIds([groupElementId]);
    }
  }

  function ungroupSelection() {
    if (!activeSlide || selectedElementIds.length !== 1 || !selectedElementId) {
      return;
    }

    const operation = createGroupUngroupOperation({
      html: activeSlide.htmlSource,
      slideId: activeSlide.id,
      groupElementId: selectedElementId,
    });

    if (operation) {
      commitOperation(operation);
      setSelectedElementIds(operation.childElementIds);
    }
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
    iframeRef,
    slideWidth,
    slideHeight,
    isEditingText,
    canUndo: undoDepth > 0,
    canRedo: redoDepth > 0,
    onCommitOperation: commitOperation,
    onSelectElementIds: setSelectedElementIds,
    onUndo: runUndo,
    onRedo: runRedo,
  });

  if (!activeSlide) {
    return <div className="grid min-h-screen place-items-center">No slides loaded.</div>;
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <EditorHeader deckTitle={resolvedDeckTitle} sourceLabel={sourceLabel} isSaving={isSaving} />

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
          />

          <main className="flex min-h-0 min-w-0 flex-auto overflow-visible max-[1200px]:block">
            <StageCanvas
              slideWidth={slideWidth}
              slideHeight={slideHeight}
              offsetX={offsetX}
              offsetY={offsetY}
              scale={scale}
              selectionOverlay={unifiedSelectionOverlay}
              toolbarKey={
                selectedElementIds.length
                  ? `${activeSlide.id}:${selectedElementIds.join(",")}`
                  : null
              }
              inspectedStyles={inspectedStyles}
              selectedElementType={selectedElementType}
              isEditingText={isEditingText}
              manipulationOverlay={manipulationOverlay}
              iframeRef={iframeRef}
              stageViewportRef={stageViewportRef}
              selectionOverlayRef={selectionOverlayRef}
              isManipulating={isManipulating}
              onSelectionOverlayMouseDown={(event) => {
                if (!selectedElementIds.length) {
                  return;
                }

                beginMove({
                  clientX: event.clientX,
                  clientY: event.clientY,
                  preventDefault: () => event.preventDefault(),
                  stopPropagation: () => event.stopPropagation(),
                });
              }}
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
              onSelectionOverlayDoubleClick={() => {
                if (
                  selectedElementIds.length === 1 &&
                  selectedElement?.type === "text" &&
                  selectedElementId
                ) {
                  beginTextEditing(selectedElementId);
                }
              }}
              onBackgroundClick={() => {
                if (!suppressBackgroundClear) {
                  clearSelection();
                }
              }}
              onStyleChange={commitStyleChange}
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
    </TooltipProvider>
  );
}

export { SlidesEditor };
export * from "../core";
