import {
  type AttributeUpdateOperation,
  SELECTOR_ATTR,
  type SlideModel,
  type StyleUpdateOperation,
  getSlideInlineStyleValue,
} from "../core";

export function getInlineStyleValue(slide: SlideModel, elementId: string, propertyName: string) {
  return getSlideInlineStyleValue(slide, elementId, propertyName);
}

export function getHtmlAttributeValue(slide: SlideModel, elementId: string, attributeName: string) {
  if (typeof DOMParser === "undefined") {
    return "";
  }

  const doc = new DOMParser().parseFromString(slide.htmlSource, "text/html");
  const node = doc.querySelector<HTMLElement>(`[${SELECTOR_ATTR}="${elementId}"]`);
  return node?.getAttribute(attributeName)?.trim() ?? "";
}

export function getLockedSlideElementId(slide: SlideModel, elementId: string) {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const doc = new DOMParser().parseFromString(slide.htmlSource, "text/html");
  const node = doc.querySelector<HTMLElement>(`[${SELECTOR_ATTR}="${elementId}"]`);
  return node
    ?.closest<HTMLElement>('[data-editor-locked="true"][data-editor-id]')
    ?.getAttribute(SELECTOR_ATTR);
}

export function isSlideElementLocked(slide: SlideModel, elementId: string) {
  return Boolean(getLockedSlideElementId(slide, elementId));
}

export function createStyleUpdateOperation({
  elementId,
  nextValue,
  propertyName,
  slide,
}: {
  elementId: string;
  nextValue: string;
  propertyName: string;
  slide: SlideModel;
}): StyleUpdateOperation | null {
  const previousValue = getInlineStyleValue(slide, elementId, propertyName);
  const normalizedNextValue = nextValue.trim();

  if (previousValue === normalizedNextValue) {
    return null;
  }

  return {
    type: "style.update",
    slideId: slide.id,
    elementId,
    propertyName,
    previousValue,
    nextValue: normalizedNextValue,
    timestamp: Date.now(),
  };
}

export function createAttributeUpdateOperation({
  attributeName,
  elementId,
  nextValue,
  slide,
}: {
  attributeName: string;
  elementId: string;
  nextValue: string;
  slide: SlideModel;
}): AttributeUpdateOperation | null {
  const previousValue = getHtmlAttributeValue(slide, elementId, attributeName);
  const normalizedNextValue = nextValue.trim();

  if (previousValue === normalizedNextValue) {
    return null;
  }

  return {
    type: "attribute.update",
    slideId: slide.id,
    elementId,
    attributeName,
    previousValue,
    nextValue: normalizedNextValue,
    timestamp: Date.now(),
  };
}
