import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  applySlideOperation,
  createHistoryState,
  ensureEditableSelectors,
  invertSlideOperation,
  loadSlidesFromManifest,
  parseSlide,
  reduceHistory,
  updateSlideText,
} from "./index";

describe("ensureEditableSelectors", () => {
  test("adds stable data-editor-id values to slide root and editable nodes", () => {
    const html = `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <h1 data-editable="text">Title</h1>
      <p data-editable="text">Body</p>
      <div data-editable="block"><span data-editable="text">Nested</span></div>
    </div>
  </body>
</html>`;

    const normalizedHtml = ensureEditableSelectors(html);
    const doc = new DOMParser().parseFromString(normalizedHtml, "text/html");
    const root = doc.querySelector('[data-slide-root="true"]');
    const ids = Array.from(doc.querySelectorAll("[data-editable]")).map((node) =>
      node.getAttribute("data-editor-id")
    );

    expect(root?.getAttribute("data-editor-id")).toBe("slide-root");
    expect(root?.getAttribute("data-slide-width")).toBe(String(DEFAULT_SLIDE_WIDTH));
    expect(root?.getAttribute("data-slide-height")).toBe(String(DEFAULT_SLIDE_HEIGHT));
    expect(ids).toEqual(["text-1", "text-2", "block-3", "text-4"]);
  });

  test("preserves existing data-editor-id values", () => {
    const html = `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true" data-editor-id="custom-root">
      <h1 data-editable="text" data-editor-id="hero-title">Title</h1>
      <p data-editable="text">Body</p>
    </div>
  </body>
</html>`;

    const normalizedHtml = ensureEditableSelectors(html);
    const doc = new DOMParser().parseFromString(normalizedHtml, "text/html");
    const ids = Array.from(doc.querySelectorAll("[data-editable]")).map((node) =>
      node.getAttribute("data-editor-id")
    );

    expect(doc.querySelector('[data-slide-root="true"]')?.getAttribute("data-editor-id")).toBe(
      "custom-root"
    );
    expect(ids).toEqual(["hero-title", "text-2"]);
  });
});

describe("updateSlideText", () => {
  test("writes updated text back into htmlSource using data-editor-id targeting", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text">Original heading</h1>
      <p data-editable="text">Original body</p>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideText(html, "text-2", "Updated body");
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");

    expect(doc.querySelector('[data-editor-id="text-1"]')?.textContent).toBe("Original heading");
    expect(doc.querySelector('[data-editor-id="text-2"]')?.textContent).toBe("Updated body");
  });
});

describe("slide operations", () => {
  test("applySlideOperation updates the matching slide html and parsed elements", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text">Before</h1>
      <p data-editable="text">Unchanged</p>
    </div>
  </body>
</html>`,
      "slide-a"
    );

    const updatedSlide = applySlideOperation(originalSlide, {
      type: "text.update",
      slideId: originalSlide.id,
      elementId: "text-1",
      previousText: "Before",
      nextText: "After",
      timestamp: 1,
    });

    expect(updatedSlide.htmlSource).toContain("After");
    expect(updatedSlide.elements.find((element) => element.id === "text-1")?.content).toBe("After");
    expect(updatedSlide.elements.find((element) => element.id === "text-2")?.content).toBe(
      "Unchanged"
    );
  });

  test("invertSlideOperation pairs correctly with text.update and reverses applySlideOperation", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text">Before</h1>
    </div>
  </body>
</html>`,
      "slide-a"
    );

    const operation = {
      type: "text.update" as const,
      slideId: originalSlide.id,
      elementId: "text-1",
      previousText: "Before",
      nextText: "After",
      timestamp: 1,
    };

    const updatedSlide = applySlideOperation(originalSlide, operation);
    const restoredSlide = applySlideOperation(updatedSlide, invertSlideOperation(operation));

    expect(invertSlideOperation(operation)).toMatchObject({
      previousText: "After",
      nextText: "Before",
    });
    expect(restoredSlide.htmlSource).toBe(originalSlide.htmlSource);
    expect(restoredSlide.elements.find((element) => element.id === "text-1")?.content).toBe(
      "Before"
    );
  });
});

