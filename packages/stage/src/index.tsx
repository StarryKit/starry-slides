import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type SlideModel,
  type SlideOperation,
  type TextUpdateOperation,
  applySlideOperation,
  elementRectToStageRect,
  invertSlideOperation,
} from "@html-slides-editor/core";
import { useSlidesData } from "@html-slides-editor/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SlideSidebar } from "./components/slide-sidebar";
import { StageCanvas } from "./components/stage-canvas";
import { StyleInspector } from "./components/style-inspector";
import { useSlideThumbnails } from "./hooks/use-slide-thumbnails";
import { type CssPropertyRow, collectCssProperties } from "./lib/collect-css-properties";
import "./styles/index.css";

interface TextEditingState {
  slideId: string;
  elementId: string;
  initialText: string;
}

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
  const [textEditing, setTextEditing] = useState<TextEditingState | null>(null);
  const [undoStack, setUndoStack] = useState<SlideOperation[]>([]);
  const [redoStack, setRedoStack] = useState<SlideOperation[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const textEditingRef = useRef<TextEditingState | null>(null);
  const commitTextEditRef = useRef<(elementId: string, nextText: string) => void>(() => {});
  const cancelTextEditRef = useRef<() => void>(() => {});
  const runUndoRef = useRef<() => void>(() => {});
  const runRedoRef = useRef<() => void>(() => {});
  const thumbnails = useSlideThumbnails(slides);

  function updateSlidesWithOperation(operation: SlideOperation) {
    setSlides((currentSlides) =>
      currentSlides.map((slide) => applySlideOperation(slide, operation))
    );
  }

  function commitTextEdit(elementId: string, nextText: string) {
    const active = activeSlide;
    const editing = textEditing;
    if (!active || !editing || editing.slideId !== active.id || editing.elementId !== elementId) {
      setTextEditing(null);
      return;
    }

    const normalizedText = nextText.trim();
    const previousText = editing.initialText.trim();
    setTextEditing(null);

    if (normalizedText === previousText) {
      return;
    }

    const operation: TextUpdateOperation = {
      type: "text.update",
      slideId: active.id,
      elementId,
      previousText,
      nextText: normalizedText,
      timestamp: Date.now(),
    };

    updateSlidesWithOperation(operation);
    setUndoStack((current) => [...current, operation]);
    setRedoStack([]);
  }

  function cancelTextEdit() {
    const iframe = iframeRef.current;
    const editing = textEditingRef.current;
    const doc = iframe?.contentDocument;

    if (editing && doc) {
      const editableNode = doc.querySelector<HTMLElement>(
        `[data-editor-id="${editing.elementId}"]`
      );

      if (editableNode) {
        editableNode.textContent = editing.initialText;
      }
    }

    setTextEditing(null);
  }

  function runUndo() {
    setUndoStack((currentUndo) => {
      const operation = currentUndo[currentUndo.length - 1];
      if (!operation) {
        return currentUndo;
      }

      const inverse = invertSlideOperation(operation);
      updateSlidesWithOperation(inverse);
      setRedoStack((currentRedo) => [...currentRedo, operation]);
      setTextEditing(null);
      return currentUndo.slice(0, -1);
    });
  }

  function runRedo() {
    setRedoStack((currentRedo) => {
      const operation = currentRedo[currentRedo.length - 1];
      if (!operation) {
        return currentRedo;
      }

      updateSlidesWithOperation(operation);
      setUndoStack((currentUndo) => [...currentUndo, operation]);
      setTextEditing(null);
      return currentRedo.slice(0, -1);
    });
  }

  useEffect(() => {
    setSlides(loadedSlides);
    setActiveSlideId(loadedSlides[0]?.id ?? "");
    setSelectedElementId(null);
    setTextEditing(null);
    setUndoStack([]);
    setRedoStack([]);
  }, [loadedSlides]);

  useEffect(() => {
    textEditingRef.current = textEditing;
  }, [textEditing]);

  commitTextEditRef.current = commitTextEdit;
  cancelTextEditRef.current = cancelTextEdit;
  runUndoRef.current = runUndo;
  runRedoRef.current = runRedo;

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
  const isEditingText = textEditing?.slideId === activeSlide.id;

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

    const beginTextEdit = (node: HTMLElement) => {
      const elementId = node.getAttribute("data-editor-id");
      if (!elementId) {
        return;
      }

      const initialText = node.textContent || "";
      setSelectedElementId(elementId);
      setTextEditing({
        slideId: activeSlide.id,
        elementId,
        initialText,
      });
    };

    const commitNodeText = (node: HTMLElement) => {
      const elementId = node.getAttribute("data-editor-id");
      if (!elementId) {
        return;
      }

      commitTextEditRef.current(elementId, node.textContent || "");
    };

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
      node.ondblclick = null;
      node.onblur = null;
      node.onkeydown = null;
      node.onclick = (event) => {
        event.stopPropagation();
        const id = node.getAttribute("data-editor-id");
        if (id) {
          setSelectedElementId(id);
        }
      };

      if (node.getAttribute("data-editable") !== "text") {
        continue;
      }

      node.ondblclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        beginTextEdit(node);
      };
    }
  }, [activeSlide]);

  useEffect(() => {
    const editing = textEditing;
    if (!editing || editing.slideId !== activeSlide.id) {
      return;
    }

    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) {
      return;
    }

    const editableNode = doc.querySelector<HTMLElement>(`[data-editor-id="${editing.elementId}"]`);
    if (!editableNode) {
      return;
    }

    const commitNodeText = () => {
      commitTextEditRef.current(editing.elementId, editableNode.textContent || "");
    };

    editableNode.setAttribute("contenteditable", "plaintext-only");
    editableNode.setAttribute("spellcheck", "false");
    editableNode.setAttribute("data-hse-editing", "true");
    editableNode.style.cursor = "text";
    editableNode.focus();

    const selection = editableNode.ownerDocument.getSelection();
    const range = editableNode.ownerDocument.createRange();
    range.selectNodeContents(editableNode);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);

    editableNode.onkeydown = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        commitNodeText();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelTextEditRef.current();
      }
    };

    editableNode.onblur = () => {
      if (textEditingRef.current?.elementId === editing.elementId) {
        commitNodeText();
      }
    };
  }, [activeSlide.id, textEditing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isUndo =
        (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z";
      const isRedo =
        (event.metaKey || event.ctrlKey) &&
        ((event.shiftKey && event.key.toLowerCase() === "z") || event.key.toLowerCase() === "y");

      if (textEditingRef.current) {
        return;
      }

      if (isUndo && undoStack.length > 0) {
        event.preventDefault();
        runUndoRef.current();
        return;
      }

      if (isRedo && redoStack.length > 0) {
        event.preventDefault();
        runRedoRef.current();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [redoStack.length, undoStack.length]);

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
        <StyleInspector
          inspectedLabel={inspectedLabel}
          inspectedStyles={inspectedStyles}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          isEditingText={isEditingText}
          onUndo={runUndo}
          onRedo={runRedo}
        />
      </main>
    </div>
  );
}

export { SlidesEditorStage };
