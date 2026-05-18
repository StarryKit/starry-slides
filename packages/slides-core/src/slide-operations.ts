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
} from "./slide-operation-types.js";

export type { GroupElementRectMap, ElementPresentationStyleMap } from "./group-operations.js";
export {
  createGroupCreateOperation,
  createGroupUngroupOperation,
} from "./group-operations.js";
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
} from "./slide-operations-helpers.js";
export { applySlideOperation, invertSlideOperation } from "./slide-operation-reducer.js";
