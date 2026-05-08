import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  blockElement,
  createTempDeck,
  slideHtml,
  textElement,
  writeDeck,
} from "../../tests/helpers/deck-fixtures";
import { getManifestSlides, renderPreviewManifest, verifyRenderedOverflow } from "./view-renderer";

const decks: Array<{ cleanup: () => void }> = [];

function createDeck() {
  const deck = createTempDeck();
  decks.push(deck);
  return deck.root;
}

afterEach(() => {
  for (const deck of decks.splice(0)) {
    deck.cleanup();
  }
});

describe("view renderer", () => {
  test("getManifestSlides returns manifest-ordered slides that exist on disk", () => {
    const deck = createDeck();
    writeDeck(deck, [
      { file: "slides/02.html", title: "Second" },
      { file: "slides/01.html", title: "First" },
    ]);
    fs.writeFileSync(
      path.join(deck, "manifest.json"),
      JSON.stringify(
        {
          slides: [
            { file: "slides/02.html", title: "Second" },
            { file: "slides/missing.html", title: "Missing" },
            { file: "slides/01.html", title: "First" },
          ],
        },
        null,
        2
      )
    );

    const slides = getManifestSlides(deck);

    expect(slides.map((slide) => slide.file)).toEqual(["slides/02.html", "slides/01.html"]);
    expect(slides.map((slide) => slide.index)).toEqual([0, 2]);
  });

  test("preview filenames are stable and collision-resistant for same basenames", async () => {
    const deck = createDeck();
    writeDeck(deck, [
      { file: "section-a/slide.html", title: "A" },
      { file: "section-b/slide.html", title: "B" },
    ]);

    const first = await renderPreviewManifest({ deckPath: deck });
    const second = await renderPreviewManifest({ deckPath: deck });

    expect(first.slides.map((slide) => slide.file)).toEqual(
      second.slides.map((slide) => slide.file)
    );
    expect(new Set(first.slides.map((slide) => slide.file)).size).toBe(2);
    expect(first.slides.every((slide) => slide.file.endsWith(".png"))).toBe(true);
  });

  test("renderPreviewManifest writes PNG files with absolute paths in the default output directory", async () => {
    const deck = createDeck();
    writeDeck(deck, [{ file: "slides/01.html" }]);

    const manifest = await renderPreviewManifest({ deckPath: deck });

    expect(manifest.outputDir).toBe(path.join(deck, ".starry-slides", "view"));
    expect(manifest.mode).toBe("all");
    expect(manifest.slides).toHaveLength(1);
    expect(path.isAbsolute(manifest.slides[0].path)).toBe(true);
    expect(fs.existsSync(manifest.slides[0].path)).toBe(true);
    expect(fs.readFileSync(manifest.slides[0].path).subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  });

  test("explicit outDir overrides the default directory and clears stale files", async () => {
    const deck = createDeck();
    writeDeck(deck, [{ file: "slides/01.html" }]);
    const outDir = path.join(deck, "previews");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "stale.png"), "stale");

    const manifest = await renderPreviewManifest({ deckPath: deck, outDir });

    expect(manifest.outputDir).toBe(outDir);
    expect(fs.existsSync(path.join(outDir, "stale.png"))).toBe(false);
    expect(fs.existsSync(manifest.slides[0].path)).toBe(true);
    expect(fs.existsSync(path.join(deck, ".starry-slides", "view"))).toBe(false);
  });

  test("single-slide rendering uses exact manifest file selection", async () => {
    const deck = createDeck();
    writeDeck(deck, [
      { file: "slides/01.html", title: "One" },
      { file: "slides/02.html", title: "Two" },
    ]);

    const manifest = await renderPreviewManifest({
      deckPath: deck,
      slideFile: "slides/02.html",
    });

    expect(manifest.mode).toBe("single");
    expect(manifest.slides.map((slide) => slide.slideFile)).toEqual(["slides/02.html"]);
    await expect(renderPreviewManifest({ deckPath: deck, slideFile: "2" })).rejects.toThrow(
      "--slide must match a manifest slide file exactly: 2"
    );
  });

  test("rendered overflow reports slide, element-content, and element-bounds issues", async () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        file: "slides/slide-overflow.html",
        html: `<!DOCTYPE html><html><body style="margin:0"><main data-slide-root="true" data-slide-width="800" data-slide-height="600" data-editor-id="slide-root" style="position:relative;width:800px;height:600px;overflow:visible">${blockElement(
          "block-1",
          "Outside",
          "left:780px;top:20px;width:100px;height:100px;position:absolute"
        )}</main></body></html>`,
      },
      {
        file: "slides/content-overflow.html",
        html: slideHtml(
          textElement(
            "text-1",
            "This unbreakable content should overflow its constrained box",
            "width:40px;height:20px;overflow:hidden;white-space:nowrap"
          )
        ),
      },
    ]);

    const issues = await verifyRenderedOverflow(deck);

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "overflow.slide",
        "overflow.element-content",
        "overflow.element-bounds",
      ])
    );
    expect(issues.every((issue) => issue.slideFile && issue.selector)).toBe(true);
  });

  test("data-allow-overflow exempts rendered overflow issues", async () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        file: "slides/01.html",
        html: `<!DOCTYPE html><html><body style="margin:0"><main data-slide-root="true" data-slide-width="800" data-slide-height="600" data-editor-id="slide-root" data-allow-overflow="true" style="position:relative;width:800px;height:600px;overflow:visible">${blockElement(
          "block-1",
          "Allowed",
          "left:780px;top:20px;width:100px;height:100px;position:absolute"
        )}</main></body></html>`,
      },
    ]);

    const issues = await verifyRenderedOverflow(deck);

    expect(issues).toEqual([]);
  });

  test("decorative shadows and blur are not treated as rendered overflow", async () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        file: "slides/01.html",
        html: slideHtml(
          blockElement(
            "block-1",
            "Decorative",
            "left:20px;top:20px;width:120px;height:80px;position:absolute;box-shadow:0 0 80px rgba(0,0,0,.45);filter:blur(2px)"
          )
        ),
      },
    ]);

    const issues = await verifyRenderedOverflow(deck);

    expect(issues).toEqual([]);
  });
});
