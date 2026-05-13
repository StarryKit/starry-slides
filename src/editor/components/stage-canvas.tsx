import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import type { StageRect } from "../../core";
import type { ImageCropOverlay as ImageCropOverlayModel } from "../hooks/use-image-crop";
import type { SelectionCommandAvailability } from "./floating-toolbar";
import { cn } from "../lib/utils";
import { BlockManipulationOverlay } from "./block-manipulation-overlay";
import { SelectionContextMenuContent } from "./context-menu";
import { ImageCropOverlay } from "./image-crop-overlay";
import { ContextMenu, ContextMenuTrigger } from "./ui/context-menu";

type ResizeHandleCorner = "top-left" | "top-right" | "bottom-right" | "bottom-left";
const SELECTION_CHROME_STYLE = {
  borderColor: "#facc15",
  backgroundColor: "rgba(250, 204, 21, 0.08)",
  boxShadow: "0 0 0 1px rgba(24, 24, 27, 0.2)",
} as const;

interface StageCanvasProps {
  slideWidth: number;
  slideHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  preselectionOverlay: StageRect | null;
  marqueeOverlay: StageRect | null;
  selectionOverlay: StageRect | null;
  selectionCommandAvailability: SelectionCommandAvailability;
  groupScopeOverlayPassive: boolean;
  isEditingText: boolean;
  isCropMode: boolean;
  cropOverlay: ImageCropOverlayModel | null;
  manipulationOverlay: {
    selectionBounds: StageRect;
    snapGuides: Array<{
      orientation: "vertical" | "horizontal";
      start: { x: number; y: number };
      end: { x: number; y: number };
      variant: "alignment" | "spacing";
    }>;
    resizeHandles: Array<{
      corner: ResizeHandleCorner;
      x: number;
      y: number;
    }>;
    rotationHandle: { x: number; y: number };
  } | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  stageViewportRef: RefObject<HTMLDivElement | null>;
  selectionOverlayRef: RefObject<HTMLDivElement | null>;
  selectionContextMenuTriggerRef: RefObject<HTMLSpanElement | null>;
  isManipulating: boolean;
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
  onAlignToSlide: (action: string) => void;
  onDistribute: (action: string) => void;
  onGroup: () => void;
  onLayerOrder: (action: string) => void;
  onUngroup: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function StageCanvas({
  slideWidth,
  slideHeight,
  offsetX,
  offsetY,
  scale,
  preselectionOverlay,
  marqueeOverlay,
  selectionOverlay,
  selectionCommandAvailability,
  groupScopeOverlayPassive,
  isEditingText,
  isCropMode,
  cropOverlay,
  manipulationOverlay,
  iframeRef,
  stageViewportRef,
  selectionOverlayRef,
  selectionContextMenuTriggerRef,
  isManipulating,
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
  onAlignToSlide,
  onDistribute,
  onGroup,
  onLayerOrder,
  onUngroup,
  onDuplicate,
  onDelete,
}: StageCanvasProps) {
  const clearSelectionIfBackground = (
    target: EventTarget | null,
    currentTarget: EventTarget | null
  ) => {
    if (target === currentTarget) {
      onBackgroundClick();
    }
  };

  return (
    <section
      className="relative z-[5] min-h-0 min-w-0 flex-auto overflow-visible p-10 pb-6 max-[1200px]:px-5 max-[1200px]:py-4"
      data-testid="stage-panel"
      ref={stageViewportRef}
      onClick={(event) => {
        clearSelectionIfBackground(event.target, event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          clearSelectionIfBackground(event.target, event.currentTarget);
        }
      }}
      onMouseLeave={onStageMouseLeave}
    >
      <div
        className="absolute origin-top-left overflow-hidden rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_12px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] max-[1200px]:max-w-full"
        data-testid="stage-frame"
        style={{
          width: `${slideWidth}px`,
          height: `${slideHeight}px`,
          left: `${offsetX}px`,
          top: `${offsetY}px`,
          transform: `scale(${scale})`,
        }}
      >
        <iframe
          ref={iframeRef}
          title="Slide canvas"
          className="size-full border-0"
          data-testid="slide-iframe"
        />
      </div>
      {preselectionOverlay && !isEditingText && !isManipulating ? (
        <div
          data-testid="preselection-overlay"
          className="pointer-events-none absolute z-[2] border border-dashed"
          style={{
            ...SELECTION_CHROME_STYLE,
            left: `${preselectionOverlay.x}px`,
            top: `${preselectionOverlay.y}px`,
            width: `${preselectionOverlay.width}px`,
            height: `${preselectionOverlay.height}px`,
          }}
        />
      ) : null}
      {marqueeOverlay && !isEditingText ? (
        <div
          data-testid="marquee-selection-overlay"
          className="pointer-events-none absolute z-[4] border border-yellow-400 bg-yellow-400/15"
          style={{
            left: `${marqueeOverlay.x}px`,
            top: `${marqueeOverlay.y}px`,
            width: `${marqueeOverlay.width}px`,
            height: `${marqueeOverlay.height}px`,
          }}
        />
      ) : null}
      {!isEditingText ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <span
              ref={selectionContextMenuTriggerRef}
              data-testid="selection-context-menu-trigger"
              className="pointer-events-none absolute size-0"
              aria-hidden="true"
            />
          </ContextMenuTrigger>
          <SelectionContextMenuContent
            selectionCommandAvailability={selectionCommandAvailability}
            onAlignToSlide={onAlignToSlide}
            onDelete={onDelete}
            onDistribute={onDistribute}
            onDuplicate={onDuplicate}
            onGroup={onGroup}
            onLayerOrder={onLayerOrder}
            onUngroup={onUngroup}
          />
        </ContextMenu>
      ) : null}
      {selectionOverlay && !isEditingText ? (
        <div
          ref={selectionOverlayRef}
          data-testid="selection-overlay"
          className={cn(
            "absolute z-[3] border border-dashed",
            groupScopeOverlayPassive || isCropMode ? "pointer-events-none" : "pointer-events-auto"
          )}
          style={{
            ...SELECTION_CHROME_STYLE,
            left: `${selectionOverlay.x}px`,
            top: `${selectionOverlay.y}px`,
            width: `${selectionOverlay.width}px`,
            height: `${selectionOverlay.height}px`,
          }}
          onMouseDown={onSelectionOverlayMouseDown}
          onMouseMove={onSelectionOverlayMouseMove}
          onMouseUp={onSelectionOverlayMouseUp}
          onContextMenu={onSelectionOverlayContextMenu}
          onDoubleClick={(event) => {
            onSelectionOverlayDoubleClick(event);
          }}
        />
      ) : null}
      {cropOverlay ? (
        <ImageCropOverlay overlay={cropOverlay} onCropHandleMouseDown={onCropHandleMouseDown} />
      ) : null}
      {manipulationOverlay ? (
        <BlockManipulationOverlay
          selectionBounds={manipulationOverlay.selectionBounds}
          snapGuides={manipulationOverlay.snapGuides}
          resizeHandles={manipulationOverlay.resizeHandles}
          rotationHandle={manipulationOverlay.rotationHandle}
          onResizeHandleMouseDown={onResizeHandleMouseDown}
          onRotateHandleMouseDown={onRotateHandleMouseDown}
        />
      ) : null}
    </section>
  );
}

export { StageCanvas };
