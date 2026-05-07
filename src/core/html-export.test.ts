import { describe, expect, test } from "vitest";
import { createSingleHtmlExportDocument, planHtmlExportSlides } from "./html-export";

const slideA = {
  file: "slides/01.html",
  title: "One",
  htmlSource:
    '<!DOCTYPE html><html><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600"><h1>One</h1></main></body></html>',
};
const slideB = {
  file: "slides/02.html",
  title: "Two",
  hidden: true,
  htmlSource:
    '<!DOCTYPE html><html><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600"><h1>Two</h1></main></body></html>',
};

describe("single HTML export", () => {
  test("plans visible presentation slides and skips hidden slides", () => {
    expect(planHtmlExportSlides([slideA, slideB]).map((slide) => slide.file)).toEqual([
      "slides/01.html",
    ]);
  });

  test("falls back to all slides when every slide is hidden", () => {
    expect(
      planHtmlExportSlides([
        { ...slideA, hidden: true },
        { ...slideB, hidden: true },
      ]).map((slide) => slide.file)
    ).toEqual(["slides/01.html", "slides/02.html"]);
  });

  test("creates a self-contained presenter document with escaped slide payload", () => {
    const document = createSingleHtmlExportDocument({
      title: "Deck </script><script>alert(1)</script>",
      slides: [
        {
          ...slideA,
          htmlSource:
            '<!DOCTYPE html><html><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600"><h1>One </script> safe</h1></main></body></html>',
        },
      ],
    });

    expect(document).toContain("<!DOCTYPE html>");
    expect(document).toContain('data-starry-presenter="true"');
    expect(document).toContain("starryPresenterDeck");
    expect(document).toContain("One \\u003C/script\\u003E safe");
    expect(document).not.toContain("One </script> safe");
  });
});
