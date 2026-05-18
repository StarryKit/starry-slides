import type { SlideModel } from "@starrykit/slides-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderSlideThumbnail } from "./thumbnail-renderer";

const toPngMock = vi.hoisted(() => vi.fn());

vi.mock("html-to-image", () => ({
  toPng: toPngMock,
}));

function createSlide(overrides: Partial<SlideModel> = {}): SlideModel {
  return {
    id: "slide-1",
    title: "Full-size slide",
    width: 1920,
    height: 1080,
    rootSelector: "body",
    sourceFile: "slides/slide-1.html",
    elements: [],
    htmlSource: `<!DOCTYPE html>
<html lang="en">
  <head>
    <style>
      html,
      body {
        margin: 0;
        width: 1920px;
        height: 1080px;
      }

      body {
        background: rgb(11, 18, 32);
        position: relative;
      }
    </style>
  </head>
  <body>
    <div data-testid="top-left" style="position: absolute; left: 0; top: 0;">TL</div>
    <div data-testid="top-right" style="position: absolute; right: 0; top: 0;">TR</div>
    <div data-testid="bottom-left" style="position: absolute; left: 0; bottom: 0;">BL</div>
    <div data-testid="bottom-right" style="position: absolute; right: 0; bottom: 0;">BR</div>
  </body>
</html>`,
    ...overrides,
  };
}

describe("renderSlideThumbnail", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    toPngMock.mockReset();
    toPngMock.mockResolvedValue("data:image/png;base64,thumbnail");
  });

  test("captures a scaled full-size slide on initial render instead of cropping the upper-left", async () => {
    const slide = createSlide();

    await renderSlideThumbnail(slide);

    expect(toPngMock).toHaveBeenCalledTimes(1);
    const [renderTarget, options] = toPngMock.mock.calls[0] as [
      HTMLElement,
      { canvasWidth: number; canvasHeight: number; pixelRatio: number },
    ];
    const scaledSlide = renderTarget.firstElementChild as HTMLElement | null;

    expect(options).toMatchObject({
      width: 224,
      height: 126,
      canvasWidth: 224,
      canvasHeight: 126,
      pixelRatio: 2,
    });
    expect(renderTarget.style.width).toBe("224px");
    expect(renderTarget.style.height).toBe("126px");
    expect(renderTarget.style.overflow).toBe("hidden");
    expect(scaledSlide?.tagName).toBe("BODY");
    expect(scaledSlide?.style.width).toBe("1920px");
    expect(scaledSlide?.style.height).toBe("1080px");
    expect(scaledSlide?.style.transform).toBe("scale(0.11666666666666667)");
    expect(scaledSlide?.style.transformOrigin).toBe("top left");
    expect(scaledSlide?.querySelector('[data-testid="bottom-right"]')?.textContent).toBe("BR");
  });

  test("uses the slide aspect ratio for non-default fixed slide sizes", async () => {
    const slide = createSlide({
      width: 1000,
      height: 1000,
      htmlSource: `<!DOCTYPE html>
<html lang="en">
  <body style="margin: 0; width: 1000px; height: 1000px;">
    <div style="position: absolute; right: 0; bottom: 0;">BR</div>
  </body>
</html>`,
    });

    await renderSlideThumbnail(slide);

    const [renderTarget, options] = toPngMock.mock.calls[0] as [
      HTMLElement,
      { canvasWidth: number; canvasHeight: number },
    ];
    const scaledSlide = renderTarget.firstElementChild as HTMLElement | null;

    expect(options).toMatchObject({
      width: 224,
      height: 224,
      canvasWidth: 224,
      canvasHeight: 224,
    });
    expect(renderTarget.style.width).toBe("224px");
    expect(renderTarget.style.height).toBe("224px");
    expect(scaledSlide?.style.width).toBe("1000px");
    expect(scaledSlide?.style.height).toBe("1000px");
    expect(scaledSlide?.style.transform).toBe("scale(0.224)");
  });
});
