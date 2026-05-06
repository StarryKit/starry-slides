export type EditableType = "text" | "image" | "block" | "group";

export interface EditableElement {
  id: string;
  selector: string;
  type: EditableType;
  content: string;
  tagName: string;
}

export interface SlideModel {
  id: string;
  title: string;
  htmlSource: string;
  rootSelector: string;
  width: number;
  height: number;
  elements: EditableElement[];
  sourceFile?: string;
}

export interface SlideDeckManifestEntry {
  file: string;
  title?: string;
}

export interface SlideDeckManifest {
  topic?: string;
  slides?: SlideDeckManifestEntry[];
}

export interface ImportedSlideDeck {
  manifest: SlideDeckManifest;
  slides: SlideModel[];
}

export const SELECTOR_ATTR = "data-editor-id";
export const SLIDE_ROOT_ATTR = "data-slide-root";
export const DEFAULT_SLIDE_WIDTH = 1920;
export const DEFAULT_SLIDE_HEIGHT = 1080;

export function getSlideElementSelector(elementId: string): string {
  return `[${SELECTOR_ATTR}="${elementId}"]`;
}

export function getSlideRootSelector(rootId: string): string {
  return `[${SELECTOR_ATTR}="${rootId}"]`;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "slide"
  );
}

export function createElementId(index: number, type: EditableType): string {
  return `${type}-${index + 1}`;
}

export function parseDimension(value: string | null, fallback: number): number {
  const numericValue = Number.parseInt(value || "", 10);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
}

export function normalizeSlideId(slideId: string): string {
  return slugify(slideId);
}
