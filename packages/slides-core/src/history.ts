import type { SlideModel } from "./slide-contract.js";
import {
  type SlideOperation,
  applySlideOperation,
  invertSlideOperation,
} from "./slide-operations.js";

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

function clampInsertIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length);
}

function applyOperationToSlides(slides: SlideModel[], operation: SlideOperation): SlideModel[] {
  switch (operation.type) {
    case "slide.create":
    case "slide.duplicate": {
      const index = clampInsertIndex(operation.index, slides.length);
      return [...slides.slice(0, index), operation.slide, ...slides.slice(index)];
    }
    case "slide.delete":
      return slides.filter((slide) => slide.id !== operation.slide.id);
    case "slide.reorder": {
      const fromIndex = slides.findIndex((slide) => slide.id === operation.slideId);
      if (fromIndex < 0) {
        return slides;
      }

      const nextSlides = [...slides];
      const [slide] = nextSlides.splice(fromIndex, 1);
      if (!slide) {
        return slides;
      }

      nextSlides.splice(clampInsertIndex(operation.toIndex, nextSlides.length), 0, slide);
      return nextSlides;
    }
    default:
      return slides.map((slide) => applySlideOperation(slide, operation));
  }
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
