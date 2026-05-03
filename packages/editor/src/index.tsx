import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type SlideModel,
  type StyleUpdateOperation,
} from "@starry-slides/core";
import { useRef, useState } from "react";
import { EditorHeader } from "./components/editor-header";
import { SidebarToolPanel } from "./components/sidebar-tool-panel";
import { SlideSidebar } from "./components/slide-sidebar";
import { StageCanvas } from "./components/stage-canvas";
import { TooltipProvider } from "./components/ui/tooltip";
import { useBlockManipulation } from "./hooks/use-block-manipulation";
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

function getInlineStyleValue(slide: SlideModel, elementId: string, propertyName: string) {
  if (typeof DOMParser === "undefined") {
    return "";
  }

  const doc = new DOMParser().parseFromString(slide.htmlSource, "text/html");
  const node = doc.querySelector<HTMLElement>(`[data-editor-id="${elementId}"]`);
  return node?.style.getPropertyValue(propertyName).trim() || "";
}

function SlidesEditor({
  slides: loadedSlides,
  deckTitle,
  sourceLabel,
  isSaving = false,
  onSlidesChange,
}: SlidesEditorProps) {
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
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
    isEditingText,
    setSelectedElementId,
    beginTextEditing,
    clearSelection,
  } = useIframeTextEditing({
    activeSlide,
    iframeRef,
    canUndo: undoDepth > 0,
    canRedo: redoDepth > 0,
    onCommitOperation: commitOperation,
    onUndo: runUndo,
    onRedo: runRedo,
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
      selectedElementId,
      scale,
      offsetX,
      offsetY,
      slideWidth,
      slideHeight,
    });
  const selectedInlineStyleValues: Record<string, string> =
    activeSlide && selectedElementId
      ? {
          transform: getInlineStyleValue(activeSlide, selectedElementId, "transform"),
          zIndex: getInlineStyleValue(activeSlide, selectedElementId, "z-index"),
        }
      : {};
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

  function deleteSelectedElement() {
    if (!selectedElementId) {
      return;
    }

    commitStyleChange("display", "none");
    setSelectedElementId(null);
  }

  if (!activeSlide) {
    return <div className="grid min-h-screen place-items-center">No slides loaded.</div>;
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <EditorHeader
          deckTitle={resolvedDeckTitle}
          sourceLabel={sourceLabel}
          isSaving={isSaving}
          isInspectorOpen={isInspectorOpen}
          onToggleInspector={() => {
            setIsInspectorOpen((currentValue) => !currentValue);
          }}
        />

        <div className="flex min-h-0 flex-auto gap-[18px] overflow-hidden max-[1200px]:block">
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

          <main className="flex min-h-0 min-w-0 flex-auto gap-[18px] overflow-visible max-[1200px]:block">
            <StageCanvas
              slideWidth={slideWidth}
              slideHeight={slideHeight}
              offsetX={offsetX}
              offsetY={offsetY}
              scale={scale}
              selectionOverlay={unifiedSelectionOverlay}
              selectionLabel={unifiedSelectionLabel}
              toolbarKey={selectedElementId ? `${activeSlide.id}:${selectedElementId}` : null}
              inspectedStyles={inspectedStyles}
              inlineStyleValues={selectedInlineStyleValues}
              isSelectionOverlayInteractive={isSelectionOverlayInteractive}
              isEditingText={isEditingText}
              manipulationOverlay={manipulationOverlay}
              iframeRef={iframeRef}
              stageViewportRef={stageViewportRef}
              selectionOverlayRef={selectionOverlayRef}
              isManipulating={isManipulating}
              onSelectionOverlayMouseDown={(event) => {
                beginMove({
                  clientX: event.clientX,
                  clientY: event.clientY,
                  preventDefault: () => event.preventDefault(),
                  stopPropagation: () => event.stopPropagation(),
                });
              }}
              onResizeHandleMouseDown={(corner, event) => {
                beginResize(corner, {
                  clientX: event.clientX,
                  clientY: event.clientY,
                  preventDefault: () => event.preventDefault(),
                  stopPropagation: () => event.stopPropagation(),
                });
              }}
              onRotateHandleMouseDown={(event) => {
                beginRotate({
                  clientX: event.clientX,
                  clientY: event.clientY,
                  preventDefault: () => event.preventDefault(),
                  stopPropagation: () => event.stopPropagation(),
                });
              }}
              onSelectionOverlayDoubleClick={() => {
                if (selectedElement?.type === "text" && selectedElementId) {
                  beginTextEditing(selectedElementId);
                }
              }}
              onBackgroundClick={() => {
                if (!suppressBackgroundClear) {
                  clearSelection();
                }
              }}
              onStyleChange={commitStyleChange}
              onDeleteSelection={deleteSelectedElement}
            />
            <SidebarToolPanel
              inspectedStyles={inspectedStyles}
              isEditingText={isEditingText}
              isOpen={isInspectorOpen}
              canEditStyles={Boolean(activeSlide)}
              selectedElementId={selectedElementId}
              onStyleChange={commitStyleChange}
            />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export { SlidesEditor };
