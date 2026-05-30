import { describe, expect, test } from "vitest";
import {
  STARRY_SLIDES_EXPORT_ICON_DATA_URL,
  STARRY_SLIDES_EXPORT_ICON_PNG_BASE64,
  STARRY_SLIDES_QUICKLOOK_POSTER_DATA_URL,
  STARRY_SLIDES_QUICKLOOK_POSTER_PNG_BASE64,
  createSingleHtmlExportDocument,
  planHtmlExportSlides,
} from "./html-export.js";

const slideA = {
  file: "slides/01.html",
  title: "One",
  htmlSource:
    '<!DOCTYPE html><html><body style="margin:0;position:relative;width:800px;height:600px;overflow:hidden;"><h1>One</h1></body></html>',
};
const slideB = {
  file: "slides/02.html",
  title: "Two",
  hidden: true,
  htmlSource:
    '<!DOCTYPE html><html><body style="margin:0;position:relative;width:800px;height:600px;overflow:hidden;"><h1>Two</h1></body></html>',
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
            '<!DOCTYPE html><html><body style="margin:0;position:relative;width:800px;height:600px;overflow:hidden;"><h1>One </script> safe</h1></body></html>',
        },
      ],
    });

    expect(document).toContain("<!DOCTYPE html>");
    expect(document).toContain('data-starry-presenter="true"');
    expect(document).toContain("starryPresenterDeck");
    expect(document).toContain("One \\u003C/script\\u003E safe");
    expect(document).not.toContain("One </script> safe");
  });

  test("embeds Starry Slides icon metadata for standalone HTML previews", () => {
    const document = createSingleHtmlExportDocument({
      title: "Preview Deck",
      slides: [slideA],
    });

    expect(document).toContain('<link rel="icon" type="image/png" href="data:image/png;base64,');
    expect(document).toContain('<link rel="apple-touch-icon" href="data:image/png;base64,');
    expect(document).toContain('<meta property="og:image" content="data:image/png;base64,');
    expect(document).toContain('<meta name="theme-color" content="#6D5DF6"');
  });

  test("uses a document-style PNG icon for standalone HTML previews", () => {
    const iconBytes = Buffer.from(STARRY_SLIDES_EXPORT_ICON_PNG_BASE64, "base64");

    expect(iconBytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(iconBytes.readUInt32BE(16)).toBe(1024);
    expect(iconBytes.readUInt32BE(20)).toBe(1024);
  });

  test("includes a static Quick Look poster that the browser runtime hides", () => {
    const document = createSingleHtmlExportDocument({
      title: "Preview Deck",
      slides: [slideA],
    });
    const posterBytes = Buffer.from(STARRY_SLIDES_QUICKLOOK_POSTER_PNG_BASE64, "base64");

    expect(document).toContain("document.documentElement.classList.add('starry-runtime')");
    expect(document).toContain('class="starry-quicklook-poster"');
    expect(document).toContain(`src="${STARRY_SLIDES_QUICKLOOK_POSTER_DATA_URL}"`);
    expect(document).not.toContain(`class="starry-quicklook-poster" aria-hidden="true">
      <img src="${STARRY_SLIDES_EXPORT_ICON_DATA_URL}"`);
    expect(document).toContain(".starry-runtime .starry-quicklook-poster{display:none!important}");
    expect(posterBytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });
});
