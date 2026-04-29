import type { StageRect } from "@html-slides-editor/core";
import type { RefObject } from "react";

interface StageCanvasProps {
  sourceLabel: string;
  slideTitle: string;
  slideWidth: number;
  slideHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  selectionOverlay: StageRect | null;
  selectionLabel: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  stageViewportRef: RefObject<HTMLDivElement | null>;
}

function StageCanvas({
  sourceLabel,
  slideTitle,
  slideWidth,
  slideHeight,
  offsetX,
  offsetY,
  scale,
  selectionOverlay,
  selectionLabel,
  iframeRef,
  stageViewportRef,
}: StageCanvasProps) {
  return (
    <section className="hse-stage-panel" ref={stageViewportRef}>
      <h1 className="hse-stage-title">{sourceLabel}</h1>
      <div
        className="hse-stage-frame"
        style={{
          width: `${slideWidth}px`,
          height: `${slideHeight}px`,
          left: `${offsetX}px`,
          top: `${offsetY}px`,
          transform: `scale(${scale})`,
        }}
      >
        <iframe ref={iframeRef} title={slideTitle} className="hse-slide-iframe" />
      </div>
      {selectionOverlay ? (
        <div
          className="hse-selection-overlay"
          style={{
            left: `${selectionOverlay.x}px`,
            top: `${selectionOverlay.y}px`,
            width: `${selectionOverlay.width}px`,
            height: `${selectionOverlay.height}px`,
          }}
        >
          <div className="hse-selection-label">{selectionLabel}</div>
        </div>
      ) : null}
    </section>
  );
}

export { StageCanvas };
