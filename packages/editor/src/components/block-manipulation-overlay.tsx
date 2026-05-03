import type { MouseEvent as ReactMouseEvent } from "react";

interface Point {
  x: number;
  y: number;
}

type ResizeHandleCorner = "top-left" | "top-right" | "bottom-right" | "bottom-left";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SnapGuide {
  orientation: "vertical" | "horizontal";
  start: Point;
  end: Point;
  variant: "alignment" | "spacing";
}

interface BlockManipulationOverlayProps {
  selectionBounds: Rect;
  snapGuides: SnapGuide[];
  resizeHandles: Array<{
    corner: ResizeHandleCorner;
    x: number;
    y: number;
  }>;
  rotationHandle: Point;
  onResizeHandleMouseDown: (
    corner: ResizeHandleCorner,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => void;
  onRotateHandleMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

function BlockManipulationOverlay({
  selectionBounds: _selectionBounds,
  snapGuides,
  resizeHandles,
  rotationHandle,
  onResizeHandleMouseDown,
  onRotateHandleMouseDown,
}: BlockManipulationOverlayProps) {
  const handleClassName =
    "absolute z-[5] size-[15px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white bg-primary shadow-[0_8px_18px_rgba(76,57,36,0.18)] transition-transform duration-150 before:absolute before:inset-[2.5px] before:rounded-full before:bg-white/90 hover:scale-110";

  return (
    <>
      {snapGuides.map((guide, index) => {
        const lineWidth = guide.variant === "spacing" ? "2px" : "1px";
        return (
          <div
            key={`${guide.orientation}-${guide.start.x}-${guide.start.y}-${guide.end.x}-${guide.end.y}-${guide.variant}-${index}`}
            className="pointer-events-none absolute z-[4] border-primary"
            data-testid={`snap-guide-${guide.orientation}`}
            data-variant={guide.variant}
            style={
              guide.orientation === "vertical"
                ? {
                    left: `${guide.start.x}px`,
                    top: `${Math.min(guide.start.y, guide.end.y)}px`,
                    width: "0",
                    height: `${Math.max(Math.abs(guide.end.y - guide.start.y), 32)}px`,
                    borderLeftWidth: lineWidth,
                    borderLeftStyle: "solid",
                    opacity: guide.variant === "spacing" ? 0.9 : 0.82,
                  }
                : {
                    left: `${Math.min(guide.start.x, guide.end.x)}px`,
                    top: `${guide.start.y}px`,
                    width: `${Math.max(Math.abs(guide.end.x - guide.start.x), 32)}px`,
                    height: "0",
                    borderTopWidth: lineWidth,
                    borderTopStyle: "solid",
                    opacity: guide.variant === "spacing" ? 0.9 : 0.82,
                  }
            }
          />
        );
      })}
      <button
        type="button"
        className={`${handleClassName} cursor-alias`}
        data-testid="block-rotate-handle"
        aria-label="Rotate selected element"
        style={{
          left: `${rotationHandle.x}px`,
          top: `${rotationHandle.y}px`,
        }}
        onMouseDown={onRotateHandleMouseDown}
      />
      {resizeHandles.map((handle) => (
        <button
          key={handle.corner}
          type="button"
          className={`${handleClassName} cursor-nwse-resize`}
          data-testid={`block-resize-handle-${handle.corner}`}
          aria-label={`Resize selected element from ${handle.corner}`}
          style={{
            left: `${handle.x}px`,
            top: `${handle.y}px`,
          }}
          onMouseDown={(event) => {
            onResizeHandleMouseDown(handle.corner, event);
          }}
        />
      ))}
    </>
  );
}

export { BlockManipulationOverlay };
