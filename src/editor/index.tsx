import { useCallback, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type PdfExportSelection,
  type SlideModel,
} from "../core";
import { EditorWorkspace } from "./components/editor-workspace";
import { useBlockManipulation } from "./hooks/use-block-manipulation";
import { useEditorElementActions } from "./hooks/use-editor-element-actions";
import { useEditorKeyboardShortcuts } from "./hooks/use-editor-keyboard-shortcuts";
import { useEditorSlideActions } from "./hooks/use-editor-slide-actions";
import { useIframeTextEditing } from "./hooks/use-iframe-text-editing";
import { useImageCrop } from "./hooks/use-image-crop";
import { useMarqueeSelection } from "./hooks/use-marquee-selection";
import { useSelectionOverlayActions } from "./hooks/use-selection-overlay-actions";
import { useSlideHistory } from "./hooks/use-slide-history";
import { useSlideInspector } from "./hooks/use-slide-inspector";
import { useSlideThumbnails } from "./hooks/use-slide-thumbnails";
import { useStageViewport } from "./hooks/use-stage-viewport";
import { hasDirectEditableChildren } from "./lib/editor-selection-structure";

export interface SlidesEditorProps {
  slides: SlideModel[];
  deckTitle?: string;
  isSaving?: boolean;
  onSlidesChange?: (slides: SlideModel[]) => void;
  onDeckTitleChange?: (title: string) => void;
  onExportPdf?: (selection: PdfExportSelection) => void;
  onExportHtml?: () => void;
  onExportSourceFiles?: () => void;
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
  onExportSourceFiles,
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
  const { marqueeOverlay, isMarqueeSelecting } = useMarqueeSelection({
    activeGroupScopeId,
    activeSlide,
    iframeRef,
    isEditingText,
    onClearPreselection: clearPreselection,
    onSelectElementIds: setSelectedElementIds,
    selectedElementIds,
    stageGeometry: {
      scale,
      offsetX,
      offsetY,
      slideWidth,
      slideHeight,
    },
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
  const elementActions = useEditorElementActions({
    activeSlide,
    iframeRef,
    selectedElementId,
    selectedElementIds,
    isSelectedElementLocked,
    selectionOverlay: unifiedSelectionOverlay,
    stage: { offsetX, offsetY, scale, width: slideWidth, height: slideHeight },
    onCommitOperation: commitOperation,
    onSelectElementIds: setSelectedElementIds,
    onLockedElementIdsBySlideIdChange: setLockedElementIdsBySlideId,
  });
  const imageCrop = useImageCrop({
    activeSlide,
    selectedElementId,
    selectedElementType,
    selectedStageRect,
    stageGeometry: { offsetX, offsetY, scale, slideWidth, slideHeight },
    iframeRef,
    isEditingText,
    isSelectedElementLocked,
    onCommitOperation: commitOperation,
  });

  const slideActions = useEditorSlideActions({
    slides,
    activeSlide,
    activeSlideId,
    onCommitOperation: commitOperation,
    onActiveSlideChange: (slideId) => {
      setActiveSlideId(slideId);
      setSelectedElementId(null);
    },
    onClearSelection: clearSelection,
  });
  const selectionOverlayActions = useSelectionOverlayActions({
    selectedElementId,
    selectedElementIds,
    selectedElement,
    activeGroupScopeId,
    isSelectedElementLocked,
    suppressBackgroundClear,
    iframeRef,
    overlayPointerDownRef,
    onToolbarSuppressedChange: setIsToolbarSuppressed,
    onPointerPreselectionUpdate: updatePointerPreselection,
    onPointerSelectionRetarget: retargetPointerSelection,
    onSelectionContextMenuOpen: openSelectionContextMenu,
    onBeginMove: beginMove,
    onBeginResize: beginResize,
    onBeginRotate: beginRotate,
    onBeginTextEditing: beginTextEditing,
    onBeginGroupEditingScope: beginGroupEditingScope,
    onClearSelection: clearSelection,
  });
  const [isSidebarFocused, setIsSidebarFocused] = useState(false);
  const handleSidebarFocusChange = useCallback((focused: boolean) => {
    setIsSidebarFocused(focused);
  }, []);
  const handleBackgroundClick = useCallback(() => {
    if (imageCrop.isCropMode) {
      imageCrop.exitCropMode();
      return;
    }

    selectionOverlayActions.onBackgroundClick();
  }, [imageCrop, selectionOverlayActions]);

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
    onNavigateSlide: slideActions.selectSlideByDirection,
    onUndo: runUndo,
    onRedo: runRedo,
    isSidebarFocused,
    onDeleteSlide: slideActions.deleteSlide,
  });

