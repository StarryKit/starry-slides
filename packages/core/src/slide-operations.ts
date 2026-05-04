import {
  ELEMENT_LAYOUT_STYLE_KEYS,
  type ElementLayoutStyleSnapshot,
  composeTransform,
  parseTransformParts,
} from "./layout";
import { SELECTOR_ATTR, type SlideModel } from "./slide-contract";
import { parseSlide, querySlideElement } from "./slide-document";

export interface TextUpdateOperation {
  type: "text.update";
  slideId: string;
  elementId: string;
  previousText: string;
  nextText: string;
  timestamp: number;
}

export interface StyleUpdateOperation {
  type: "style.update";
  slideId: string;
  elementId: string;
  propertyName: string;
  previousValue: string;
  nextValue: string;
  timestamp: number;
}

export interface AttributeUpdateOperation {
  type: "attribute.update";
  slideId: string;
  elementId: string;
  attributeName: string;
  previousValue: string;
  nextValue: string;
  timestamp: number;
}

export interface ElementDuplicateOperation {
  type: "element.duplicate";
  slideId: string;
  sourceElementId: string;
  nextElementId: string;
  timestamp: number;
}

export interface ElementRemoveOperation {
  type: "element.remove";
  slideId: string;
  elementId: string;
  timestamp: number;
}

export interface ElementLayoutUpdateOperation {
  type: "element.layout.update";
  slideId: string;
  elementId: string;
  previousStyle: ElementLayoutStyleSnapshot;
  nextStyle: ElementLayoutStyleSnapshot;
  timestamp: number;
}

export type SlideOperation =
  | TextUpdateOperation
  | StyleUpdateOperation
  | AttributeUpdateOperation
  | ElementDuplicateOperation
  | ElementRemoveOperation
  | ElementLayoutUpdateOperation;

function parseHtmlDocument(html: string): Document | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

function serializeHtmlDocument(doc: Document): string {
  return `<!DOCTYPE html>
${doc.documentElement.outerHTML}`;
}

function updateHtmlSource(html: string, updater: (doc: Document) => void): string {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return html;
  }

  updater(doc);
  return serializeHtmlDocument(doc);
}

export function updateSlideText(html: string, elementId: string, value: string): string {
  return updateHtmlSource(html, (doc) => {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (node) {
      node.textContent = value;
    }
  });
}

export function updateSlideStyle(
  html: string,
  elementId: string,
  propertyName: string,
  value: string
): string {
  return updateHtmlSource(html, (doc) => {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (!node) {
      return;
    }

    if (value.trim().length === 0) {
      node.style.removeProperty(propertyName);
    } else {
      node.style.setProperty(propertyName, value);
    }

    if (!node.getAttribute("style")?.trim()) {
      node.removeAttribute("style");
    }
  });
}

export function updateSlideAttribute(
  html: string,
  elementId: string,
  attributeName: string,
  value: string
): string {
  return updateHtmlSource(html, (doc) => {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (!node) {
      return;
    }

    if (value.trim().length === 0) {
      node.removeAttribute(attributeName);
    } else {
      node.setAttribute(attributeName, value);
    }
  });
}

export function duplicateSlideElement(
  html: string,
  sourceElementId: string,
  nextElementId: string
): string {
  return updateHtmlSource(html, (doc) => {
    const sourceNode = querySlideElement<HTMLElement>(doc, sourceElementId);
    if (!sourceNode) {
      return;
    }

    const clonedNode = sourceNode.cloneNode(true);
    if (!(clonedNode instanceof HTMLElement)) {
      return;
    }

    clonedNode.setAttribute(SELECTOR_ATTR, nextElementId);
    clonedNode.removeAttribute("data-hse-editing");
    sourceNode.insertAdjacentElement("afterend", clonedNode);
  });
}

export function removeSlideElement(html: string, elementId: string): string {
  return updateHtmlSource(html, (doc) => {
    querySlideElement<HTMLElement>(doc, elementId)?.remove();
  });
}

