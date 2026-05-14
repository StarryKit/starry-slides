import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import type { EditableType, PdfExportSelection, SlideModel, StageRect } from "../../core";
import type { BlockManipulationOverlay as BlockManipulationOverlayModel } from "../hooks/block-manipulation-types";
import type { ImageCropOverlay as ImageCropOverlayModel } from "../hooks/use-image-crop";
import type {
  ResizeHandleCorner,
  ResizeHandlePosition,
} from "../lib/block-snap-types";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import { EditorHeader } from "./editor-header";
import type { SelectionCommandAvailability } from "./floating-toolbar";
import { PresenterView } from "./presenter-view";
import { SlideSidebar } from "./slide-sidebar";
import { StageCanvas } from "./stage-canvas";
import { TooltipProvider } from "./ui/tooltip";

interface EditorWorkspaceProps {
  slides: SlideModel[];
  activeSlide: SlideModel;
  deckTitle: string;
  isSaving: boolean;
  isPresenting: boolean;
  thumbnails: Record<string, string>;
  slideWidth: number;
  slideHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  preselectionOverlay: StageRect | null;
  marqueeOverlay: StageRect | null;
  selectionOverlay: StageRect | null;
  toolbarKey: string | null;
  inspectedStyles: CssPropertyRow[];
  selectedElementType: EditableType | "multi";
  selectionCommandAvailability: SelectionCommandAvailability;
  isSelectedElementLocked: boolean;
  groupScopeOverlayPassive: boolean;
  isEditingText: boolean;
  isCropMode: boolean;
  cropOverlay: ImageCropOverlayModel | null;
  manipulationOverlay: BlockManipulationOverlayModel | null;
  attributeValues: {
    locked: string;
    ariaLabel: string;
    linkUrl: string;
  };
  iframeRef: RefObject<HTMLIFrameElement | null>;
  stageViewportRef: RefObject<HTMLDivElement | null>;
  selectionOverlayRef: RefObject<HTMLDivElement | null>;
  selectionContextMenuTriggerRef: RefObject<HTMLSpanElement | null>;
  isManipulating: boolean;
  isToolbarSuppressed: boolean;
  onDeckTitleChange?: (title: string) => void;
  onExportPdf?: (selection: PdfExportSelection) => void;
  onExportHtml?: () => void;
  onExportSourceFiles?: () => void;
  onPresent: () => void;
  onExitPresenting: () => void;
  onSelectSlide: (slideId: string) => void;
  onSidebarSlideFocusChange: (isFocused: boolean) => void;
  onAddSlide: () => void;
  onAddSlideAbove: (slideId: string) => void;
  onAddSlideBelow: (slideId: string) => void;
  onDuplicateSlide: (slideId: string) => void;
  onDeleteSlide: (slideId: string) => void;
  onToggleSlideHidden: (slideId: string) => void;
  onRenameSlide: (slideId: string, nextTitle: string) => void;
  onReorderSlide: (slideId: string, targetIndex: number) => void;
  onSidebarFocusChange?: (focused: boolean) => void;
  onSelectionOverlayMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onSelectionOverlayMouseUp: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onSelectionOverlayMouseMove: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onSelectionOverlayContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onStageMouseLeave: () => void;
  onResizeHandleMouseDown: (
    position: ResizeHandlePosition,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => void;
  onCornerRotationZoneMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onCropHandleMouseDown: (
    corner: ResizeHandleCorner,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => void;
  onSelectionOverlayDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onBackgroundClick: () => void;
  onStyleChange: (propertyName: string, nextValue: string) => void;
  onStyleChanges: (changes: Array<{ propertyName: string; nextValue: string }>) => void;
  onStylePreview: (propertyName: string, nextValue: string | null) => void;
  onAttributeChange: (attributeName: string, nextValue: string) => void;
  onAlignToSlide: (action: string) => void;
  onCropImage: () => void;
  onDistribute: (action: string) => void;
  onGroup: () => void;
  onLayerOrder: (action: string) => void;
  onUngroup: () => void;
  onDuplicateElement: () => void;
  onDeleteElement: () => void;
}

function EditorWorkspace({
  slides,
  activeSlide,
  deckTitle,
  isSaving,
  isPresenting,
  thumbnails,
  slideWidth,
  slideHeight,
  offsetX,
  offsetY,
  scale,
  preselectionOverlay,
  marqueeOverlay,
  selectionOverlay,
  toolbarKey,
  inspectedStyles,
  selectedElementType,
  selectionCommandAvailability,
  isSelectedElementLocked,
  groupScopeOverlayPassive,
  isEditingText,
  isCropMode,
  cropOverlay,
  manipulationOverlay,
  attributeValues,
  iframeRef,
  stageViewportRef,
  selectionOverlayRef,
  selectionContextMenuTriggerRef,
  isManipulating,
  isToolbarSuppressed,
  onDeckTitleChange,
  onExportPdf,
  onExportHtml,
  onExportSourceFiles,
  onPresent,
  onExitPresenting,
  onSelectSlide,
  onSidebarSlideFocusChange,
  onAddSlide,
  onAddSlideAbove,
  onAddSlideBelow,
  onDuplicateSlide,
  onDeleteSlide,
  onToggleSlideHidden,
  onRenameSlide,
  onReorderSlide,
  onSidebarFocusChange,
  onSelectionOverlayMouseDown,
  onSelectionOverlayMouseUp,
  onSelectionOverlayMouseMove,
  onSelectionOverlayContextMenu,
  onStageMouseLeave,
  onResizeHandleMouseDown,
  onCornerRotationZoneMouseDown,
  onCropHandleMouseDown,
  onSelectionOverlayDoubleClick,
  onBackgroundClick,
  onStyleChange,
  onStyleChanges,
  onStylePreview,
  onAttributeChange,
  onAlignToSlide,
  onCropImage,
  onDistribute,
  onGroup,
  onLayerOrder,
  onUngroup,
  onDuplicateElement,
  onDeleteElement,
}: EditorWorkspaceProps) {
  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <div
          className={`flex min-h-0 flex-auto flex-col ${
            isPresenting ? "invisible pointer-events-none absolute inset-0" : ""
          }`}
        >
          <EditorHeader
            title={deckTitle}
            onTitleChange={onDeckTitleChange}
            isSaving={isSaving}
            onPresent={onPresent}
            onExportHtml={onExportHtml}
            onExportSourceFiles={onExportSourceFiles}
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
              onSelectSlide={onSelectSlide}
              onSlideFocusChange={onSidebarSlideFocusChange}
              onAdd={onAddSlide}
              onAddSlideAbove={onAddSlideAbove}
              onAddSlideBelow={onAddSlideBelow}
              onDuplicate={onDuplicateSlide}
              onDelete={onDeleteSlide}
              onToggleHidden={onToggleSlideHidden}
              onRename={onRenameSlide}
              onReorder={onReorderSlide}
              onSidebarFocusChange={onSidebarFocusChange}
            />

            <main className="flex min-h-0 min-w-0 flex-auto overflow-visible max-[1200px]:block">
              <StageCanvas
                slideWidth={slideWidth}
                slideHeight={slideHeight}
                offsetX={offsetX}
                offsetY={offsetY}
                scale={scale}
                preselectionOverlay={preselectionOverlay}
                marqueeOverlay={marqueeOverlay}
                selectionOverlay={selectionOverlay}
                toolbarKey={toolbarKey}
                inspectedStyles={inspectedStyles}
                selectedElementType={selectedElementType}
                selectionCommandAvailability={selectionCommandAvailability}
                isSelectedElementLocked={isSelectedElementLocked}
                groupScopeOverlayPassive={groupScopeOverlayPassive}
                isEditingText={isEditingText}
                isCropMode={isCropMode}
                cropOverlay={cropOverlay}
                manipulationOverlay={manipulationOverlay}
                iframeRef={iframeRef}
                stageViewportRef={stageViewportRef}
                selectionOverlayRef={selectionOverlayRef}
                selectionContextMenuTriggerRef={selectionContextMenuTriggerRef}
                isManipulating={isManipulating}
                isToolbarSuppressed={isToolbarSuppressed}
                onSelectionOverlayMouseDown={onSelectionOverlayMouseDown}
                onSelectionOverlayMouseMove={onSelectionOverlayMouseMove}
                onSelectionOverlayContextMenu={onSelectionOverlayContextMenu}
                onSelectionOverlayMouseUp={onSelectionOverlayMouseUp}
                onStageMouseLeave={onStageMouseLeave}
                onResizeHandleMouseDown={onResizeHandleMouseDown}
                onCornerRotationZoneMouseDown={onCornerRotationZoneMouseDown}
                onCropHandleMouseDown={onCropHandleMouseDown}
                onSelectionOverlayDoubleClick={onSelectionOverlayDoubleClick}
                onBackgroundClick={onBackgroundClick}
                onStyleChange={onStyleChange}
                onStyleChanges={onStyleChanges}
                onStylePreview={onStylePreview}
                onAttributeChange={onAttributeChange}
                onAlignToSlide={onAlignToSlide}
                onCropImage={onCropImage}
                onDistribute={onDistribute}
                onGroup={onGroup}
                onLayerOrder={onLayerOrder}
                onUngroup={onUngroup}
                onDuplicate={onDuplicateElement}
                onDelete={onDeleteElement}
                attributeValues={attributeValues}
              />
            </main>
          </div>
        </div>
        {isPresenting ? (
          <PresenterView slides={slides} startSlideId={activeSlide.id} onExit={onExitPresenting} />
        ) : null}
      </div>
    </TooltipProvider>
  );
}

export { EditorWorkspace };
