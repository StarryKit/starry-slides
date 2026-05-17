import type { SlideModel } from "@starrykit/slides-core";
import { composeTransform, parseTransformParts } from "@starrykit/slides-core";
import type { RefObject } from "react";
import type { SlideRect } from "./editor-keyboard-types";

export function roundCssNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

export function placeCopiedElement(elementHtml: string, rect: SlideRect): string {
  if (typeof DOMParser === "undefined") {
    return elementHtml;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<template>${elementHtml}</template>`, "text/html");
  const root = doc.querySelector("template")?.content.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    return elementHtml;
  }

  const transformParts = parseTransformParts(root.style.transform);
  const nextTransform = composeTransform(0, 0, transformParts.rotate);
  root.style.position = "absolute";
  root.style.left = `${roundCssNumber(rect.x)}px`;
  root.style.top = `${roundCssNumber(rect.y)}px`;
  root.style.width = `${roundCssNumber(rect.width)}px`;
  root.style.height = `${roundCssNumber(rect.height)}px`;
  root.style.margin = "0px";
  root.style.boxSizing = "border-box";

  if (nextTransform) {
    root.style.transform = nextTransform;
  } else {
    root.style.removeProperty("transform");
  }

  if (!root.style.transformOrigin) {
    root.style.transformOrigin = "center center";
  }

  return root.outerHTML;
}

export function elementRectToSlideRect(elementRect: DOMRect, rootRect: DOMRect): SlideRect {
  return {
    x: elementRect.left - rootRect.left,
    y: elementRect.top - rootRect.top,
    width: elementRect.width,
    height: elementRect.height,
  };
}

export function getSlideBounds(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  activeSlide: SlideModel,
  fallback: { width: number; height: number }
) {
  const doc = iframeRef.current?.contentDocument;
  const rootNode = doc?.querySelector<HTMLElement>(activeSlide.rootSelector);
  const rootRect = rootNode?.getBoundingClientRect();

  return {
    width: rootRect?.width || fallback.width,
    height: rootRect?.height || fallback.height,
  };
}

export function offsetSlideRect(rect: SlideRect, offsetX: number, offsetY: number): SlideRect {
  return {
    x: roundCssNumber(rect.x + offsetX),
    y: roundCssNumber(rect.y + offsetY),
    width: rect.width,
    height: rect.height,
  };
}

export function getUnionRect(rects: SlideRect[]): SlideRect | null {
  if (!rects.length) {
    return null;
  }

  return rects.reduce((accumulator, rect) => {
    const minX = Math.min(accumulator.x, rect.x);
    const minY = Math.min(accumulator.y, rect.y);
    const maxX = Math.max(accumulator.x + accumulator.width, rect.x + rect.width);
    const maxY = Math.max(accumulator.y + accumulator.height, rect.y + rect.height);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  });
}

export function getClampedPasteDelta(
  sourceRect: SlideRect,
  preferredOffset: number,
  slide: { width: number; height: number }
) {
  const maxX = Math.max(0, slide.width - sourceRect.width);
  const maxY = Math.max(0, slide.height - sourceRect.height);
  const nextX = Math.min(maxX, Math.max(0, sourceRect.x + preferredOffset));
  const nextY = Math.min(maxY, Math.max(0, sourceRect.y + preferredOffset));

  return {
    x: roundCssNumber(nextX - sourceRect.x),
    y: roundCssNumber(nextY - sourceRect.y),
  };
}
