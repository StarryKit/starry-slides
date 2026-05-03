import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  applySlideOperation,
  captureElementLayoutStyleSnapshot,
  createHistoryState,
  ensureEditableSelectors,
  invertSlideOperation,
  loadSlidesFromManifest,
  parseSlide,
  reduceHistory,
  updateSlideElementLayout,
  updateSlideStyle,
  updateSlideText,
} from "./index";

const regressionDeckConfig = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, "../../../testing/regression-deck/config.json"),
    "utf8"
  )
) as {
  topic: string;
  summary: string;
  points: string[];
  heroKicker: string;
};

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

  test("preserves leading and trailing whitespace when writing text updates", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <p data-editable="text">Original body</p>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideText(html, "text-1", "  Updated body  ");
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");

    expect(doc.querySelector('[data-editor-id="text-1"]')?.textContent).toBe("  Updated body  ");
  });
});

describe("updateSlideStyle", () => {
  test("writes updated inline styles back into htmlSource using data-editor-id targeting", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text">Original heading</h1>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideStyle(html, "text-1", "font-size", "64px");
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");

    expect(
      doc.querySelector('[data-editor-id="text-1"]')?.style.getPropertyValue("font-size")
    ).toBe("64px");
  });

  test("removes inline styles when the next value is empty", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text" style="font-size: 64px; color: red;">Original heading</h1>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideStyle(html, "text-1", "font-size", "");
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");
    const node = doc.querySelector('[data-editor-id="text-1"]');

    expect(node?.style.getPropertyValue("font-size")).toBe("");
    expect(node?.style.getPropertyValue("color")).toBe("red");
  });

  test("removes the style attribute after the final inline style is cleared", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text" style="font-size: 64px;">Original heading</h1>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideStyle(html, "text-1", "font-size", "");
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");
    const node = doc.querySelector('[data-editor-id="text-1"]');

    expect(node?.hasAttribute("style")).toBe(false);
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

  test("applySlideOperation preserves surrounding whitespace in parsed element content", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <p data-editable="text">Before</p>
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
      nextText: "  After  ",
      timestamp: 1,
    });

    expect(updatedSlide.elements.find((element) => element.id === "text-1")?.content).toBe(
      "  After  "
    );
  });

  test("applySlideOperation updates the matching slide inline styles", () => {
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

    const updatedSlide = applySlideOperation(originalSlide, {
      type: "style.update",
      slideId: originalSlide.id,
      elementId: "text-1",
      propertyName: "font-size",
      previousValue: "",
      nextValue: "72px",
      timestamp: 1,
    });

    expect(updatedSlide.htmlSource).toContain('style="font-size: 72px;"');
  });

  test("applySlideOperation keeps parsed metadata current after style edits", () => {
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

    const updatedSlide = applySlideOperation(originalSlide, {
      type: "style.update",
      slideId: originalSlide.id,
      elementId: "text-1",
      propertyName: "color",
      previousValue: "",
      nextValue: "#ff0000",
      timestamp: 1,
    });
    const doc = new DOMParser().parseFromString(updatedSlide.htmlSource, "text/html");

    expect(updatedSlide.elements.find((element) => element.id === "text-1")?.content).toBe(
      "Before"
    );
    expect(doc.querySelector<HTMLElement>('[data-editor-id="text-1"]')?.style.color).toBe(
      "rgb(255, 0, 0)"
    );
  });

  test("invertSlideOperation pairs correctly with style.update and reverses applySlideOperation", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text" style="font-size: 48px;">Before</h1>
    </div>
  </body>
</html>`,
      "slide-a"
    );

    const operation = {
      type: "style.update" as const,
      slideId: originalSlide.id,
      elementId: "text-1",
      propertyName: "font-size",
      previousValue: "48px",
      nextValue: "72px",
      timestamp: 1,
    };

    const updatedSlide = applySlideOperation(originalSlide, operation);
    const restoredSlide = applySlideOperation(updatedSlide, invertSlideOperation(operation));
    const restoredDoc = new DOMParser().parseFromString(restoredSlide.htmlSource, "text/html");

    expect(invertSlideOperation(operation)).toMatchObject({
      previousValue: "72px",
      nextValue: "48px",
    });
    expect(
      restoredDoc.querySelector('[data-editor-id="text-1"]')?.style.getPropertyValue("font-size")
    ).toBe("48px");
  });

  test("layout updates write block position, size, and rotation back into htmlSource", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block">Card</div>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideElementLayout(html, "block-1", {
      position: "absolute",
      left: "120px",
      top: "180px",
      width: "320px",
      height: "220px",
      transform: "rotate(18deg)",
      transformOrigin: "center center",
      margin: "0px",
      zIndex: "1",
    });
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");
    const node = doc.querySelector<HTMLElement>('[data-editor-id="block-1"]');

    expect(node?.style.position).toBe("absolute");
    expect(node?.style.left).toBe("120px");
    expect(node?.style.top).toBe("180px");
    expect(node?.style.width).toBe("320px");
    expect(node?.style.height).toBe("220px");
    expect(node?.style.transform).toBe("rotate(18deg)");
    expect(node?.style.transformOrigin).toBe("center center");
  });

  test("captureElementLayoutStyleSnapshot preserves inline layout styles used by history", () => {
    const doc = new DOMParser().parseFromString(
      `<!DOCTYPE html><html><body><div style="position:absolute;left:12px;top:24px;width:300px;height:160px;transform:rotate(12deg);transform-origin:center center;margin:0;z-index:4"></div></body></html>`,
      "text/html"
    );
    const node = doc.querySelector("div");

    expect(node).not.toBeNull();
    if (!(node instanceof HTMLElement)) {
      throw new Error("Expected a div node.");
    }

    expect(captureElementLayoutStyleSnapshot(node)).toEqual({
      position: "absolute",
      left: "12px",
      top: "24px",
      width: "300px",
      height: "160px",
      transform: "rotate(12deg)",
      transformOrigin: "center center",
      margin: "0px",
      zIndex: "4",
    });
  });

  test("layout update operations undo and redo cleanly", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block">Card</div>
    </div>
  </body>
</html>`,
      "slide-a"
    );

    const operation = {
      type: "element.layout.update" as const,
      slideId: originalSlide.id,
      elementId: "block-1",
      previousStyle: {
        position: null,
        left: null,
        top: null,
        width: null,
        height: null,
        transform: null,
        transformOrigin: null,
        margin: null,
        zIndex: null,
      },
      nextStyle: {
        position: "absolute",
        left: "240px",
        top: "140px",
        width: "360px",
        height: "260px",
        transform: "rotate(24deg)",
        transformOrigin: "center center",
        margin: "0px",
        zIndex: "1",
      },
      timestamp: 2,
    };

    const updatedSlide = applySlideOperation(originalSlide, operation);
    const restoredSlide = applySlideOperation(updatedSlide, invertSlideOperation(operation));
    const updatedDoc = new DOMParser().parseFromString(updatedSlide.htmlSource, "text/html");
    const updatedNode = updatedDoc.querySelector<HTMLElement>('[data-editor-id="block-1"]');
    const restoredDoc = new DOMParser().parseFromString(restoredSlide.htmlSource, "text/html");
    const restoredNode = restoredDoc.querySelector<HTMLElement>('[data-editor-id="block-1"]');

    expect(updatedNode?.style.position).toBe("absolute");
    expect(updatedNode?.style.left).toBe("240px");
    expect(updatedNode?.style.width).toBe("360px");
    expect(updatedNode?.style.transform).toBe("rotate(24deg)");
    expect(restoredSlide.htmlSource).toBe(originalSlide.htmlSource);
    expect(restoredNode?.getAttribute("style") || "").toBe("");
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

  test("undo and redo preserve exact surrounding whitespace in committed text edits", () => {
    const initialSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <p data-editable="text">Summary</p>
    </div>
  </body>
</html>`,
      "slide-1"
    );
    const operation = {
      type: "text.update" as const,
      slideId: "slide-1",
      elementId: "text-1",
      previousText: "Summary",
      nextText: "  Summary  ",
      timestamp: 1,
    };

    const committedState = reduceHistory(createHistoryState([initialSlide]), {
      type: "history.commit",
      operation,
    });
    const undoneState = reduceHistory(committedState, { type: "history.undo" });
    const redoneState = reduceHistory(undoneState, { type: "history.redo" });

    expect(committedState.slides[0]?.elements[0]?.content).toBe("  Summary  ");
    expect(undoneState.slides[0]?.elements[0]?.content).toBe("Summary");
    expect(redoneState.slides[0]?.elements[0]?.content).toBe("  Summary  ");
  });

  test("undo and redo restore committed style edits", () => {
    const initialSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text" style="font-size: 48px;">Title</h1>
    </div>
  </body>
</html>`,
      "slide-1"
    );
    const operation = {
      type: "style.update" as const,
      slideId: "slide-1",
      elementId: "text-1",
      propertyName: "font-size",
      previousValue: "48px",
      nextValue: "72px",
      timestamp: 1,
    };

    const committedState = reduceHistory(createHistoryState([initialSlide]), {
      type: "history.commit",
      operation,
    });
    const undoneState = reduceHistory(committedState, { type: "history.undo" });
    const redoneState = reduceHistory(undoneState, { type: "history.redo" });

    expect(committedState.slides[0]?.htmlSource).toContain("72px");
    expect(undoneState.slides[0]?.htmlSource).toContain("48px");
    expect(redoneState.slides[0]?.htmlSource).toContain("72px");
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

      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

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
        path.join(workspaceRoot, "testing/regression-deck/prepare-regression-deck.mjs"),
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

    expect(manifest.topic).toBe(regressionDeckConfig.topic);
    expect(manifest.slides).toHaveLength(12);

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
      regressionDeckConfig.heroKicker
    );
    expect(firstSlide.elements.find((element) => element.id === "block-4")?.tagName).toBe("div");

    expect(secondSlide.elements.find((element) => element.id === "block-4")?.type).toBe("block");
    expect(secondSlide.elements.find((element) => element.id === "text-6")?.content).toBe(
      regressionDeckConfig.points[0]
    );

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
