import type { StageRect } from "@starry-slides/core";
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from "react";
import type { CssPropertyRow } from "../lib/collect-css-properties";
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
  selectionLabel: string;
  toolbarKey: string | null;
  inspectedStyles: CssPropertyRow[];
  inlineStyleValues: Record<string, string>;
  isSelectionOverlayInteractive: boolean;
  isEditingText: boolean;
  manipulationOverlay: {
    selectionBounds: StageRect;
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
  onDeleteSelection: () => void;
}

function StageCanvas({
  slideWidth,
  slideHeight,
  offsetX,
  offsetY,
  scale,
  selectionOverlay,
  selectionLabel,
  toolbarKey,
  inspectedStyles,
  inlineStyleValues,
  isSelectionOverlayInteractive,
  isEditingText,
  manipulationOverlay,
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
  onDeleteSelection,
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
    ? {
        left: `${selectionOverlay.x + selectionOverlay.width / 2}px`,
        top:
          selectionOverlay.y < 84
            ? `${selectionOverlay.y + selectionOverlay.height + 18}px`
            : `${selectionOverlay.y - 18}px`,
        transform: selectionOverlay.y < 84 ? "translate(-50%, 0)" : "translate(-50%, -100%)",
      }
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
      {selectionOverlay && !isManipulating && !isEditingText ? (
        <div
          className="pointer-events-none absolute z-40 w-max max-[1200px]:static max-[1200px]:mb-4 max-[1200px]:pointer-events-auto"
          style={toolbarStyle}
          data-testid="floating-toolbar-anchor"
        >
          <FloatingToolbar
            key={toolbarKey}
            inspectedStyles={inspectedStyles}
            inlineStyleValues={inlineStyleValues}
            selectionOverlay={selectionOverlay}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            slideWidth={slideWidth}
            slideHeight={slideHeight}
            onStyleChange={onStyleChange}
            onDelete={onDeleteSelection}
          />
        </div>
      ) : null}

      <div
        className="absolute origin-top-left overflow-hidden rounded-[20px] bg-card shadow-[0_18px_40px_rgba(76,57,36,0.16)] max-[1200px]:max-w-full"
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
          className="size-full border-0 bg-card"
          data-testid="slide-iframe"
        />
      </div>
      {selectionOverlay && !isEditingText ? (
        <div
          ref={selectionOverlayRef}
          data-testid="selection-overlay"
          className={cn(
            "pointer-events-none absolute z-[3] border-[2.5px] border-dashed border-primary/95",
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
        >
          <div className="pointer-events-none absolute -top-[22px] left-0 whitespace-nowrap rounded-full bg-primary px-1.5 py-0.5 text-[9px] uppercase leading-tight tracking-[0.08em] text-primary-foreground">
            {selectionLabel}
          </div>
        </div>
      ) : null}
      {manipulationOverlay ? (
        <BlockManipulationOverlay
          selectionBounds={manipulationOverlay.selectionBounds}
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
