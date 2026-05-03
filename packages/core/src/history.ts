import type { SlideModel } from "./slide-contract";
import { type SlideOperation, applySlideOperation, invertSlideOperation } from "./slide-operations";

export interface HistoryState {
  slides: SlideModel[];
  undoStack: SlideOperation[];
  redoStack: SlideOperation[];
}

export type HistoryAction =
  | {
      type: "history.reset";
      slides: SlideModel[];
    }
  | {
      type: "history.commit";
      operation: SlideOperation;
    }
  | {
      type: "history.undo";
    }
  | {
      type: "history.redo";
    };

function applyOperationToSlides(slides: SlideModel[], operation: SlideOperation): SlideModel[] {
  return slides.map((slide) => applySlideOperation(slide, operation));
}

export function createHistoryState(slides: SlideModel[]): HistoryState {
  return {
    slides,
    undoStack: [],
    redoStack: [],
  };
}

export function reduceHistory(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "history.reset":
      return createHistoryState(action.slides);

    case "history.commit":
      return {
        slides: applyOperationToSlides(state.slides, action.operation),
        undoStack: [...state.undoStack, action.operation],
        redoStack: [],
      };

    case "history.undo": {
      const operation = state.undoStack[state.undoStack.length - 1];
      if (!operation) {
        return state;
      }

      return {
        slides: applyOperationToSlides(state.slides, invertSlideOperation(operation)),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, operation],
      };
    }

    case "history.redo": {
      const operation = state.redoStack[state.redoStack.length - 1];
      if (!operation) {
        return state;
      }

      return {
        slides: applyOperationToSlides(state.slides, operation),
        undoStack: [...state.undoStack, operation],
        redoStack: state.redoStack.slice(0, -1),
      };
    }
  }
}
