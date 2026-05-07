import type { ElementLayoutStyleSnapshot } from "./layout";
import type { SlideModel } from "./slide-contract";

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

export interface ElementLayoutUpdateOperation {
  type: "element.layout.update";
  slideId: string;
  elementId: string;
  previousStyle: ElementLayoutStyleSnapshot;
  nextStyle: ElementLayoutStyleSnapshot;
  timestamp: number;
}

export interface ElementInsertOperation {
  type: "element.insert";
  slideId: string;
  elementId: string;
  parentElementId: string | null;
  previousSiblingElementId: string | null;
  nextSiblingElementId: string | null;
  html: string;
  timestamp: number;
}

export interface ElementRemoveOperation {
  type: "element.remove";
  slideId: string;
  elementId: string;
  parentElementId: string | null;
  previousSiblingElementId: string | null;
  nextSiblingElementId: string | null;
  html: string;
  timestamp: number;
}

export interface GroupCreateOperation {
  type: "group.create";
  slideId: string;
  groupElementId: string;
  elementIds: string[];
  previousHtmlSource: string;
  nextHtmlSource: string;
  timestamp: number;
}

export interface GroupUngroupOperation {
  type: "group.ungroup";
  slideId: string;
  groupElementId: string;
  childElementIds: string[];
  previousHtmlSource: string;
  nextHtmlSource: string;
  timestamp: number;
}

export type AtomicSlideOperation =
  | TextUpdateOperation
  | StyleUpdateOperation
  | AttributeUpdateOperation
  | ElementLayoutUpdateOperation
  | ElementInsertOperation
  | ElementRemoveOperation
  | GroupCreateOperation
  | GroupUngroupOperation;

export interface SlideBatchOperation {
  type: "operation.batch";
  slideId: string;
  operations: AtomicSlideOperation[];
  timestamp: number;
}

export interface SlideCreateOperation {
  type: "slide.create";
  slide: SlideModel;
  index: number;
  timestamp: number;
}

export interface SlideDeleteOperation {
  type: "slide.delete";
  slide: SlideModel;
  index: number;
  timestamp: number;
}

export interface SlideDuplicateOperation {
  type: "slide.duplicate";
  sourceSlideId: string;
  slide: SlideModel;
  index: number;
  timestamp: number;
}

export interface SlideReorderOperation {
  type: "slide.reorder";
  slideId: string;
  fromIndex: number;
  toIndex: number;
  timestamp: number;
}

export interface SlideVisibilityUpdateOperation {
  type: "slide.visibility.update";
  slideId: string;
  previousHidden: boolean;
  nextHidden: boolean;
  timestamp: number;
}

export type DeckSlideOperation =
  | SlideCreateOperation
  | SlideDeleteOperation
  | SlideDuplicateOperation
  | SlideReorderOperation
  | SlideVisibilityUpdateOperation;

export type SlideOperation = AtomicSlideOperation | SlideBatchOperation | DeckSlideOperation;
