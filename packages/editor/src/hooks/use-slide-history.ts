import {
  type SlideModel,
  type SlideOperation,
  createHistoryState,
  reduceHistory,
} from "@html-slides-editor/core";
import { useEffect, useMemo, useReducer, useState } from "react";

interface SlideHistoryResult {
  slides: SlideModel[];
  activeSlide: SlideModel | undefined;
  activeSlideId: string;
  undoDepth: number;
  redoDepth: number;
  setActiveSlideId: (slideId: string) => void;
  commitOperation: (operation: SlideOperation) => void;
  runUndo: () => void;
  runRedo: () => void;
}

function useSlideHistory(loadedSlides: SlideModel[]): SlideHistoryResult {
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

  return {
    slides: historyState.slides,
    activeSlide,
    activeSlideId,
    undoDepth: historyState.undoStack.length,
    redoDepth: historyState.redoStack.length,
    setActiveSlideId,
    commitOperation: (operation) => {
      dispatchHistory({
        type: "history.commit",
        operation,
      });
    },
    runUndo: () => {
      dispatchHistory({ type: "history.undo" });
    },
    runRedo: () => {
      dispatchHistory({ type: "history.redo" });
    },
  };
}

export { useSlideHistory };
