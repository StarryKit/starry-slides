import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type SlideModel,
  elementRectToStageRect,
} from "@html-slides-editor/core";
import { useSlidesData } from "@html-slides-editor/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SlideSidebar } from "./components/slide-sidebar";
import { StageCanvas } from "./components/stage-canvas";
import { StyleInspector } from "./components/style-inspector";
import { useSlideThumbnails } from "./hooks/use-slide-thumbnails";
import { type CssPropertyRow, collectCssProperties } from "./lib/collect-css-properties";
import "./styles/index.css";

function SlidesEditorStage() {
  const { slides: loadedSlides, sourceLabel } = useSlidesData();
  const [slides, setSlides] = useState<SlideModel[]>(loadedSlides);
  const [activeSlideId, setActiveSlideId] = useState(loadedSlides[0]?.id ?? "");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectionOverlay, setSelectionOverlay] = useState<ReturnType<
    typeof elementRectToStageRect
  > | null>(null);
  const [inspectedStyles, setInspectedStyles] = useState<CssPropertyRow[]>([]);
  const [inspectedLabel, setInspectedLabel] = useState("slide root");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const thumbnails = useSlideThumbnails(slides);

  useEffect(() => {
    setSlides(loadedSlides);
    setActiveSlideId(loadedSlides[0]?.id ?? "");
    setSelectedElementId(null);
  }, [loadedSlides]);

  const activeSlide = useMemo(
    () => slides.find((slide) => slide.id === activeSlideId) ?? slides[0],
    [activeSlideId, slides]
  );

  const selectedElement = activeSlide?.elements.find((element) => element.id === selectedElementId);

  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!viewport) {
      return;
    }

    const updateViewport = () => {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };

    updateViewport();

    const observer = new ResizeObserver(() => {
      updateViewport();
    });
    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!activeSlide) {
    return <div className="hse-empty">No slides loaded.</div>;
  }

  const slideWidth = activeSlide.width || DEFAULT_SLIDE_WIDTH;
  const slideHeight = activeSlide.height || DEFAULT_SLIDE_HEIGHT;
  const stageScale = Math.min(
    viewportSize.width > 0 ? viewportSize.width / slideWidth : 1,
    viewportSize.height > 0 ? viewportSize.height / slideHeight : 1
  );
  const safeScale = Number.isFinite(stageScale) && stageScale > 0 ? stageScale : 1;
  const scaledWidth = slideWidth * safeScale;
  const scaledHeight = slideHeight * safeScale;
  const offsetX = Math.max((viewportSize.width - scaledWidth) / 2, 0);
  const offsetY = Math.max((viewportSize.height - scaledHeight) / 2, 0);
  const selectionLabel = selectedElement?.type || "element";

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const doc = iframe.contentDocument;
    if (!doc) {
      return;
    }

    doc.open();
    doc.write(activeSlide.htmlSource);
    doc.close();

    doc.onclick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        setSelectedElementId(null);
        return;
      }

      const editableTarget = target.closest("[data-editable][data-editor-id]");
      if (!editableTarget) {
        setSelectedElementId(null);
      }
    };

    const nodes = Array.from(doc.querySelectorAll<HTMLElement>("[data-editable][data-editor-id]"));
    for (const node of nodes) {
      node.style.cursor = "pointer";
      node.onclick = (event) => {
        event.stopPropagation();
        const id = node.getAttribute("data-editor-id");
        if (id) {
          setSelectedElementId(id);
        }
      };
    }
  }, [activeSlide]);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) {
      setSelectionOverlay(null);
      setInspectedStyles([]);
      setInspectedLabel("slide root");
      return;
    }

    const rootNode = doc.querySelector<HTMLElement>(activeSlide.rootSelector);
    const inspectedNode = selectedElementId
      ? doc.querySelector<HTMLElement>(`[data-editor-id="${selectedElementId}"]`)
      : rootNode;

    if (!inspectedNode) {
      setSelectionOverlay(null);
      setInspectedStyles([]);
      setInspectedLabel("slide root");
      return;
    }

    setInspectedStyles(collectCssProperties(inspectedNode));
    setInspectedLabel(
      selectedElement
        ? `${selectedElement.type} · ${selectedElement.tagName}`
        : rootNode?.tagName.toLowerCase() || "slide root"
    );

    if (!selectedElementId || !rootNode) {
      setSelectionOverlay(null);
      return;
    }

    const elementRect = inspectedNode.getBoundingClientRect();
    const rootRect = rootNode.getBoundingClientRect();

    setSelectionOverlay({
      ...elementRectToStageRect(elementRect, rootRect, {
        scale: safeScale,
        offsetX,
        offsetY,
        slideWidth,
        slideHeight,
      }),
    });
  }, [
    activeSlide,
    selectedElement,
    selectedElementId,
    safeScale,
    offsetX,
    offsetY,
    slideWidth,
    slideHeight,
  ]);

  return (
    <div className="hse-shell">
      <SlideSidebar
        slides={slides}
        activeSlideId={activeSlide.id}
        thumbnails={thumbnails}
        onSelectSlide={(slideId) => {
          setActiveSlideId(slideId);
          setSelectedElementId(null);
        }}
      />

      <main className="hse-main">
        <StageCanvas
          sourceLabel={sourceLabel}
          slideTitle={activeSlide.title}
          slideWidth={slideWidth}
          slideHeight={slideHeight}
          offsetX={offsetX}
          offsetY={offsetY}
          scale={safeScale}
          selectionOverlay={selectionOverlay}
          selectionLabel={selectionLabel}
          iframeRef={iframeRef}
          stageViewportRef={stageViewportRef}
        />
        <StyleInspector inspectedLabel={inspectedLabel} inspectedStyles={inspectedStyles} />
      </main>
    </div>
  );
}

export { SlidesEditorStage };
