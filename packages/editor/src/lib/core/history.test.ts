import { describe, expect, test } from "vitest";
import { createHistoryState, parseSlide, reduceHistory } from "./index";

describe("history reducer", () => {
  test("commit applies operation, appends undo history, and clears redo history", () => {
    const initialSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text">Title</h1>
      <p data-editable="text">Summary</p>
    </div>
  </body>
</html>`,
      "slide-1"
    );
    const firstOperation = {
      type: "text.update" as const,
      slideId: "slide-1",
      elementId: "text-1",
      previousText: "Title",
      nextText: "Updated title",
      timestamp: 1,
    };
    const secondOperation = {
      type: "text.update" as const,
      slideId: "slide-1",
      elementId: "text-2",
      previousText: "Summary",
      nextText: "Updated summary",
      timestamp: 2,
    };
    const committedState = reduceHistory(createHistoryState([initialSlide]), {
      type: "history.commit",
      operation: firstOperation,
    });
    const undoneState = reduceHistory(committedState, { type: "history.undo" });
    const committedAfterUndo = reduceHistory(undoneState, {
      type: "history.commit",
      operation: secondOperation,
    });

    expect(
      committedState.slides[0]?.elements.find((element) => element.id === "text-1")?.content
    ).toBe("Updated title");
    expect(committedState.undoStack).toEqual([firstOperation]);
    expect(committedAfterUndo.redoStack).toEqual([]);
    expect(committedAfterUndo.undoStack).toEqual([secondOperation]);
  });

  test("undo and redo preserve stack order and exact document content", () => {
    const initialSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text">Title</h1>
      <p data-editable="text">Summary</p>
    </div>
  </body>
</html>`,
      "slide-1"
    );
    const firstOperation = {
      type: "text.update" as const,
      slideId: "slide-1",
      elementId: "text-1",
      previousText: "Title",
      nextText: "Updated title",
      timestamp: 1,
    };
    const secondOperation = {
      type: "text.update" as const,
      slideId: "slide-1",
      elementId: "text-2",
      previousText: "Summary",
      nextText: "  Updated summary  ",
      timestamp: 2,
    };
    const committedState = [firstOperation, secondOperation].reduce(
      (state, operation) => reduceHistory(state, { type: "history.commit", operation }),
      createHistoryState([initialSlide])
    );
    const undoneState = reduceHistory(committedState, { type: "history.undo" });
    const redoneState = reduceHistory(undoneState, { type: "history.redo" });
    const fullyUndoneState = reduceHistory(reduceHistory(redoneState, { type: "history.undo" }), {
      type: "history.undo",
    });

    expect(undoneState.undoStack).toEqual([firstOperation]);
    expect(undoneState.redoStack).toEqual([secondOperation]);
    expect(redoneState.undoStack).toEqual([firstOperation, secondOperation]);
    expect(redoneState.slides[0]?.elements[1]?.content).toBe("  Updated summary  ");
    expect(fullyUndoneState.slides[0]?.elements[0]?.content).toBe("Title");
  });

  test("reset replaces slides and clears both history stacks", () => {
    const dirtyState = reduceHistory(
      createHistoryState([
        parseSlide(
          `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text">Title</h1>
    </div>
  </body>
</html>`,
          "slide-1"
        ),
      ]),
      {
        type: "history.commit",
        operation: {
          type: "text.update",
          slideId: "slide-1",
          elementId: "text-1",
          previousText: "Title",
          nextText: "Updated title",
          timestamp: 1,
        },
      }
    );
    const resetSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text">Fresh title</h1>
    </div>
  </body>
</html>`,
      "slide-2"
    );

    const resetState = reduceHistory(dirtyState, {
      type: "history.reset",
      slides: [resetSlide],
    });

    expect(resetState.undoStack).toEqual([]);
    expect(resetState.redoStack).toEqual([]);
    expect(resetState.slides[0]?.id).toBe("slide-2");
  });
});
