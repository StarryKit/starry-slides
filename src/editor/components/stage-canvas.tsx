import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from "react";
import type { StageRect } from "../../core";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import type { ElementToolMode } from "../lib/element-tool-model";
import { cn } from "../lib/utils";
import { BlockManipulationOverlay } from "./block-manipulation-overlay";
import { FloatingToolbar } from "./floating-toolbar";

type ResizeHandleCorner = "top-left" | "top-right" | "bottom-right" | "bottom-left";

interface StageCanvasProps {
  slideWidth: number;
  slideHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  selectionOverlay: StageRect | null;
  toolbarKey: string | null;
  inspectedStyles: CssPropertyRow[];
  isSelectionOverlayInteractive: boolean;
  isEditingText: boolean;
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
  elementToolMode: ElementToolMode;
  attributeValues: {
    locked: string;
    altText: string;
    ariaLabel: string;
    linkUrl: string;
  };
  iframeRef: RefObject<HTMLIFrameElement | null>;
  stageViewportRef: RefObject<HTMLDivElement | null>;
  selectionOverlayRef: RefObject<HTMLDivElement | null>;
  isManipulating: boolean;
  onSelectionOverlayMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onResizeHandleMouseDown: (
    corner: ResizeHandleCorner,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => void;
  onRotateHandleMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onSelectionOverlayDoubleClick: () => void;
  onBackgroundClick: () => void;
  onStyleChange: (propertyName: string, nextValue: string) => void;
  onAttributeChange: (attributeName: string, nextValue: string) => void;
  onAlignToSlide: (action: string) => void;
  onLayerOrder: (action: string) => void;
  onModeChange: () => void;
}

function StageCanvas({
  slideWidth,
  slideHeight,
  offsetX,
  offsetY,
  scale,
  selectionOverlay,
  toolbarKey,
  inspectedStyles,
  isSelectionOverlayInteractive,
  isEditingText,
  manipulationOverlay,
  elementToolMode,
  attributeValues,
  iframeRef,
  stageViewportRef,
  selectionOverlayRef,
  isManipulating,
  onSelectionOverlayMouseDown,
  onResizeHandleMouseDown,
  onRotateHandleMouseDown,
  onSelectionOverlayDoubleClick,
  onBackgroundClick,
  onStyleChange,
  onAttributeChange,
  onAlignToSlide,
  onLayerOrder,
  onModeChange,
}: StageCanvasProps) {
  const clearSelectionIfBackground = (
    target: EventTarget | null,
    currentTarget: EventTarget | null
  ) => {
    if (target === currentTarget) {
      onBackgroundClick();
    }
  };

  const toolbarStyle: CSSProperties | undefined = selectionOverlay
    ? createToolbarStyle({ selectionOverlay, offsetX, scale, slideWidth })
    : undefined;
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
    >
      {selectionOverlay && !isManipulating && !isEditingText && elementToolMode === "floating" ? (
        <div
          className="pointer-events-none absolute z-40 w-max max-[1200px]:static max-[1200px]:mb-4 max-[1200px]:pointer-events-auto"
          style={toolbarStyle}
          data-testid="floating-toolbar-anchor"
        >
          <FloatingToolbar
            key={toolbarKey}
            inspectedStyles={inspectedStyles}
            attributeValues={attributeValues}
            onStyleChange={onStyleChange}
            onAttributeChange={onAttributeChange}
            onAlignToSlide={onAlignToSlide}
            onLayerOrder={onLayerOrder}
            onModeChange={onModeChange}
          />
        </div>
      ) : null}

      {isEditingText ? (
        <p className="absolute left-10 top-4 z-40 rounded-md border border-foreground/[0.06] bg-white px-3 py-2 text-[12px] leading-normal text-foreground/65 shadow-sm">
          Editing text. Press Enter to save or Escape to cancel.
        </p>
      ) : null}

      <div
        className="absolute origin-top-left overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_12px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] max-[1200px]:max-w-full"
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
          className="size-full border-0 bg-white"
          data-testid="slide-iframe"
        />
      </div>
      {selectionOverlay && !isEditingText ? (
        <div
          ref={selectionOverlayRef}
          data-testid="selection-overlay"
          className={cn(
            "pointer-events-none absolute z-[3] border border-dashed border-foreground/55 bg-foreground/[0.02]",
            isSelectionOverlayInteractive && "pointer-events-auto"
          )}
          style={{
            left: `${selectionOverlay.x}px`,
            top: `${selectionOverlay.y}px`,
            width: `${selectionOverlay.width}px`,
            height: `${selectionOverlay.height}px`,
          }}
          onMouseDown={onSelectionOverlayMouseDown}
          onDoubleClick={() => {
            onSelectionOverlayDoubleClick();
          }}
        />
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

function createToolbarStyle({
  selectionOverlay,
  offsetX,
  scale,
  slideWidth,
}: {
  selectionOverlay: StageRect;
  offsetX: number;
  scale: number;
  slideWidth: number;
}): CSSProperties {
  const toolbarHalfWidth = 288;
  const slideLeft = offsetX;
  const slideRight = offsetX + slideWidth * scale;
  const slideHalfWidth = Math.max((slideRight - slideLeft) / 2, 0);
  const inset = Math.min(toolbarHalfWidth, slideHalfWidth);
  const minCenterX = slideLeft + inset;
  const maxCenterX = slideRight - inset;
  const targetCenterX = selectionOverlay.x + selectionOverlay.width / 2;
  const centerX = Math.min(Math.max(targetCenterX, minCenterX), Math.max(minCenterX, maxCenterX));

  return {
    left: `${centerX}px`,
    top:
      selectionOverlay.y < 84
        ? `${selectionOverlay.y + selectionOverlay.height + 18}px`
        : `${selectionOverlay.y - 18}px`,
    transform: selectionOverlay.y < 84 ? "translate(-50%, 0)" : "translate(-50%, -100%)",
  };
}

export { StageCanvas };
