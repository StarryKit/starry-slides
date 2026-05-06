import { describe, expect, test } from "vitest";
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  ensureEditableSelectors,
  getSlideInlineStyleValue,
  parseSlide,
  querySlideElement,
} from "./index";

describe("slide document contract", () => {
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

  test("parseSlide returns editor-compatible metadata", () => {
    const slide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <h1 data-editable="text">Hero</h1>
      <div data-editable="block">Card</div>
    </div>
  </body>
</html>`,
      "Generated Slide 1"
    );

    expect(slide.id).toBe("generated-slide-1");
    expect(slide.title).toBe("Hero");
    expect(slide.width).toBe(DEFAULT_SLIDE_WIDTH);
    expect(slide.height).toBe(DEFAULT_SLIDE_HEIGHT);
    expect(slide.rootSelector).toBe('[data-editor-id="slide-root"]');
    expect(slide.elements.map((element) => `${element.id}:${element.type}`)).toEqual([
      "text-1:text",
      "block-2:block",
    ]);
  });

  test("parseSlide treats data-group block containers as distinct group elements", () => {
    const slide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <div data-editable="block" data-group="true">
        <p data-editable="text">Grouped text</p>
      </div>
      <div data-editable="block">
        <p data-editable="text">Normal nested text</p>
      </div>
    </div>
  </body>
</html>`,
      "slide-1"
    );

    expect(slide.elements.map((element) => `${element.id}:${element.type}`)).toEqual([
      "block-1:group",
      "text-2:text",
      "block-3:block",
      "text-4:text",
    ]);
  });

  test("querySlideElement and getSlideInlineStyleValue hide selector details", () => {
    const slide = parseSlide(
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
    const doc = new DOMParser().parseFromString(slide.htmlSource, "text/html");

    expect(querySlideElement(doc, "text-1")?.textContent).toBe("Title");
    expect(getSlideInlineStyleValue(slide, "text-1", "font-size")).toBe("48px");
  });
});
