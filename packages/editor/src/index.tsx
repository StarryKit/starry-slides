import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type SlideModel,
  type TextUpdateOperation,
  createHistoryState,
  elementRectToStageRect,
  reduceHistory,
} from "@html-slides-editor/core";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
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

const EDITING_TEXT_STYLE_ID = "hse-editing-text-style";
const SELECTION_OVERLAY_PADDING_X = 8;
const SELECTION_OVERLAY_PADDING_Y = 14;
const EDITING_TEXT_STYLE = `
[data-hse-editing="true"] {
  outline: none !important;
  box-shadow: none !important;
  overflow: visible;
  caret-color: currentColor;
  white-space: pre-wrap;
  user-select: text;
  -webkit-user-select: text;
}

[data-hse-editing="true"]:focus,
[data-hse-editing="true"]:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
`;

export interface SlidesEditorProps {
  slides: SlideModel[];
  sourceLabel: string;
}

function SlidesEditor({ slides: loadedSlides, sourceLabel }: SlidesEditorProps) {
  const [historyState, dispatchHistory] = useReducer(
    reduceHistory,
    loadedSlides,
    createHistoryState
  );
  const [activeSlideId, setActiveSlideId] = useState(loadedSlides[0]?.id ?? "");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectionOverlay, setSelectionOverlay] = useState<ReturnType<
    typeof elementRectToStageRect
  > | null>(null);
  const [inspectedStyles, setInspectedStyles] = useState<CssPropertyRow[]>([]);
  const [inspectedLabel, setInspectedLabel] = useState("slide root");
  const [textEditing, setTextEditing] = useState<TextEditingState | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const textEditingRef = useRef<TextEditingState | null>(null);
  const commitTextEditRef = useRef<(elementId: string, nextText: string) => void>(() => {});
  const cancelTextEditRef = useRef<() => void>(() => {});
  const runUndoRef = useRef<() => void>(() => {});
  const runRedoRef = useRef<() => void>(() => {});
  const slides = historyState.slides;
  const undoStack = historyState.undoStack;
  const redoStack = historyState.redoStack;
  const thumbnails = useSlideThumbnails(slides);

  function commitTextEdit(elementId: string, nextText: string) {
    const active = activeSlide;
    const editing = textEditing;
    if (!active || !editing || editing.slideId !== active.id || editing.elementId !== elementId) {
      setTextEditing(null);
      return;
    }

    const previousText = editing.initialText;
    setTextEditing(null);

    if (nextText === previousText) {
      return;
    }

    const operation: TextUpdateOperation = {
      type: "text.update",
      slideId: active.id,
      elementId,
      previousText,
      nextText,
      timestamp: Date.now(),
    };

    dispatchHistory({
      type: "history.commit",
      operation,
    });
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
    dispatchHistory({ type: "history.undo" });
    setTextEditing(null);
  }

  function runRedo() {
    dispatchHistory({ type: "history.redo" });
    setTextEditing(null);
  }

  useEffect(() => {
    dispatchHistory({
      type: "history.reset",
      slides: loadedSlides,
    });
    setActiveSlideId(loadedSlides[0]?.id ?? "");
    setSelectedElementId(null);
    setTextEditing(null);
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

  const slideWidth = activeSlide?.width || DEFAULT_SLIDE_WIDTH;
  const slideHeight = activeSlide?.height || DEFAULT_SLIDE_HEIGHT;
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
    if (!activeSlide) {
      return;
    }

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

    if (!doc.getElementById(EDITING_TEXT_STYLE_ID)) {
      const style = doc.createElement("style");
      style.id = EDITING_TEXT_STYLE_ID;
      style.textContent = EDITING_TEXT_STYLE;
      doc.head.appendChild(style);
    }

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
        if (textEditingRef.current) {
          const editingNode = doc.querySelector<HTMLElement>(
            `[data-editor-id="${textEditingRef.current.elementId}"]`
          );
          if (editingNode) {
            commitNodeText(editingNode);
            return;
          }
        }

        setSelectedElementId(null);
        return;
      }

      const activeEditing = textEditingRef.current;
      if (activeEditing) {
        const editingNode = doc.querySelector<HTMLElement>(
          `[data-editor-id="${activeEditing.elementId}"]`
        );

        if (editingNode && !editingNode.contains(target)) {
          commitNodeText(editingNode);
          return;
        }

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

        if (textEditingRef.current?.elementId === node.getAttribute("data-editor-id")) {
          return;
        }

        const id = node.getAttribute("data-editor-id");
        if (id) {
          setSelectedElementId(id);
        }
      };

      if (node.getAttribute("data-editable") !== "text") {
        continue;
      }

      node.ondblclick = (event) => {
        const elementId = node.getAttribute("data-editor-id");
        const activeEditing = textEditingRef.current;

        if (
          elementId &&
          activeEditing?.slideId === activeSlide.id &&
          activeEditing.elementId === elementId
        ) {
          event.stopPropagation();
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        beginTextEdit(node);
      };
    }
  }, [activeSlide]);

  useEffect(() => {
    const editing = textEditing;
    if (!editing || !activeSlide || editing.slideId !== activeSlide.id) {
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
    let preserveSelectionOnClick = false;
    const originalInlineDisplay = editableNode.style.display;
    const originalInlineAlignItems = editableNode.style.alignItems;
    const originalInlineOverflow = editableNode.style.overflow;
    const computedStyles = editableNode.ownerDocument.defaultView?.getComputedStyle(editableNode);
    const computedDisplay = computedStyles?.display ?? "";

    editableNode.setAttribute("contenteditable", "plaintext-only");
    editableNode.setAttribute("spellcheck", "false");
    editableNode.setAttribute("data-hse-editing", "true");
    editableNode.style.cursor = "text";
    editableNode.style.overflow = "visible";

    if (computedDisplay === "inline-flex") {
      editableNode.style.display = "inline-block";
      editableNode.style.alignItems = "normal";
    } else if (
      computedDisplay === "flex" ||
      computedDisplay === "grid" ||
      computedDisplay === "inline-grid"
    ) {
      editableNode.style.display = "block";
      editableNode.style.alignItems = "normal";
    }

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

    editableNode.onmousedown = () => {
      preserveSelectionOnClick = false;
    };

    editableNode.onmouseup = () => {
      const nextSelection = editableNode.ownerDocument.getSelection();
      const anchorNode = nextSelection?.anchorNode;
      const focusNode = nextSelection?.focusNode;
      const containsAnchor = anchorNode ? editableNode.contains(anchorNode) : false;
      const containsFocus = focusNode ? editableNode.contains(focusNode) : false;

      preserveSelectionOnClick = Boolean(
        nextSelection && !nextSelection.isCollapsed && containsAnchor && containsFocus
      );
    };

    editableNode.onclick = (event) => {
      event.stopPropagation();

      if (preserveSelectionOnClick) {
        event.preventDefault();
        preserveSelectionOnClick = false;
      }
    };

    editableNode.onblur = () => {
      window.setTimeout(() => {
        if (textEditingRef.current?.elementId !== editing.elementId) {
          return;
        }

        const nextSelection = editableNode.ownerDocument.getSelection();
        const anchorNode = nextSelection?.anchorNode;
        const focusNode = nextSelection?.focusNode;
        const activeElement = editableNode.ownerDocument.activeElement;
        const selectionStaysInside =
          Boolean(nextSelection && !nextSelection.isCollapsed) &&
          Boolean(anchorNode && editableNode.contains(anchorNode)) &&
          Boolean(focusNode && editableNode.contains(focusNode));

        if (activeElement === editableNode || selectionStaysInside) {
          return;
        }

        commitNodeText();
      }, 0);
    };

    return () => {
      editableNode.removeAttribute("contenteditable");
      editableNode.removeAttribute("spellcheck");
      editableNode.removeAttribute("data-hse-editing");
      editableNode.style.cursor = "pointer";
      editableNode.style.display = originalInlineDisplay;
      editableNode.style.alignItems = originalInlineAlignItems;
      editableNode.style.overflow = originalInlineOverflow;
      editableNode.onblur = null;
      editableNode.onclick = null;
      editableNode.onkeydown = null;
      editableNode.onmousedown = null;
      editableNode.onmouseup = null;
    };
  }, [activeSlide, textEditing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

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
        event.stopPropagation();
        runUndoRef.current();
        return;
      }

      if (isRedo && redoStack.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        runRedoRef.current();
      }
    };

    const iframeDocument = iframeRef.current?.contentDocument;
    window.addEventListener("keydown", onKeyDown);
    iframeDocument?.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      iframeDocument?.removeEventListener("keydown", onKeyDown);
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

    if (!activeSlide) {
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
    const stageRect = elementRectToStageRect(elementRect, rootRect, {
      scale: safeScale,
      offsetX,
      offsetY,
      slideWidth,
      slideHeight,
    });

    setSelectionOverlay({
      x: stageRect.x - SELECTION_OVERLAY_PADDING_X,
      y: stageRect.y - SELECTION_OVERLAY_PADDING_Y,
      width: stageRect.width + SELECTION_OVERLAY_PADDING_X * 2,
      height: stageRect.height + SELECTION_OVERLAY_PADDING_Y * 2,
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

  if (!activeSlide) {
    return <div className="hse-empty">No slides loaded.</div>;
  }

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
          onBackgroundClick={() => {
            if (!textEditingRef.current) {
              setSelectedElementId(null);
            }
          }}
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

export { SlidesEditor };
