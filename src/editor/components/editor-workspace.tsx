import { PanelLeft } from "lucide-react";
import { type MouseEvent as ReactMouseEvent, type RefObject, useState } from "react";
import type { EditableType, PdfExportSelection, SlideModel, StageRect } from "../../core";
import type { BlockManipulationOverlay as BlockManipulationOverlayModel } from "../hooks/block-manipulation-types";
import type { ImageCropOverlay as ImageCropOverlayModel } from "../hooks/use-image-crop";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import { EditorHeader } from "./editor-header";
import { FloatingToolbar, type SelectionCommandAvailability } from "./floating-toolbar";
import { PresenterView } from "./presenter-view";
import { SlideSidebar } from "./slide-sidebar";
import { StageCanvas } from "./stage-canvas";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type ResizeHandleCorner = "top-left" | "top-right" | "bottom-right" | "bottom-left";

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
  onAddSlide: () => void;
  onAddSlideAbove: (slideId: string) => void;
  onAddSlideBelow: (slideId: string) => void;
  onDuplicateSlide: (slideId: string) => void;
  onDeleteSlide: (slideId: string) => void;
  onToggleSlideHidden: (slideId: string) => void;
  onRenameSlide: (slideId: string, nextTitle: string) => void;
  onReorderSlide: (slideId: string, targetIndex: number) => void;
  onSelectionOverlayMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onSelectionOverlayMouseUp: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onSelectionOverlayMouseMove: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onSelectionOverlayContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onStageMouseLeave: () => void;
  onResizeHandleMouseDown: (
    corner: ResizeHandleCorner,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => void;
  onRotateHandleMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onCropHandleMouseDown: (
    corner: ResizeHandleCorner,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => void;
  onSelectionOverlayDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onBackgroundClick: () => void;
  onStyleChange: (propertyName: string, nextValue: string) => void;
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
  onAddSlide,
  onAddSlideAbove,
  onAddSlideBelow,
  onDuplicateSlide,
  onDeleteSlide,
  onToggleSlideHidden,
  onRenameSlide,
  onReorderSlide,
  onSelectionOverlayMouseDown,
  onSelectionOverlayMouseUp,
  onSelectionOverlayMouseMove,
  onSelectionOverlayContextMenu,
  onStageMouseLeave,
  onResizeHandleMouseDown,
  onRotateHandleMouseDown,
  onCropHandleMouseDown,
  onSelectionOverlayDoubleClick,
  onBackgroundClick,
  onStyleChange,
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
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const shouldShowToolbarControls =
    toolbarKey !== null &&
    selectionOverlay !== null &&
    !isManipulating &&
    !isToolbarSuppressed &&
    !isEditingText &&
    !isCropMode;

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
            {sidebarVisible ? (
              <SlideSidebar
                slides={slides}
                activeSlideId={activeSlide.id}
                slideCount={slides.length}
                thumbnails={thumbnails}
                onSelectSlide={onSelectSlide}
                onAdd={onAddSlide}
                onAddSlideAbove={onAddSlideAbove}
                onAddSlideBelow={onAddSlideBelow}
                onDuplicate={onDuplicateSlide}
                onDelete={onDeleteSlide}
                onToggleHidden={onToggleSlideHidden}
                onRename={onRenameSlide}
                onReorder={onReorderSlide}
              />
            ) : null}

            <div className="flex min-h-0 min-w-0 flex-auto flex-col overflow-hidden max-[1200px]:block">
              <div
                className="flex min-h-14 min-w-0 shrink-0 items-center gap-2 border-b border-foreground/[0.06] bg-background/95 px-3 py-2"
                data-testid="floating-toolbar-anchor"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={sidebarVisible ? "secondary" : "outline"}
                      size="icon-sm"
                      className="shrink-0"
                      aria-label="Toggle sidebar"
                      aria-pressed={sidebarVisible}
                      onClick={() => setSidebarVisible((current) => !current)}
                    >
                      <PanelLeft className="size-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Toggle sidebar</TooltipContent>
                </Tooltip>

                <div className="min-w-0 flex-auto overflow-x-auto overflow-y-hidden">
                  {shouldShowToolbarControls ? (
                    <FloatingToolbar
                      key={toolbarKey}
                      inspectedStyles={inspectedStyles}
                      selectedElementType={selectedElementType}
                      selectionCommandAvailability={selectionCommandAvailability}
                      isSelectedElementLocked={isSelectedElementLocked}
                      attributeValues={attributeValues}
                      onStyleChange={onStyleChange}
                      onStylePreview={onStylePreview}
                      onAttributeChange={onAttributeChange}
                      onAlignToSlide={onAlignToSlide}
                      onCropImage={onCropImage}
                      onDistribute={onDistribute}
                      onGroup={onGroup}
                      onLayerOrder={onLayerOrder}
                      onUngroup={onUngroup}
                    />
                  ) : toolbarKey === null ? (
                    <div className="flex h-8 items-center text-sm text-foreground/45">
                      Select element to edit
                    </div>
                  ) : (
                    <div className="h-8" aria-hidden="true" />
                  )}
                </div>
              </div>

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
                  selectionCommandAvailability={selectionCommandAvailability}
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
                  onSelectionOverlayMouseDown={onSelectionOverlayMouseDown}
                  onSelectionOverlayMouseMove={onSelectionOverlayMouseMove}
                  onSelectionOverlayContextMenu={onSelectionOverlayContextMenu}
                  onSelectionOverlayMouseUp={onSelectionOverlayMouseUp}
                  onStageMouseLeave={onStageMouseLeave}
                  onResizeHandleMouseDown={onResizeHandleMouseDown}
                  onRotateHandleMouseDown={onRotateHandleMouseDown}
                  onCropHandleMouseDown={onCropHandleMouseDown}
                  onSelectionOverlayDoubleClick={onSelectionOverlayDoubleClick}
                  onBackgroundClick={onBackgroundClick}
                  onAlignToSlide={onAlignToSlide}
                  onDistribute={onDistribute}
                  onGroup={onGroup}
                  onLayerOrder={onLayerOrder}
                  onUngroup={onUngroup}
                  onDuplicate={onDuplicateElement}
                  onDelete={onDeleteElement}
                />
              </main>
            </div>
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
