import { describe, expect, test } from "vitest";
import { getDeckSlideBaseUrl, injectBaseTag } from "./slide-html-base";

describe("slide HTML base URL injection", () => {
  test("builds a deck base URL from the slide source directory", () => {
    expect(getDeckSlideBaseUrl("slides/01-image.html")).toBe("/deck/slides/");
    expect(getDeckSlideBaseUrl("chapters/intro/01.html")).toBe("/deck/chapters/intro/");
    expect(getDeckSlideBaseUrl()).toBe("/deck/slides/");
  });

  test("injects the base tag after an existing head tag", () => {
    const html = "<!DOCTYPE html><html><head><title>Slide</title></head><body></body></html>";

    expect(injectBaseTag(html, "slides/01.html")).toContain(
      '<head><base href="/deck/slides/"><title>Slide</title>'
    );
  });

  test("prepends the base tag when the slide has no head tag", () => {
    expect(injectBaseTag("<body>Slide</body>", "slides/01.html")).toBe(
      '<base href="/deck/slides/"><body>Slide</body>'
    );
  });

  test("supports parent-relative deck asset references", () => {
    const assetUrl = new URL(
      "../assets/test-image.svg",
      `http://localhost${getDeckSlideBaseUrl("slides/17.html")}`
    );

    expect(assetUrl.pathname).toBe("/deck/assets/test-image.svg");
  });
});
