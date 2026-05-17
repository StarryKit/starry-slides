import { describe, expect, test } from "vitest";
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  SLIDE_ROOT_ID,
  ensureEditableSelectors,
  getSlideInlineStyleValue,
  parseSlide,
  querySlideElement,
} from "./index.js";

describe("slide document contract", () => {
  test("adds stable data-editable-id values to editable nodes without mutating body identity", () => {
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
    const ids = Array.from(doc.querySelectorAll("[data-editable]")).map((node) =>
      node.getAttribute("data-editable-id")
    );

    expect(doc.body.getAttribute("data-editable-id")).toBeNull();
    expect(doc.body.style.position).toBe("relative");
    expect(ids).toEqual(["text-1", "text-2", "block-3", "text-4"]);
  });

  test("preserves existing editable ids", () => {
    const html = `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <h1 data-editable="text" data-editable-id="hero-title">Title</h1>
      <p data-editable="text">Body</p>
    </div>
  </body>
</html>`;

    const normalizedHtml = ensureEditableSelectors(html);
    const doc = new DOMParser().parseFromString(normalizedHtml, "text/html");
    const ids = Array.from(doc.querySelectorAll("[data-editable]")).map((node) =>
      node.getAttribute("data-editable-id")
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
    expect(slide.rootSelector).toBe("body");
    expect(slide.elements.map((element) => `${element.id}:${element.type}`)).toEqual([
      "text-1:text",
      "block-2:block",
    ]);
  });

  test("parseSlide treats nested block containers as block editables", () => {
    const slide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <div data-editable="block">
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
      "block-1:block",
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
    <div class="slide-container">
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

  test("parseSlide preserves authored body background and exposes root inline style access", () => {
    const slide = parseSlide(
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <style>
      body {
        width: 1920px;
        height: 1080px;
        background: linear-gradient(135deg, rgb(15, 23, 42), rgb(37, 99, 235));
      }
    </style>
  </head>
  <body>
    <div class="slide-container">
      <h1 data-editable="text">Title</h1>
    </div>
  </body>
</html>`,
      "slide-1"
    );
    const doc = new DOMParser().parseFromString(slide.htmlSource, "text/html");

    expect(doc.body.style.background).toBe("");
    expect(getSlideInlineStyleValue(slide, SLIDE_ROOT_ID, "background")).toBe("");
  });
});
