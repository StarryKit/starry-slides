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

interface BlockManipulationOverlayProps {
  selectionBounds: Rect;
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
  resizeHandles,
  rotationHandle,
  onResizeHandleMouseDown,
  onRotateHandleMouseDown,
}: BlockManipulationOverlayProps) {
  return (
    <>
      <button
        type="button"
        className="hse-block-handle hse-block-handle-rotate"
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
          className={`hse-block-handle hse-block-handle-resize hse-block-handle-resize-${handle.corner}`}
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
