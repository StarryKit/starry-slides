export type {
  AtomicSlideOperation,
  AttributeUpdateOperation,
  ElementInsertOperation,
  ElementLayoutUpdateOperation,
  ElementRemoveOperation,
  GroupCreateOperation,
  GroupUngroupOperation,
  SlideBatchOperation,
  SlideTitleUpdateOperation,
  SlideOperation,
  StyleUpdateOperation,
  TextUpdateOperation,
} from "./slide-operation-types";

export type { GroupElementRectMap, ElementPresentationStyleMap } from "./group-operations";
export {
  createGroupCreateOperation,
  createGroupUngroupOperation,
} from "./group-operations";
export {
  createElementPlacement,
  createUniqueElementId,
  duplicateSlideElement,
  getSlideElementHtml,
  insertSlideElement,
  removeSlideElement,
  updateSlideAttribute,
  updateSlideElementHtmlIds,
  updateSlideElementLayout,
  updateSlideElementTransform,
  updateSlideStyle,
  updateSlideText,
} from "./slide-operations-helpers";
export { applySlideOperation, invertSlideOperation } from "./slide-operation-reducer";
