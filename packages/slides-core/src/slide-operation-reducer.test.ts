import { describe, expect, test } from "vitest";
import {
  SLIDE_ROOT_ID,
  applySlideOperation,
  createElementPlacement,
  createGroupCreateOperation,
  createUniqueElementId,
  duplicateSlideElement,
  ensureEditableSelectors,
  getSlideElementHtml,
  insertSlideElement,
  invertSlideOperation,
  parseSlide,
  removeSlideElement,
  updateSlideAttribute,
  updateSlideElementHtmlIds,
  updateSlideElementLayout,
  updateSlideElementTransform,
  updateSlideStyle,
  updateSlideText,
} from "./index.js";

describe("slide operations", () => {
  test("applySlideOperation updates matching slide html and parsed elements", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
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

  test("applySlideOperation preserves generated-deck source identity", () => {
    const originalSlide = {
      ...parseSlide(
        `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <h1 data-editable="text">Before</h1>
    </div>
  </body>
</html>`,
        "slide-a"
      ),
      sourceFile: "slide-a.html",
    };

    const updatedSlide = applySlideOperation(originalSlide, {
      type: "text.update",
      slideId: originalSlide.id,
      elementId: "text-1",
      previousText: "Before",
      nextText: "After",
      timestamp: 1,
    });

    expect(updatedSlide.sourceFile).toBe("slide-a.html");
  });

  test("applySlideOperation updates body styles when the slide root is selected", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <style>
      body {
        width: 1920px;
        height: 1080px;
        background: linear-gradient(135deg, #0f172a, #2563eb);
      }
    </style>
  </head>
  <body>
    <div class="slide-container">
      <h1 data-editable="text">Before</h1>
    </div>
  </body>
</html>`,
      "slide-a"
    );

    const updatedSlide = applySlideOperation(originalSlide, {
      type: "style.update",
      slideId: originalSlide.id,
      elementId: SLIDE_ROOT_ID,
      propertyName: "background-color",
      previousValue: "",
      nextValue: "rgb(254, 240, 138)",
      timestamp: 1,
    });
    const updatedDoc = new DOMParser().parseFromString(updatedSlide.htmlSource, "text/html");

    expect(updatedDoc.body.style.backgroundColor).toBe("rgb(254, 240, 138)");
  });

  test("invertSlideOperation reverses text, style, and layout operations", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <h1 data-editable="text" style="font-size: 48px;">Before</h1>
      <div data-editable="block">Card</div>
    </div>
  </body>
</html>`,
      "slide-a"
    );

    const textOperation = {
      type: "text.update" as const,
      slideId: originalSlide.id,
      elementId: "text-1",
      previousText: "Before",
      nextText: "After",
      timestamp: 1,
    };
    const styleOperation = {
      type: "style.update" as const,
      slideId: originalSlide.id,
      elementId: "text-1",
      propertyName: "font-size",
      previousValue: "48px",
      nextValue: "72px",
      timestamp: 2,
    };
    const attributeOperation = {
      type: "attribute.update" as const,
      slideId: originalSlide.id,
      elementId: "block-2",
      attributeName: "aria-label",
      previousValue: "",
      nextValue: "Card",
      timestamp: 2.5,
    };
    const layoutOperation = {
      type: "element.layout.update" as const,
      slideId: originalSlide.id,
      elementId: "block-2",
      previousStyle: {
        position: null,
        left: null,
        top: null,
        width: null,
        maxWidth: null,
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
        maxWidth: "none",
        height: "260px",
        transform: "rotate(24deg)",
        transformOrigin: "center center",
        margin: "0px",
        zIndex: "1",
      },
      timestamp: 3,
    };

    expect(
      applySlideOperation(
        applySlideOperation(originalSlide, textOperation),
        invertSlideOperation(textOperation)
      ).htmlSource
    ).toBe(originalSlide.htmlSource);
    expect(invertSlideOperation(styleOperation)).toMatchObject({
      previousValue: "72px",
      nextValue: "48px",
    });
    expect(invertSlideOperation(attributeOperation)).toMatchObject({
      previousValue: "Card",
      nextValue: "",
    });
    expect(
      applySlideOperation(
        applySlideOperation(originalSlide, layoutOperation),
        invertSlideOperation(layoutOperation)
      ).htmlSource
    ).toBe(originalSlide.htmlSource);
  });

  test("insert, remove, and batch operations apply and undo cleanly", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <h1 data-editable="text">One</h1>
      <p data-editable="text">Two</p>
    </div>
  </body>
</html>`,
      "slide-a"
    );
    const operation = {
      type: "operation.batch" as const,
      slideId: originalSlide.id,
      timestamp: 4,
      operations: [
        {
          type: "element.remove" as const,
          slideId: originalSlide.id,
          elementId: "text-1",
          parentElementId: null,
          previousSiblingElementId: null,
          nextSiblingElementId: "text-2",
          html: '<h1 data-editable="text" data-editable-id="text-1">One</h1>',
          timestamp: 4,
        },
        {
          type: "element.insert" as const,
          slideId: originalSlide.id,
          elementId: "text-3",
          parentElementId: null,
          previousSiblingElementId: "text-2",
          nextSiblingElementId: null,
          html: '<p data-editable="text" data-editable-id="text-3">Three</p>',
          timestamp: 4,
        },
      ],
    };

    const updatedSlide = applySlideOperation(originalSlide, operation);
    const restoredSlide = applySlideOperation(updatedSlide, invertSlideOperation(operation));

    expect(updatedSlide.elements.map((element) => element.content)).toEqual(["Two", "Three"]);
    expect(restoredSlide.elements.map((element) => element.content)).toEqual(["One", "Two"]);
  });

  test("group operations apply and undo as a single domain operation", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <p data-editable="text" data-editable-id="text-1" style="left: 20px; top: 30px; width: 100px; height: 40px;">One</p>
      <p data-editable="text" data-editable-id="text-2" style="left: 140px; top: 50px; width: 100px; height: 40px;">Two</p>
    </div>
  </body>
</html>`,
      "slide-a"
    );
    const operation = createGroupCreateOperation({
      html: originalSlide.htmlSource,
      slideId: originalSlide.id,
      groupElementId: "group-new",
      elementIds: ["text-1", "text-2"],
      timestamp: 5,
    });

    expect(operation).not.toBeNull();
    if (!operation) {
      return;
    }

    const groupedSlide = applySlideOperation(originalSlide, operation);
    const restoredSlide = applySlideOperation(groupedSlide, invertSlideOperation(operation));

    expect(groupedSlide.elements.map((element) => `${element.id}:${element.type}`)).toEqual([
      "group-new:block",
      "text-1:text",
      "text-2:text",
    ]);
    expect(invertSlideOperation(operation).type).toBe("group.ungroup");
    expect(restoredSlide.htmlSource).toBe(originalSlide.htmlSource);
  });
});
