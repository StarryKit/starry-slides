import { useRef, useState } from "react";
import { EditorHeader } from "./components/editor-header";
import { SidebarToolPanel } from "./components/sidebar-tool-panel";
import { SlideSidebar } from "./components/slide-sidebar";
import { StageCanvas } from "./components/stage-canvas";
import { TooltipProvider } from "./components/ui/tooltip";
import { useBlockManipulation } from "./hooks/use-block-manipulation";
import { useEditorKeyboardShortcuts } from "./hooks/use-editor-keyboard-shortcuts";
import { useIframeTextEditing } from "./hooks/use-iframe-text-editing";
import { useSlideHistory } from "./hooks/use-slide-history";
import { useSlideInspector } from "./hooks/use-slide-inspector";
import { useSlideThumbnails } from "./hooks/use-slide-thumbnails";
import { useStageViewport } from "./hooks/use-stage-viewport";
import {
  type AttributeUpdateOperation,
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  SELECTOR_ATTR,
  type SlideModel,
  type StyleUpdateOperation,
  composeTransform,
  getSlideInlineStyleValue,
  parseTransformParts,
} from "./lib/core";
import type { ElementToolMode } from "./lib/element-tool-model";

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
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [elementToolMode, setElementToolMode] = useState<ElementToolMode>("floating");
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
  const resolvedDeckTitle = deckTitle?.trim() || "Untitled deck";

  const slideWidth = activeSlide?.width || DEFAULT_SLIDE_WIDTH;
  const slideHeight = activeSlide?.height || DEFAULT_SLIDE_HEIGHT;
  const { scale, offsetX, offsetY } = useStageViewport({
    stageViewportRef,
    slideWidth,
    slideHeight,
  });
  const { selectedStageRect, selectionOverlay, selectionLabel, inspectedStyles } =
    useSlideInspector({
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
  const unifiedSelectionLabel = manipulationOverlay
    ? selectedElement?.type || selectionLabel
    : selectionLabel;
  const isSelectionOverlayInteractive = Boolean(manipulationOverlay);
  const hasEditableSelection = Boolean(selectedElementId);

  function commitStyleChange(propertyName: string, nextValue: string) {
    if (!activeSlide) {
      return;
    }

    const targetElementId = selectedElementId ?? "slide-root";
    const previousValue = getInlineStyleValue(activeSlide, targetElementId, propertyName);
    const normalizedNextValue = nextValue.trim();

    if (previousValue === normalizedNextValue) {
      return;
    }

    const operation: StyleUpdateOperation = {
      type: "style.update",
      slideId: activeSlide.id,
      elementId: targetElementId,
      propertyName,
      previousValue,
      nextValue: normalizedNextValue,
      timestamp: Date.now(),
    };

    commitOperation(operation);
  }

  function commitAttributeChange(attributeName: string, nextValue: string) {
    if (!activeSlide) {
      return;
    }

    const targetElementId = selectedElementId ?? "slide-root";
    const previousValue = getHtmlAttributeValue(activeSlide, targetElementId, attributeName);
    const normalizedNextValue = nextValue.trim();

    if (previousValue === normalizedNextValue) {
      return;
    }

    const operation: AttributeUpdateOperation = {
      type: "attribute.update",
      slideId: activeSlide.id,
      elementId: targetElementId,
      attributeName,
      previousValue,
      nextValue: normalizedNextValue,
      timestamp: Date.now(),
    };

    commitOperation(operation);
  }

  function commitLayerAction(action: string) {
    if (!activeSlide || !selectedElementId) {
      return;
    }

    const currentValue = getInlineStyleValue(activeSlide, selectedElementId, "z-index");
    const numericZIndex = Number.parseInt(currentValue, 10);
    const currentZIndex = Number.isFinite(numericZIndex) ? numericZIndex : 0;

    if (action === "front") {
      commitStyleChange("z-index", "999");
      return;
    }

    if (action === "back") {
      commitStyleChange("z-index", "0");
      return;
    }

    commitStyleChange(
      "z-index",
      String(Math.max(0, currentZIndex + (action === "forward" ? 1 : -1)))
    );
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
        <EditorHeader
          deckTitle={resolvedDeckTitle}
          sourceLabel={sourceLabel}
          isSaving={isSaving}
          isInspectorOpen={isInspectorOpen}
          elementToolMode={elementToolMode}
          canSwitchElementToolMode={hasEditableSelection && !isEditingText && !isManipulating}
          onElementToolModeChange={setElementToolMode}
          onToggleInspector={() => {
            setIsInspectorOpen((currentValue) => !currentValue);
          }}
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
              isSelectionOverlayInteractive={isSelectionOverlayInteractive}
              isEditingText={isEditingText}
              manipulationOverlay={manipulationOverlay}
              elementToolMode={elementToolMode}
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
                if (selectedElementIds.length !== 1) {
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
              onLayerOrder={commitLayerAction}
              onModeChange={() => setElementToolMode("panel")}
              attributeValues={{
                locked: getHtmlAttributeValue(
                  activeSlide,
                  selectedElementId ?? "slide-root",
                  "data-editor-locked"
                ),
                altText: getHtmlAttributeValue(
                  activeSlide,
                  selectedElementId ?? "slide-root",
                  "alt"
                ),
                ariaLabel: getHtmlAttributeValue(
                  activeSlide,
                  selectedElementId ?? "slide-root",
                  "aria-label"
                ),
                linkUrl: getHtmlAttributeValue(
                  activeSlide,
                  selectedElementId ?? "slide-root",
                  "data-link-url"
                ),
              }}
            />
            {elementToolMode === "panel" && hasEditableSelection ? (
              <SidebarToolPanel
                inspectedStyles={inspectedStyles}
                isEditingText={isEditingText}
                isOpen={isInspectorOpen}
                canEditStyles={Boolean(activeSlide)}
                selectedElementType={selectedElement?.type ?? "block"}
                selectedElementLabel={selectedElementId ? unifiedSelectionLabel : "slide"}
                attributeValues={{
                  locked: getHtmlAttributeValue(
                    activeSlide,
                    selectedElementId ?? "slide-root",
                    "data-editor-locked"
                  ),
                  altText: getHtmlAttributeValue(
                    activeSlide,
                    selectedElementId ?? "slide-root",
                    "alt"
                  ),
                  ariaLabel: getHtmlAttributeValue(
                    activeSlide,
                    selectedElementId ?? "slide-root",
                    "aria-label"
                  ),
                  linkUrl: getHtmlAttributeValue(
                    activeSlide,
                    selectedElementId ?? "slide-root",
                    "data-link-url"
                  ),
                }}
                selectedElementId={selectedElementId}
                onStyleChange={commitStyleChange}
                onAttributeChange={commitAttributeChange}
                onAlignToSlide={commitArrangeAction}
                onLayerOrder={commitLayerAction}
                onModeChange={() => setElementToolMode("floating")}
              />
            ) : null}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function getInlineStyleValue(slide: SlideModel, elementId: string, propertyName: string) {
  return getSlideInlineStyleValue(slide, elementId, propertyName);
}

function getHtmlAttributeValue(slide: SlideModel, elementId: string, attributeName: string) {
  if (typeof DOMParser === "undefined") {
    return "";
  }

  const doc = new DOMParser().parseFromString(slide.htmlSource, "text/html");
  const node = doc.querySelector<HTMLElement>(`[${SELECTOR_ATTR}="${elementId}"]`);
  return node?.getAttribute(attributeName)?.trim() ?? "";
}

export { SlidesEditor };
export * from "./lib/core";
