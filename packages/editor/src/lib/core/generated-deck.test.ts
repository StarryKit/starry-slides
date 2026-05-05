// @vitest-environment jsdom

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  loadSlidesFromManifest,
  parseSlide,
} from "./index";

const regressionDeckConfig = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, "../../../../../testing/regression-deck/config.json"),
    "utf8"
  )
) as {
  topic: string;
  summary: string;
  points: string[];
  heroKicker: string;
};

describe("generated deck import", () => {
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
    expect(deck?.slides[0]?.sourceFile).toBe("slide-1.html");
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
    const workspaceRoot = path.resolve(import.meta.dirname, "../../../../../");
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
    expect(manifest.slides).toHaveLength(13);
    expect(firstSlide.id).toBe("generated-slide-1");
    expect(firstSlide.width).toBe(DEFAULT_SLIDE_WIDTH);
    expect(firstSlide.height).toBe(DEFAULT_SLIDE_HEIGHT);
    expect(firstSlide.rootSelector).toBe('[data-editor-id="slide-root"]');
    expect(
      firstSlide.elements.some((element) => element.content === regressionDeckConfig.heroKicker)
    ).toBe(true);
    expect(firstSlide.elements.some((element) => element.tagName === "div")).toBe(true);
    expect(secondSlide.elements.some((element) => element.type === "block")).toBe(true);
    expect(
      secondSlide.elements.some((element) => element.content === regressionDeckConfig.points[0])
    ).toBe(true);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