function applyElementLayoutStyleSnapshot(
  node: HTMLElement,
  snapshot: ElementLayoutStyleSnapshot
): void {
  for (const key of ELEMENT_LAYOUT_STYLE_KEYS) {
    const value = snapshot[key];
    if (value === null) {
      node.style[key] = "";
      continue;
    }

    node.style[key] = value;
  }

  if (!node.getAttribute("style")?.trim()) {
    node.removeAttribute("style");
  }
}

export function updateSlideElementLayout(
  html: string,
  elementId: string,
  snapshot: ElementLayoutStyleSnapshot
): string {
  return updateHtmlSource(html, (doc) => {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (!node) {
      return;
    }

    applyElementLayoutStyleSnapshot(node, snapshot);
  });
}

export function updateSlideElementTransform(
  html: string,
  elementId: string,
  deltaX: number,
  deltaY: number
): string {
  return updateHtmlSource(html, (doc) => {
    const node = querySlideElement<HTMLElement>(doc, elementId);
    if (!node) {
      return;
    }

    const currentTransform = parseTransformParts(node.style.transform);
    const nextTransform = composeTransform(
      currentTransform.translateX + deltaX,
      currentTransform.translateY + deltaY,
      currentTransform.rotate
    );

    if (nextTransform) {
      node.style.transform = nextTransform;
    } else {
      node.style.removeProperty("transform");
    }

    if (!node.style.position) {
      node.style.position = "relative";
    }
  });
}

export function applySlideOperation(slide: SlideModel, operation: SlideOperation): SlideModel {
  if (slide.id !== operation.slideId) {
    return slide;
  }

  const preserveSlideSource = (nextSlide: SlideModel): SlideModel => ({
    ...nextSlide,
    sourceFile: slide.sourceFile,
  });

  switch (operation.type) {
    case "text.update":
      return preserveSlideSource(
        parseSlide(
          updateSlideText(slide.htmlSource, operation.elementId, operation.nextText),
          slide.id
        )
      );
    case "style.update":
      return preserveSlideSource(
        parseSlide(
          updateSlideStyle(
            slide.htmlSource,
            operation.elementId,
            operation.propertyName,
            operation.nextValue
          ),
          slide.id
        )
      );
    case "attribute.update":
      return preserveSlideSource(
        parseSlide(
          updateSlideAttribute(
            slide.htmlSource,
            operation.elementId,
            operation.attributeName,
            operation.nextValue
          ),
          slide.id
        )
      );
    case "element.duplicate":
      return preserveSlideSource(
        parseSlide(
          duplicateSlideElement(
            slide.htmlSource,
            operation.sourceElementId,
            operation.nextElementId
          ),
          slide.id
        )
      );
    case "element.remove":
      return preserveSlideSource(
        parseSlide(removeSlideElement(slide.htmlSource, operation.elementId), slide.id)
      );
    case "element.layout.update":
      return preserveSlideSource(
        parseSlide(
          updateSlideElementLayout(slide.htmlSource, operation.elementId, operation.nextStyle),
          slide.id
        )
      );
  }
}

export function invertSlideOperation(operation: SlideOperation): SlideOperation {
  switch (operation.type) {
    case "text.update":
      return {
        ...operation,
        previousText: operation.nextText,
        nextText: operation.previousText,
      };
    case "style.update":
      return {
        ...operation,
        previousValue: operation.nextValue,
        nextValue: operation.previousValue,
      };
    case "attribute.update":
      return {
        ...operation,
        previousValue: operation.nextValue,
        nextValue: operation.previousValue,
      };
    case "element.duplicate":
      return {
        type: "element.remove",
        slideId: operation.slideId,
        elementId: operation.nextElementId,
        timestamp: operation.timestamp,
      };
    case "element.remove":
      return {
        ...operation,
      };
    case "element.layout.update":
      return {
        ...operation,
        previousStyle: operation.nextStyle,
        nextStyle: operation.previousStyle,
      };
  }
}
