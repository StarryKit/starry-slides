export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageGeometry {
  scale: number;
  offsetX: number;
  offsetY: number;
  slideWidth: number;
  slideHeight: number;
}

export const ELEMENT_LAYOUT_STYLE_KEYS = [
  "position",
  "left",
  "top",
  "width",
  "maxWidth",
  "height",
  "transform",
  "transformOrigin",
  "margin",
  "zIndex",
] as const;

export type ElementLayoutStyleKey = (typeof ELEMENT_LAYOUT_STYLE_KEYS)[number];

export type ElementLayoutStyleSnapshot = Record<ElementLayoutStyleKey, string | null>;

export function createEmptyElementLayoutStyleSnapshot(): ElementLayoutStyleSnapshot {
  return {
    position: null,
    left: null,
    top: null,
    width: null,
    maxWidth: null,
    height: null,
    transform: null,
    transformOrigin: null,
    margin: null,
    zIndex: null,
  };
}

export function captureElementLayoutStyleSnapshot(node: HTMLElement): ElementLayoutStyleSnapshot {
  const snapshot = createEmptyElementLayoutStyleSnapshot();

  for (const key of ELEMENT_LAYOUT_STYLE_KEYS) {
    const value = node.style[key];
    snapshot[key] = value ? value : null;
  }

  return snapshot;
}

export function normalizeElementLayoutStyleSnapshot(
  snapshot: Partial<ElementLayoutStyleSnapshot>
): ElementLayoutStyleSnapshot {
  return {
    ...createEmptyElementLayoutStyleSnapshot(),
    ...snapshot,
  };
}

export function parseTransformParts(transformValue: string | null | undefined): {
  translateX: number;
  translateY: number;
  rotate: number;
} {
  const rawValue = transformValue || "";
  const translateMatch = rawValue.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/i);
  const rotateMatch = rawValue.match(/rotate\(([-\d.]+)deg\)/i);

  return {
    translateX: translateMatch ? Number.parseFloat(translateMatch[1] || "0") || 0 : 0,
    translateY: translateMatch ? Number.parseFloat(translateMatch[2] || "0") || 0 : 0,
    rotate: rotateMatch ? Number.parseFloat(rotateMatch[1] || "0") || 0 : 0,
  };
}

function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

export function composeTransform(
  translateX: number,
  translateY: number,
  rotate: number
): string | null {
  const parts: string[] = [];

  if (Math.abs(translateX) > 0.01 || Math.abs(translateY) > 0.01) {
    parts.push(`translate(${roundNumber(translateX)}px, ${roundNumber(translateY)}px)`);
  }

  if (Math.abs(rotate) > 0.01) {
    parts.push(`rotate(${roundNumber(rotate)}deg)`);
  }

  return parts.length ? parts.join(" ") : null;
}

export function elementRectToStageRect(
  elementRect: RectLike,
  rootRect: RectLike,
  geometry: StageGeometry
): StageRect {
  return {
    x: geometry.offsetX + (elementRect.left - rootRect.left) * geometry.scale,
    y: geometry.offsetY + (elementRect.top - rootRect.top) * geometry.scale,
    width: elementRect.width * geometry.scale,
    height: elementRect.height * geometry.scale,
  };
}

export function stageDeltaToSlideDelta(
  deltaX: number,
  deltaY: number,
  geometry: StageGeometry
): { x: number; y: number } {
  return {
    x: deltaX / geometry.scale,
    y: deltaY / geometry.scale,
  };
}
