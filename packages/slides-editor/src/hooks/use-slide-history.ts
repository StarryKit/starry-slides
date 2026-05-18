import {
  type SlideModel,
  type SlideOperation,
  createHistoryState,
  reduceHistory,
} from "@starrykit/slides-core";
import { useEffect, useMemo, useReducer, useState } from "react";

interface SlideHistoryResult {
  slides: SlideModel[];
  activeSlide: SlideModel | undefined;
  activeSlideId: string;
  undoDepth: number;
  redoDepth: number;
  setActiveSlideId: (slideId: string) => void;
  commitOperation: (operation: SlideOperation) => SlideModel[];
  runUndo: () => void;
  runRedo: () => void;
}

interface UseSlideHistoryOptions {
  onSlidesChange?: (slides: SlideModel[]) => void;
}

function useSlideHistory(
  loadedSlides: SlideModel[],
  options: UseSlideHistoryOptions = {}
): SlideHistoryResult {
  const { onSlidesChange } = options;
  const [historyState, dispatchHistory] = useReducer(
    reduceHistory,
    loadedSlides,
    createHistoryState
  );
  const [activeSlideId, setActiveSlideId] = useState(loadedSlides[0]?.id ?? "");

  useEffect(() => {
    dispatchHistory({
      type: "history.reset",
      slides: loadedSlides,
    });
    setActiveSlideId(loadedSlides[0]?.id ?? "");
  }, [loadedSlides]);

  const activeSlide = useMemo(
    () => historyState.slides.find((slide) => slide.id === activeSlideId) ?? historyState.slides[0],
    [activeSlideId, historyState.slides]
  );
  const resolvedActiveSlideId = activeSlide?.id ?? "";

  function applyNextSlides(nextSlides: SlideModel[]) {
    if (!nextSlides.some((slide) => slide.id === activeSlideId)) {
      setActiveSlideId(nextSlides[0]?.id ?? "");
    }
    onSlidesChange?.(nextSlides);
    return nextSlides;
  }

  return {
    slides: historyState.slides,
    activeSlide,
    activeSlideId: resolvedActiveSlideId,
    undoDepth: historyState.undoStack.length,
    redoDepth: historyState.redoStack.length,
    setActiveSlideId,
    commitOperation: (operation) => {
      const nextState = reduceHistory(historyState, {
        type: "history.commit",
        operation,
      });
      dispatchHistory({
        type: "history.commit",
        operation,
      });
      return applyNextSlides(nextState.slides);
    },
    runUndo: () => {
      const nextState = reduceHistory(historyState, { type: "history.undo" });
      dispatchHistory({ type: "history.undo" });
      applyNextSlides(nextState.slides);
    },
    runRedo: () => {
      const nextState = reduceHistory(historyState, { type: "history.redo" });
      dispatchHistory({ type: "history.redo" });
      applyNextSlides(nextState.slides);
    },
  };
}

export { useSlideHistory };
