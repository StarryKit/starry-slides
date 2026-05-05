import { describe, expect, test } from "vitest";
import {
  applySlideOperation,
  createElementPlacement,
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
} from "./index";

describe("slide operations", () => {
  test("applySlideOperation updates matching slide html and parsed elements", () => {
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

  test("applySlideOperation preserves generated-deck source identity", () => {
    const originalSlide = {
      ...parseSlide(
        `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
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

  test("invertSlideOperation reverses text, style, and layout operations", () => {
    const originalSlide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
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
    <div class="slide-container" data-slide-root="true">
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
          parentElementId: "slide-root",
          previousSiblingElementId: null,
          nextSiblingElementId: "text-2",
          html: '<h1 data-editable="text" data-editor-id="text-1">One</h1>',
          timestamp: 4,
        },
        {
          type: "element.insert" as const,
          slideId: originalSlide.id,
          elementId: "text-3",
          parentElementId: "slide-root",
          previousSiblingElementId: "text-2",
          nextSiblingElementId: null,
          html: '<p data-editable="text" data-editor-id="text-3">Three</p>',
          timestamp: 4,
        },
      ],
    };

    const updatedSlide = applySlideOperation(originalSlide, operation);
    const restoredSlide = applySlideOperation(updatedSlide, invertSlideOperation(operation));

    expect(updatedSlide.elements.map((element) => element.content)).toEqual(["Two", "Three"]);
    expect(restoredSlide.elements.map((element) => element.content)).toEqual(["One", "Two"]);
  });
});
