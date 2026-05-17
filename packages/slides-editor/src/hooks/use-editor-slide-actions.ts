import type { SlideModel, SlideOperation } from "@starrykit/slides-core";
import { createBlankSlide, createDuplicatedSlide } from "@starrykit/slides-core";
import { useMemo } from "react";

interface UseEditorSlideActionsOptions {
  slides: SlideModel[];
  activeSlide: SlideModel | undefined;
  activeSlideId: string;
  onCommitOperation: (operation: SlideOperation) => void;
  onActiveSlideChange: (slideId: string) => void;
  onClearSelection: () => void;
}

function useEditorSlideActions({
  slides,
  activeSlide,
  activeSlideId,
  onCommitOperation,
  onActiveSlideChange,
  onClearSelection,
}: UseEditorSlideActionsOptions) {
  return useMemo(() => {
    const addSlideAtIndex = (insertIndex: number) => {
      if (!activeSlide || slides.length === 0) {
        return;
      }

      const slide = createBlankSlide(slides, insertIndex);
      onCommitOperation({
        type: "slide.create",
        slide,
        index: insertIndex,
        timestamp: Date.now(),
      });
      onActiveSlideChange(slide.id);
      onClearSelection();
    };

    const selectSlideByDirection = (direction: "previous" | "next") => {
      if (!activeSlide || slides.length <= 1) {
        return false;
      }

      const activeIndex = slides.findIndex((slide) => slide.id === activeSlide.id);
      if (activeIndex < 0) {
        return false;
      }

      const nextIndex =
        direction === "previous"
          ? Math.max(0, activeIndex - 1)
          : Math.min(slides.length - 1, activeIndex + 1);
      const nextSlide = slides[nextIndex];
      if (!nextSlide || nextSlide.id === activeSlide.id) {
        return false;
      }

      onActiveSlideChange(nextSlide.id);
      return true;
    };

    return {
      selectSlideByDirection,
      addSlideAfterActive: () => {
        if (!activeSlide) {
          return;
        }

        const activeIndex = slides.findIndex((slide) => slide.id === activeSlide.id);
        const insertIndex = activeIndex >= 0 ? activeIndex + 1 : slides.length;
        addSlideAtIndex(insertIndex);
      },
      addSlideAbove: (slideId: string) => {
        const index = slides.findIndex((slide) => slide.id === slideId);
        if (index >= 0) {
          addSlideAtIndex(index);
        }
      },
      addSlideBelow: (slideId: string) => {
        const index = slides.findIndex((slide) => slide.id === slideId);
        if (index >= 0) {
          addSlideAtIndex(index + 1);
        }
      },
      duplicateSlide: (slideId: string) => {
        const sourceSlide = slides.find((slide) => slide.id === slideId);
        if (!sourceSlide) {
          return;
        }

        const sourceIndex = slides.findIndex((slide) => slide.id === slideId);
        const insertIndex = sourceIndex >= 0 ? sourceIndex + 1 : slides.length;
        const slide = createDuplicatedSlide(slides, sourceSlide);
        onCommitOperation({
          type: "slide.duplicate",
          sourceSlideId: slideId,
          slide,
          index: insertIndex,
          timestamp: Date.now(),
        });
        onActiveSlideChange(slide.id);
        onClearSelection();
      },
      deleteSlide: (slideId: string) => {
        if (slides.length <= 1) {
          return false;
        }

        const index = slides.findIndex((slide) => slide.id === slideId);
        const slide = slides[index];
        if (!slide) {
          return false;
        }

        const fallbackSlide = slides[index + 1] ?? slides[index - 1] ?? slides[0];
        onCommitOperation({
          type: "slide.delete",
          slide,
          index,
          timestamp: Date.now(),
        });
        if (activeSlideId === slideId) {
          onActiveSlideChange(fallbackSlide?.id ?? "");
        }
        onClearSelection();
        return true;
      },
      toggleSlideHidden: (slideId: string) => {
        const slide = slides.find((item) => item.id === slideId);
        if (!slide) {
          return;
        }

        onCommitOperation({
          type: "slide.visibility.update",
          slideId,
          previousHidden: slide.hidden === true,
          nextHidden: slide.hidden !== true,
          timestamp: Date.now(),
        });
      },
      renameSlide: (slideId: string, nextTitle: string) => {
        const slide = slides.find((item) => item.id === slideId);
        const normalizedTitle = nextTitle.trim() || "Untitled Slide";
        if (!slide || slide.title === normalizedTitle) {
          return;
        }

        onCommitOperation({
          type: "slide.title.update",
          slideId,
          previousTitle: slide.title,
          nextTitle: normalizedTitle,
          timestamp: Date.now(),
        });
      },
      reorderSlide: (slideId: string, targetIndex: number) => {
        const fromIndex = slides.findIndex((slide) => slide.id === slideId);
        if (fromIndex < 0 || fromIndex === targetIndex) {
          return;
        }

        onCommitOperation({
          type: "slide.reorder",
          slideId,
          fromIndex,
          toIndex: targetIndex,
          timestamp: Date.now(),
        });
        onActiveSlideChange(slideId);
      },
    };
  }, [
    activeSlide,
    activeSlideId,
    onActiveSlideChange,
    onClearSelection,
    onCommitOperation,
    slides,
  ]);
}

export { useEditorSlideActions };
