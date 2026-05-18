export type PresentationTool = "none" | "laser" | "pen";

export const PRESENTATION_PEN_COLORS = [
  "#F59E0B",
  "#EF4444",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#FFFFFF",
  "#0F172A",
];

export interface PresentableSlide {
  hidden?: boolean;
}

export function planPresentationSlides<TSlide extends PresentableSlide>(
  slides: TSlide[]
): TSlide[] {
  const visibleSlides = slides.filter((slide) => slide.hidden !== true);
  return visibleSlides.length > 0 ? visibleSlides : slides;
}

export function clampPresentationIndex(index: number, slideCount: number): number {
  return Math.min(Math.max(index, 0), Math.max(slideCount - 1, 0));
}
