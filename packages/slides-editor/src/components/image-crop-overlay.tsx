import type { MouseEvent as ReactMouseEvent } from "react";
import type { ImageCropOverlay as ImageCropOverlayModel } from "../hooks/use-image-crop";
import type { ResizeHandleCorner } from "../lib/block-snap-types";

const CROP_CURSOR_PATHS: Record<ResizeHandleCorner, string> = {
  "top-left": "M12 22V12H22",
  "top-right": "M2 12h10v10",
  "bottom-right": "M12 2v10H2",
  "bottom-left": "M22 12H12V2",
};

interface ImageCropOverlayProps {
  overlay: ImageCropOverlayModel;
  onCropHandleMouseDown: (
    corner: ResizeHandleCorner,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => void;
}

function ImageCropOverlay({ overlay, onCropHandleMouseDown }: ImageCropOverlayProps) {
  const handleClassName =
    "absolute z-[7] size-8 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-transparent text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]";
  const maskRegions = createMaskRegions(overlay.selectionBounds, overlay.cropBounds);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[5]" data-testid="image-crop-mask">
        {maskRegions.map((region) => (
          <div
            key={region.name}
            className="absolute bg-background/35 backdrop-blur-[6px]"
            data-crop-mask-region={region.name}
            style={{
              left: `${region.x}px`,
              top: `${region.y}px`,
              width: `${region.width}px`,
              height: `${region.height}px`,
            }}
          />
        ))}
      </div>
      <div
        className="pointer-events-none absolute z-[6] border border-solid border-foreground bg-transparent"
        data-testid="image-crop-overlay"
        style={{
          borderRadius: formatCropBorderRadius(overlay.cropRadii),
          left: `${overlay.cropBounds.x}px`,
          top: `${overlay.cropBounds.y}px`,
          width: `${overlay.cropBounds.width}px`,
          height: `${overlay.cropBounds.height}px`,
        }}
      />
      {overlay.handles.map((handle) => (
        <button
          key={handle.corner}
          type="button"
          className={handleClassName}
          data-testid={`image-crop-handle-${handle.corner}`}
          aria-label={`Crop image from ${handle.corner}`}
          style={{
            cursor: getCropHandleCursor(handle.corner),
            left: `${handle.x}px`,
            top: `${handle.y}px`,
          }}
          onMouseDown={(event) => onCropHandleMouseDown(handle.corner, event)}
        >
          <span
            className={`absolute h-[3px] w-[22px] rounded-full bg-current ${getCropHandleHorizontalClassName(
              handle.corner
            )}`}
            aria-hidden="true"
          />
          <span
            className={`absolute h-[22px] w-[3px] rounded-full bg-current ${getCropHandleVerticalClassName(
              handle.corner
            )}`}
            aria-hidden="true"
          />
        </button>
      ))}
    </>
  );
}

function getCropHandleCursor(corner: ResizeHandleCorner) {
  const fallback =
    corner === "top-left" || corner === "bottom-right" ? "nwse-resize" : "nesw-resize";
  return `url("data:image/svg+xml,${createCropCursorIcon(corner)}") 12 12, ${fallback}`;
}

function createCropCursorIcon(corner: ResizeHandleCorner) {
  const path = CROP_CURSOR_PATHS[corner];
  return encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="${path}" fill="none" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  );
}

function getCropHandleHorizontalClassName(corner: ResizeHandleCorner) {
  if (corner === "top-left" || corner === "bottom-left") {
    return `${corner === "top-left" ? "top-1/2" : "bottom-1/2"} left-1/2 -translate-y-1/2`;
  }

  return `${corner === "top-right" ? "top-1/2" : "bottom-1/2"} right-1/2 -translate-y-1/2`;
}

function getCropHandleVerticalClassName(corner: ResizeHandleCorner) {
  if (corner === "top-left" || corner === "top-right") {
    return `${corner === "top-left" ? "left-1/2" : "right-1/2"} top-1/2 -translate-x-1/2`;
  }

  return `${corner === "bottom-left" ? "left-1/2" : "right-1/2"} bottom-1/2 -translate-x-1/2`;
}

function formatCropBorderRadius(radii: ImageCropOverlayModel["cropRadii"]) {
  return `${radii.topLeft} ${radii.topRight} ${radii.bottomRight} ${radii.bottomLeft}`;
}

function createMaskRegions(
  selectionBounds: ImageCropOverlayModel["selectionBounds"],
  cropBounds: ImageCropOverlayModel["cropBounds"]
) {
  const selectionRight = selectionBounds.x + selectionBounds.width;
  const selectionBottom = selectionBounds.y + selectionBounds.height;
  const cropRight = cropBounds.x + cropBounds.width;
  const cropBottom = cropBounds.y + cropBounds.height;

  return [
    {
      name: "top",
      x: selectionBounds.x,
      y: selectionBounds.y,
      width: selectionBounds.width,
      height: Math.max(cropBounds.y - selectionBounds.y, 0),
    },
    {
      name: "right",
      x: cropRight,
      y: cropBounds.y,
      width: Math.max(selectionRight - cropRight, 0),
      height: cropBounds.height,
    },
    {
      name: "bottom",
      x: selectionBounds.x,
      y: cropBottom,
      width: selectionBounds.width,
      height: Math.max(selectionBottom - cropBottom, 0),
    },
    {
      name: "left",
      x: selectionBounds.x,
      y: cropBounds.y,
      width: Math.max(cropBounds.x - selectionBounds.x, 0),
      height: cropBounds.height,
    },
  ];
}

export { ImageCropOverlay };
