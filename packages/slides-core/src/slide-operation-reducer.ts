import type { SlideModel } from "./slide-contract.js";
import { parseSlide } from "./slide-document.js";
import type { AtomicSlideOperation, SlideOperation } from "./slide-operation-types.js";
import {
  insertSlideElement,
  removeSlideElement,
  updateSlideAttribute,
  updateSlideElementLayout,
  updateSlideStyle,
  updateSlideText,
} from "./slide-operations.js";

function preserveSlideSource(sourceSlide: SlideModel, nextSlide: SlideModel): SlideModel {
  return {
    ...nextSlide,
    hidden: sourceSlide.hidden,
    sourceFile: sourceSlide.sourceFile,
  };
}

export function applySlideOperation(slide: SlideModel, operation: SlideOperation): SlideModel {
  if (operation.type === "slide.visibility.update") {
    if (slide.id !== operation.slideId) {
      return slide;
    }

    return { ...slide, hidden: operation.nextHidden };
  }

  if (operation.type === "slide.title.update") {
    if (slide.id !== operation.slideId) {
      return slide;
    }

    return { ...slide, title: operation.nextTitle };
  }

  if (!("slideId" in operation) || operation.type === "slide.reorder") {
    return slide;
  }

  if (slide.id !== operation.slideId) {
    return slide;
  }

  switch (operation.type) {
    case "operation.batch":
      return operation.operations.reduce(
        (currentSlide, childOperation) => applySlideOperation(currentSlide, childOperation),
        slide
      );
    case "text.update":
      return preserveSlideSource(
        slide,
        parseSlide(
          updateSlideText(slide.htmlSource, operation.elementId, operation.nextText),
          slide.id
        )
      );
    case "style.update":
      return preserveSlideSource(
        slide,
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
        slide,
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
    case "element.layout.update":
      return preserveSlideSource(
        slide,
        parseSlide(
          updateSlideElementLayout(slide.htmlSource, operation.elementId, operation.nextStyle),
          slide.id
        )
      );
    case "element.insert":
      return preserveSlideSource(
        slide,
        parseSlide(insertSlideElement(slide.htmlSource, operation), slide.id)
      );
    case "element.remove":
      return preserveSlideSource(
        slide,
        parseSlide(removeSlideElement(slide.htmlSource, operation.elementId), slide.id)
      );
    case "group.create":
    case "group.ungroup":
      return preserveSlideSource(slide, parseSlide(operation.nextHtmlSource, slide.id));
  }
}

export function invertSlideOperation(operation: SlideOperation): SlideOperation {
  switch (operation.type) {
    case "operation.batch":
      return {
        type: "operation.batch",
        slideId: operation.slideId,
        operations: operation.operations
          .map((childOperation) => invertSlideOperation(childOperation) as AtomicSlideOperation)
          .reverse(),
        timestamp: operation.timestamp,
      };
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
    case "element.layout.update":
      return {
        ...operation,
        previousStyle: operation.nextStyle,
        nextStyle: operation.previousStyle,
      };
    case "element.insert":
      return {
        type: "element.remove",
        slideId: operation.slideId,
        elementId: operation.elementId,
        parentElementId: operation.parentElementId,
        previousSiblingElementId: operation.previousSiblingElementId,
        nextSiblingElementId: operation.nextSiblingElementId,
        html: operation.html,
        timestamp: operation.timestamp,
      };
    case "element.remove":
      return {
        type: "element.insert",
        slideId: operation.slideId,
        elementId: operation.elementId,
        parentElementId: operation.parentElementId,
        previousSiblingElementId: operation.previousSiblingElementId,
        nextSiblingElementId: operation.nextSiblingElementId,
        html: operation.html,
        timestamp: operation.timestamp,
      };
    case "group.create":
      return {
        type: "group.ungroup",
        slideId: operation.slideId,
        groupElementId: operation.groupElementId,
        childElementIds: operation.elementIds,
        previousHtmlSource: operation.nextHtmlSource,
        nextHtmlSource: operation.previousHtmlSource,
        timestamp: operation.timestamp,
      };
    case "group.ungroup":
      return {
        type: "group.create",
        slideId: operation.slideId,
        groupElementId: operation.groupElementId,
        elementIds: operation.childElementIds,
        previousHtmlSource: operation.nextHtmlSource,
        nextHtmlSource: operation.previousHtmlSource,
        timestamp: operation.timestamp,
      };
    case "slide.create":
      return {
        type: "slide.delete",
        slide: operation.slide,
        index: operation.index,
        timestamp: operation.timestamp,
      };
    case "slide.delete":
      return {
        type: "slide.create",
        slide: operation.slide,
        index: operation.index,
        timestamp: operation.timestamp,
      };
    case "slide.duplicate":
      return {
        type: "slide.delete",
        slide: operation.slide,
        index: operation.index,
        timestamp: operation.timestamp,
      };
    case "slide.reorder":
      return {
        ...operation,
        fromIndex: operation.toIndex,
        toIndex: operation.fromIndex,
      };
    case "slide.visibility.update":
      return {
        ...operation,
        previousHidden: operation.nextHidden,
        nextHidden: operation.previousHidden,
      };
    case "slide.title.update":
      return {
        ...operation,
        previousTitle: operation.nextTitle,
        nextTitle: operation.previousTitle,
      };
  }
}
