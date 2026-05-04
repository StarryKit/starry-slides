import { describe, expect, test } from "vitest";
import {
  applySlideOperation,
  duplicateSlideElement,
  ensureEditableSelectors,
  invertSlideOperation,
  parseSlide,
  removeSlideElement,
  updateSlideAttribute,
  updateSlideElementLayout,
  updateSlideElementTransform,
  updateSlideStyle,
  updateSlideText,
} from "./index";

describe("HTML write-back", () => {
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

    const updatedHtml = updateSlideText(html, "text-2", "  Updated body  ");
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");

    expect(doc.querySelector('[data-editor-id="text-1"]')?.textContent).toBe("Original heading");
    expect(doc.querySelector('[data-editor-id="text-2"]')?.textContent).toBe("  Updated body  ");
  });

  test("writes, removes, and cleans up inline styles", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text" style="font-size: 64px; color: red;">Original heading</h1>
    </div>
  </body>
</html>`);

    const colorOnlyHtml = updateSlideStyle(html, "text-1", "font-size", "");
    const colorDoc = new DOMParser().parseFromString(colorOnlyHtml, "text/html");
    const colorNode = colorDoc.querySelector<HTMLElement>('[data-editor-id="text-1"]');
    expect(colorNode?.style.getPropertyValue("font-size")).toBe("");
    expect(colorNode?.style.getPropertyValue("color")).toBe("red");

    const emptyStyleHtml = updateSlideStyle(colorOnlyHtml, "text-1", "color", "");
    const emptyStyleDoc = new DOMParser().parseFromString(emptyStyleHtml, "text/html");
    expect(emptyStyleDoc.querySelector('[data-editor-id="text-1"]')?.hasAttribute("style")).toBe(
      false
    );
  });

  test("writes and removes element attributes", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <button data-editable="block">Action</button>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideAttribute(html, "block-1", "aria-label", "Action button");
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");

    expect(doc.querySelector('[data-editor-id="block-1"]')?.getAttribute("aria-label")).toBe(
      "Action button"
    );

    const clearedHtml = updateSlideAttribute(updatedHtml, "block-1", "aria-label", "");
    const clearedDoc = new DOMParser().parseFromString(clearedHtml, "text/html");
    expect(clearedDoc.querySelector('[data-editor-id="block-1"]')?.hasAttribute("aria-label")).toBe(
      false
    );
  });

  test("duplicates and removes editable elements by editor id", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <p data-editable="text">Copy me</p>
    </div>
  </body>
</html>`);

    const duplicatedHtml = duplicateSlideElement(html, "text-1", "text-1-copy");
    const duplicatedDoc = new DOMParser().parseFromString(duplicatedHtml, "text/html");

    expect(duplicatedDoc.querySelector('[data-editor-id="text-1"]')?.textContent).toBe("Copy me");
    expect(duplicatedDoc.querySelector('[data-editor-id="text-1-copy"]')?.textContent).toBe(
      "Copy me"
    );

    const removedHtml = removeSlideElement(duplicatedHtml, "text-1-copy");
    const removedDoc = new DOMParser().parseFromString(removedHtml, "text/html");
    expect(removedDoc.querySelector('[data-editor-id="text-1-copy"]')).toBeNull();
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

  test("element transform updates preserve rotation while changing translation", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block" style="transform: translate(10px, 20px) rotate(15deg);">Card</div>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideElementTransform(html, "block-1", 5, -10);
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");

    expect(doc.querySelector<HTMLElement>('[data-editor-id="block-1"]')?.style.transform).toBe(
      "translate(15px, 10px) rotate(15deg)"
    );
  });
});

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
});