  if (!activeSlide) {
    return <div className="grid min-h-screen place-items-center">No slides loaded.</div>;
  }

  return (
    <EditorWorkspace
      slides={slides}
      activeSlide={activeSlide}
      deckTitle={resolvedDeckTitle}
      isSaving={isSaving}
      isPresenting={isPresenting}
      thumbnails={thumbnails}
      slideWidth={slideWidth}
      slideHeight={slideHeight}
      offsetX={offsetX}
      offsetY={offsetY}
      scale={scale}
      preselectionOverlay={preselectionOverlay}
      marqueeOverlay={marqueeOverlay}
      selectionOverlay={unifiedSelectionOverlay}
      toolbarKey={
        selectedElementIds.length ? `${activeSlide.id}:${selectedElementIds.join(",")}` : null
      }
      inspectedStyles={inspectedStyles}
      selectedElementType={selectedElementType}
      selectionCommandAvailability={selectionCommandAvailability}
      isSelectedElementLocked={isSelectedElementLocked}
      groupScopeOverlayPassive={groupScopeOverlayPassive}
      isEditingText={isEditingText}
      isCropMode={imageCrop.isCropMode}
      cropOverlay={imageCrop.cropOverlay}
      manipulationOverlay={imageCrop.isCropMode ? null : manipulationOverlay}
      iframeRef={iframeRef}
      stageViewportRef={stageViewportRef}
      selectionOverlayRef={selectionOverlayRef}
      selectionContextMenuTriggerRef={selectionContextMenuTriggerRef}
      isManipulating={isManipulating || isMarqueeSelecting}
      isToolbarSuppressed={isToolbarSuppressed}
      onDeckTitleChange={onDeckTitleChange}
      onExportHtml={onExportHtml}
      onExportSourceFiles={onExportSourceFiles}
      onExportPdf={onExportPdf}
      onPresent={() => {
        clearSelection();
        setIsPresenting(true);
      }}
      onExitPresenting={() => setIsPresenting(false)}
      onSelectSlide={(slideId) => {
        setActiveSlideId(slideId);
        setSelectedElementId(null);
      }}
      onAddSlide={slideActions.addSlideAfterActive}
      onAddSlideAbove={slideActions.addSlideAbove}
      onAddSlideBelow={slideActions.addSlideBelow}
      onDuplicateSlide={slideActions.duplicateSlide}
      onDeleteSlide={slideActions.deleteSlide}
      onToggleSlideHidden={slideActions.toggleSlideHidden}
      onRenameSlide={slideActions.renameSlide}
      onReorderSlide={slideActions.reorderSlide}
      onSidebarFocusChange={handleSidebarFocusChange}
      onSelectionOverlayMouseDown={selectionOverlayActions.onSelectionOverlayMouseDown}
      onSelectionOverlayMouseMove={selectionOverlayActions.onSelectionOverlayMouseMove}
      onSelectionOverlayContextMenu={selectionOverlayActions.onSelectionOverlayContextMenu}
      onSelectionOverlayMouseUp={selectionOverlayActions.onSelectionOverlayMouseUp}
      onStageMouseLeave={clearPreselection}
      onResizeHandleMouseDown={selectionOverlayActions.onResizeHandleMouseDown}
      onRotateHandleMouseDown={selectionOverlayActions.onRotateHandleMouseDown}
      onCropHandleMouseDown={imageCrop.beginCropResize}
      onSelectionOverlayDoubleClick={selectionOverlayActions.onSelectionOverlayDoubleClick}
      onBackgroundClick={handleBackgroundClick}
      onStyleChange={elementActions.commitStyleChange}
      onStylePreview={elementActions.previewStyleChange}
      onAttributeChange={elementActions.commitAttributeChange}
      onAlignToSlide={elementActions.commitArrangeAction}
      onCropImage={imageCrop.beginCropMode}
      onDistribute={elementActions.distributeSelection}
      onGroup={elementActions.groupSelection}
      onLayerOrder={elementActions.commitLayerAction}
      onUngroup={elementActions.ungroupSelection}
      onDuplicateElement={elementActions.duplicateSelection}
      onDeleteElement={elementActions.deleteSelection}
      attributeValues={elementActions.attributeValues}
    />
  );
}

export { SlidesEditor };
export * from "../core";
