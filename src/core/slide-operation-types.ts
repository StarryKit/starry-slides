import type { ElementLayoutStyleSnapshot } from "./layout";

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

export type AtomicSlideOperation =
  | TextUpdateOperation
  | StyleUpdateOperation
  | AttributeUpdateOperation
  | ElementLayoutUpdateOperation
  | ElementInsertOperation
  | ElementRemoveOperation;

export interface SlideBatchOperation {
  type: "operation.batch";
  slideId: string;
  operations: AtomicSlideOperation[];
  timestamp: number;
}

export type SlideOperation = AtomicSlideOperation | SlideBatchOperation;
