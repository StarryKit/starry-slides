import type { StageRect } from "@html-slides-editor/core";
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from "react";
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
  isSelectionOverlayInteractive: boolean;
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
}

function StageCanvas({
  slideWidth,
  slideHeight,
  offsetX,
  offsetY,
  scale,
  selectionOverlay,
  selectionLabel,
  isSelectionOverlayInteractive,
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
  const toolbarKey = selectionOverlay
    ? `${selectionOverlay.x}:${selectionOverlay.y}:${selectionOverlay.width}:${selectionOverlay.height}:${selectionLabel}`
    : null;

  return (
    <section
      className="hse-stage-panel"
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
      {selectionOverlay && !isManipulating ? (
        <div
          className="hse-stage-toolbar-anchor"
          style={toolbarStyle}
          data-testid="floating-toolbar-anchor"
        >
          <FloatingToolbar key={toolbarKey} />
        </div>
      ) : null}

      <div
        className="hse-stage-frame"
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
          className="hse-slide-iframe"
          data-testid="slide-iframe"
        />
      </div>
      {selectionOverlay ? (
        <div
          ref={selectionOverlayRef}
          data-testid="selection-overlay"
          className={
            isSelectionOverlayInteractive
              ? "hse-selection-overlay hse-selection-overlay-interactive"
              : "hse-selection-overlay"
          }
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
          <div className="hse-selection-label">{selectionLabel}</div>
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
