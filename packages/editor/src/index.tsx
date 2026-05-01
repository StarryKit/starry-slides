import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type SlideModel,
} from "@html-slides-editor/core";
import { useRef, useState } from "react";
import { EditorHeader } from "./components/editor-header";
import { SlideSidebar } from "./components/slide-sidebar";
import { StageCanvas } from "./components/stage-canvas";
import { StyleInspector } from "./components/style-inspector";
import { useIframeTextEditing } from "./hooks/use-iframe-text-editing";
import { useSlideHistory } from "./hooks/use-slide-history";
import { useSlideInspector } from "./hooks/use-slide-inspector";
import { useSlideThumbnails } from "./hooks/use-slide-thumbnails";
import { useStageViewport } from "./hooks/use-stage-viewport";
import "./styles/index.css";

export interface SlidesEditorProps {
  slides: SlideModel[];
  deckTitle?: string;
  sourceLabel: string;
}

function SlidesEditor({ slides: loadedSlides, deckTitle, sourceLabel }: SlidesEditorProps) {
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
  } = useSlideHistory(loadedSlides);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const thumbnails = useSlideThumbnails(slides);
  const { selectedElementId, isEditingText, setSelectedElementId, clearSelection } =
    useIframeTextEditing({
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
  const { selectionOverlay, selectionLabel, inspectedLabel, inspectedStyles } = useSlideInspector({
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

  if (!activeSlide) {
    return <div className="hse-empty">No slides loaded.</div>;
  }

  return (
    <div className="hse-shell">
      <EditorHeader
        deckTitle={resolvedDeckTitle}
        sourceLabel={sourceLabel}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => {
          setIsInspectorOpen((currentValue) => !currentValue);
        }}
      />

      <div className="hse-workspace">
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

        <main className="hse-main">
          <StageCanvas
            slideWidth={slideWidth}
            slideHeight={slideHeight}
            offsetX={offsetX}
            offsetY={offsetY}
            scale={scale}
            selectionOverlay={selectionOverlay}
            selectionLabel={selectionLabel}
            iframeRef={iframeRef}
            stageViewportRef={stageViewportRef}
            onBackgroundClick={clearSelection}
          />
          <StyleInspector
            inspectedLabel={inspectedLabel}
            inspectedStyles={inspectedStyles}
            canUndo={undoDepth > 0}
            canRedo={redoDepth > 0}
            isEditingText={isEditingText}
            isOpen={isInspectorOpen}
            onUndo={runUndo}
            onRedo={runRedo}
          />
        </main>
      </div>
    </div>
  );
}

export { SlidesEditor };
