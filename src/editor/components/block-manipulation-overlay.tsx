import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import type { ResizeHandleCorner, ResizeHandlePosition } from "../lib/block-snap-types";
import { SNAP_GUIDE_COLOR } from "../lib/block-snap-constants";

interface Point {
  x: number;
  y: number;
}

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
    position: ResizeHandlePosition;
    x: number;
    y: number;
  }>;
  rotationZones: Array<{
    corner: ResizeHandleCorner;
    x: number;
    y: number;
  }>;
  onResizeHandleMouseDown: (
    position: ResizeHandlePosition,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => void;
  onCornerRotationZoneMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

const ROTATION_CURSOR_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M17 7 A7 7 0 1 1 7.5 16.5" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round"/><path d="M7.5 16.5 L6 15.5 L9 18.5 Z" fill="black"/><path d="M17 7 A7 7 0 1 1 7.5 16.5" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round"/><path d="M7.5 16.5 L6 15.5 L9 18.5 Z" fill="white"/></svg>`
);

function BlockManipulationOverlay({
  selectionBounds: _selectionBounds,
  snapGuides,
  resizeHandles,
  rotationZones,
  onResizeHandleMouseDown,
  onCornerRotationZoneMouseDown,
}: BlockManipulationOverlayProps) {
  const handleClassName =
    "absolute z-[5] size-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-foreground shadow-[0_2px_8px_rgba(0,0,0,0.16)] transition-colors before:absolute before:inset-[3px] before:rounded-full before:bg-white/90 hover:bg-foreground/80";

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
      {rotationZones.map((zone) => (
        <button
          key={zone.corner}
          type="button"
          className="absolute z-[4] size-[50px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent"
          data-testid={`block-rotation-zone-${zone.corner}`}
          aria-label={`Rotate selected element from ${zone.corner}`}
          style={{
            left: `${zone.x}px`,
            top: `${zone.y}px`,
            cursor: `url("data:image/svg+xml,${ROTATION_CURSOR_SVG}") 12 12, grab`,
          }}
          onMouseDown={onCornerRotationZoneMouseDown}
        />
      ))}
      {resizeHandles.map((handle) => (
        <button
          key={handle.position}
          type="button"
          className={`${handleClassName} ${getResizeHandleCursorClassName(handle.position)}`}
          data-testid={`block-resize-handle-${handle.position}`}
          aria-label={`Resize selected element from ${handle.position}`}
          style={{
            left: `${handle.x}px`,
            top: `${handle.y}px`,
          }}
          onMouseDown={(event) => {
            onResizeHandleMouseDown(handle.position, event);
          }}
        />
      ))}
    </>
  );
}

function getResizeHandleCursorClassName(position: ResizeHandlePosition) {
  if (position === "top-center" || position === "bottom-center") {
    return "cursor-ns-resize";
  }

  if (position === "left-center" || position === "right-center") {
    return "cursor-ew-resize";
  }

  return position === "top-left" || position === "bottom-right"
    ? "cursor-nwse-resize"
    : "cursor-nesw-resize";
}

export { BlockManipulationOverlay };
