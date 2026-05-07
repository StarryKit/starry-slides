import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { SNAP_GUIDE_COLOR } from "../lib/block-snap-constants";

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
    "absolute z-[5] size-[13px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border border-white bg-foreground shadow-[0_2px_8px_rgba(0,0,0,0.16)] transition-colors before:absolute before:inset-[3px] before:rounded-full before:bg-white/90 hover:bg-foreground/80";

  return (
    <>
      {snapGuides.map((guide, index) => {
        const lineWidth = guide.variant === "spacing" ? "2px" : "1px";
        const capLength = 14;
        const capThickness = guide.variant === "spacing" ? 2 : 1;
        const isVertical = guide.orientation === "vertical";
        const lineStyle: CSSProperties = isVertical
          ? {
              left: `${guide.start.x}px`,
              top: `${Math.min(guide.start.y, guide.end.y)}px`,
              width: "0",
              height: `${Math.max(Math.abs(guide.end.y - guide.start.y), 32)}px`,
              borderLeftWidth: lineWidth,
              borderLeftStyle: "solid",
              borderLeftColor: SNAP_GUIDE_COLOR,
              opacity: guide.variant === "spacing" ? 0.9 : 0.82,
            }
          : {
              left: `${Math.min(guide.start.x, guide.end.x)}px`,
              top: `${guide.start.y}px`,
              width: `${Math.max(Math.abs(guide.end.x - guide.start.x), 32)}px`,
              height: "0",
              borderTopWidth: lineWidth,
              borderTopStyle: "solid",
              borderTopColor: SNAP_GUIDE_COLOR,
              opacity: guide.variant === "spacing" ? 0.9 : 0.82,
            };
        const capStyle: CSSProperties = isVertical
          ? {
              width: `${capLength}px`,
              height: `${capThickness}px`,
              left: `${-capLength / 2}px`,
              backgroundColor: SNAP_GUIDE_COLOR,
            }
          : {
              width: `${capThickness}px`,
              height: `${capLength}px`,
              top: `${-capLength / 2}px`,
              backgroundColor: SNAP_GUIDE_COLOR,
            };
        return (
          <div
            key={`${guide.orientation}-${guide.start.x}-${guide.start.y}-${guide.end.x}-${guide.end.y}-${guide.variant}-${index}`}
            className="pointer-events-none absolute z-[4]"
            data-testid={`snap-guide-${guide.orientation}`}
            data-variant={guide.variant}
            style={lineStyle}
          >
            {guide.variant === "spacing" ? (
              <>
                <span
                  className="absolute"
                  data-testid="snap-guide-cap"
                  style={
                    isVertical
                      ? {
                          ...capStyle,
                          top: "0",
                        }
                      : {
                          ...capStyle,
                          left: "0",
                        }
                  }
                />
                <span
                  className="absolute"
                  data-testid="snap-guide-cap"
                  style={
                    isVertical
                      ? {
                          ...capStyle,
                          bottom: "0",
                        }
                      : {
                          ...capStyle,
                          right: "0",
                        }
                  }
                />
              </>
            ) : null}
          </div>
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
