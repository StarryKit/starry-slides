import type { RectLike } from "../../core";

export interface CropInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CropRadii {
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
}

export const DEFAULT_CROP_INSETS: CropInsets = { top: 0, right: 0, bottom: 0, left: 0 };
export const DEFAULT_CROP_RADII: CropRadii = {
  topLeft: "0px",
  topRight: "0px",
  bottomRight: "0px",
  bottomLeft: "0px",
};

export function clampCropInset(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function parseInsetClipPath(value: string): CropInsets {
  const match = value.match(/^inset\((.+)\)$/i);
  if (!match) {
    return DEFAULT_CROP_INSETS;
  }

  const insetContent = match[1].split(/\s+round\s+/i)[0] ?? "";
  const parts = insetContent
    .trim()
    .split(/\s+/)
    .map((part) => {
      const percentage = part.match(/^(-?\d+(?:\.\d+)?)%$/);
      return percentage ? Number.parseFloat(percentage[1] ?? "0") : 0;
    });
  const [top = 0, right = top, bottom = top, left = right] = parts;

  return {
    top: clampCropInset(top, 0, 100),
    right: clampCropInset(right, 0, 100),
    bottom: clampCropInset(bottom, 0, 100),
    left: clampCropInset(left, 0, 100),
  };
}

export function formatInsetClipPath(insets: CropInsets) {
  return `inset(${roundPercent(insets.top)}% ${roundPercent(insets.right)}% ${roundPercent(
    insets.bottom
  )}% ${roundPercent(insets.left)}%)`;
}

export function formatRoundedInsetClipPath(insets: CropInsets, radii: CropRadii) {
  const radiusValues = [radii.topLeft, radii.topRight, radii.bottomRight, radii.bottomLeft];
  if (radiusValues.every((value) => isZeroRadius(value))) {
    return formatInsetClipPath(insets);
  }

  return `inset(${roundPercent(insets.top)}% ${roundPercent(insets.right)}% ${roundPercent(
    insets.bottom
  )}% ${roundPercent(insets.left)}% round ${radiusValues.join(" ")})`;
}

export function areCropInsetsEqual(left: CropInsets, right: CropInsets) {
  return (
    Math.abs(left.top - right.top) < 0.01 &&
    Math.abs(left.right - right.right) < 0.01 &&
    Math.abs(left.bottom - right.bottom) < 0.01 &&
    Math.abs(left.left - right.left) < 0.01
  );
}

export function cropRectByInsets<T extends RectLike>(rect: T, insets: CropInsets): T {
  const leftOffset = (rect.width * insets.left) / 100;
  const topOffset = (rect.height * insets.top) / 100;
  const rightOffset = (rect.width * insets.right) / 100;
  const bottomOffset = (rect.height * insets.bottom) / 100;

  return {
    ...rect,
    left: rect.left + leftOffset,
    top: rect.top + topOffset,
    width: Math.max(rect.width - leftOffset - rightOffset, 0),
    height: Math.max(rect.height - topOffset - bottomOffset, 0),
  };
}

export function getImageCropInsets(node: HTMLElement): CropInsets {
  return parseInsetClipPath(node.style.getPropertyValue("clip-path").trim());
}

export function getImageCropRadii(node: HTMLElement): CropRadii {
  const style = node.ownerDocument.defaultView?.getComputedStyle(node);
  if (!style) {
    return DEFAULT_CROP_RADII;
  }

  return {
    topLeft: style.borderTopLeftRadius || "0px",
    topRight: style.borderTopRightRadius || "0px",
    bottomRight: style.borderBottomRightRadius || "0px",
    bottomLeft: style.borderBottomLeftRadius || "0px",
  };
}

export function getVisibleImageRect(node: HTMLElement): RectLike {
  const rect = node.getBoundingClientRect();
  if (node.getAttribute("data-editable") !== "image") {
    return rect;
  }

  return cropRectByInsets(rect, getImageCropInsets(node));
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function isZeroRadius(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => Number.parseFloat(part) === 0);
}