describe("history reducer", () => {
  test("commit applies the operation, appends undo history, and clears redo history", () => {
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

  test("undo and redo preserve stack order without recording themselves as new operations", () => {
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
    const committedState = [firstOperation, secondOperation].reduce(
      (state, operation) => reduceHistory(state, { type: "history.commit", operation }),
      createHistoryState([initialSlide])
    );
    const undoneState = reduceHistory(committedState, { type: "history.undo" });
    const redoneState = reduceHistory(undoneState, { type: "history.redo" });
    const undoneAgainState = reduceHistory(redoneState, { type: "history.undo" });
    const fullyUndoneState = reduceHistory(undoneAgainState, { type: "history.undo" });

    expect(undoneState.undoStack).toEqual([firstOperation]);
    expect(undoneState.redoStack).toEqual([secondOperation]);
    expect(redoneState.undoStack).toEqual([firstOperation, secondOperation]);
    expect(redoneState.redoStack).toEqual([]);
    expect(
      undoneAgainState.slides[0]?.elements.find((element) => element.id === "text-2")?.content
    ).toBe("Summary");
    expect(
      fullyUndoneState.slides[0]?.elements.find((element) => element.id === "text-1")?.content
    ).toBe("Title");
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

describe("generated slide contract", () => {
  test("loadSlidesFromManifest applies generated-deck defaults while allowing overrides", async () => {
    const requests: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push({ input, init });

      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith("/manifest.json")) {
        return new Response(
          JSON.stringify({
            topic: "Contract Deck",
            slides: [{ file: "slide-1.html", title: "Slide A" }],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }

      if (url.endsWith("/slide-1.html")) {
        return new Response(
          `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <h1 data-editable="text">Imported title</h1>
    </div>
  </body>
</html>`,
          {
            status: 200,
            headers: { "content-type": "text/html" },
          }
        );
      }

      return new Response("not found", { status: 404 });
    };

    const deck = await loadSlidesFromManifest({
      manifestUrl: "https://example.com/generated/current/manifest.json",
      fetchImpl,
      requestInit: {
        credentials: "same-origin",
      },
    });

    expect(deck?.slides[0]?.id).toBe("generated-slide-1");
    expect(deck?.slides[0]?.title).toBe("Slide A");
    expect(requests).toHaveLength(2);
    expect(requests[0]?.init).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
    });
    expect(requests[1]?.init).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
    });
  });

  test("parseSlide returns editor-compatible metadata for generated slides", () => {
    const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hse-generated-"));
    const outputRoot = path.join(tempRoot, "generated");
    const appOutputRoot = path.join(tempRoot, "synced");

    execFileSync(
      "node",
      [
        path.join(workspaceRoot, "skills/html-slides-generator/generate-slides.mjs"),
        "--topic",
        "Contract Deck",
        "--summary",
        "Contract summary",
        "--points",
        "Point A|Point B|Point C",
        "--out-dir",
        outputRoot,
        "--app-out-dir",
        appOutputRoot,
      ],
      {
        cwd: workspaceRoot,
        stdio: "pipe",
      }
    );

    const manifest = JSON.parse(
      fs.readFileSync(path.join(outputRoot, "manifest.json"), "utf8")
    ) as {
      topic: string;
      slides: Array<{ file: string; title: string }>;
    };
    const firstSlideHtml = fs.readFileSync(path.join(outputRoot, manifest.slides[0].file), "utf8");
    const firstSlide = parseSlide(firstSlideHtml, "generated-slide-1");
    const secondSlideHtml = fs.readFileSync(path.join(outputRoot, manifest.slides[1].file), "utf8");
    const secondSlide = parseSlide(secondSlideHtml, "generated-slide-2");

    expect(manifest.slides).toHaveLength(11);

    expect(firstSlide.id).toBe("generated-slide-1");
    expect(firstSlide.width).toBe(DEFAULT_SLIDE_WIDTH);
    expect(firstSlide.height).toBe(DEFAULT_SLIDE_HEIGHT);
    expect(firstSlide.rootSelector).toBe('[data-editor-id="slide-root"]');
    expect(firstSlide.elements.map((element) => `${element.id}:${element.type}`)).toEqual([
      "text-1:text",
      "text-2:text",
      "text-3:text",
      "block-4:block",
      "text-5:text",
      "text-6:text",
      "block-7:block",
      "text-8:text",
      "text-9:text",
      "block-10:block",
      "block-11:block",
      "text-12:text",
      "text-13:text",
      "block-14:block",
      "text-15:text",
      "text-16:text",
      "block-17:block",
      "text-18:text",
      "text-19:text",
    ]);
    expect(firstSlide.elements.find((element) => element.id === "text-1")?.content).toBe(
      "HTML Slides Editor"
    );
    expect(firstSlide.elements.find((element) => element.id === "block-4")?.tagName).toBe("div");

    expect(secondSlide.elements.find((element) => element.id === "block-4")?.type).toBe("block");
    expect(secondSlide.elements.find((element) => element.id === "text-6")?.content).toBe(
      "Point A"
    );

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
