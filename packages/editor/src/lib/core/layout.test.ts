import { describe, expect, test } from "vitest";
import {
  captureElementLayoutStyleSnapshot,
  composeTransform,
  elementRectToStageRect,
  parseTransformParts,
  stageDeltaToSlideDelta,
} from "./index";

describe("layout helpers", () => {
  test("captureElementLayoutStyleSnapshot preserves inline layout styles used by history", () => {
    const doc = new DOMParser().parseFromString(
      `<!DOCTYPE html><html><body><div style="position:absolute;left:12px;top:24px;width:300px;height:160px;transform:rotate(12deg);transform-origin:center center;margin:0;z-index:4"></div></body></html>`,
      "text/html"
    );
    const node = doc.querySelector("div");

    expect(node).not.toBeNull();
    if (!(node instanceof HTMLElement)) {
      throw new Error("Expected a div node.");
    }

    expect(captureElementLayoutStyleSnapshot(node)).toEqual({
      position: "absolute",
      left: "12px",
      top: "24px",
      width: "300px",
      height: "160px",
      transform: "rotate(12deg)",
      transformOrigin: "center center",
      margin: "0px",
      zIndex: "4",
    });
  });

  test("stage geometry converts rects and pointer deltas", () => {
    expect(
      elementRectToStageRect(
        { left: 25, top: 40, width: 100, height: 50 },
        { left: 5, top: 10, width: 200, height: 100 },
        { scale: 2, offsetX: 10, offsetY: 20, slideWidth: 1920, slideHeight: 1080 }
      )
    ).toEqual({ x: 50, y: 80, width: 200, height: 100 });

    expect(
      stageDeltaToSlideDelta(30, -15, {
        scale: 1.5,
        offsetX: 0,
        offsetY: 0,
        slideWidth: 1920,
        slideHeight: 1080,
      })
    ).toEqual({ x: 20, y: -10 });
  });

  test("parseTransformParts and composeTransform preserve translate and rotate semantics", () => {
    expect(parseTransformParts("translate(12.345px, -6.789px) rotate(45deg)")).toEqual({
      translateX: 12.345,
      translateY: -6.789,
      rotate: 45,
    });
    expect(composeTransform(12.345, -6.789, 45.555)).toBe(
      "translate(12.35px, -6.79px) rotate(45.56deg)"
    );
    expect(composeTransform(0, 0, 0)).toBeNull();
  });
});
