import { describe, expect, test } from "vitest";
import { planPdfExportSlides } from "./index.js";

const manifestSlides = [
  { file: "slides/01.html", title: "One" },
  { file: "slides/02.html", title: "Two" },
  { file: "slides/03.html", title: "Three" },
];

describe("PDF export planning", () => {
  test("defaults to every manifest slide in order", () => {
    expect(planPdfExportSlides(manifestSlides)).toEqual(manifestSlides);
    expect(planPdfExportSlides(manifestSlides, { mode: "all" })).toEqual(manifestSlides);
  });

  test("resolves a single manifest slide file exactly", () => {
    expect(
      planPdfExportSlides(manifestSlides, { mode: "slide", slideFile: "slides/02.html" })
    ).toEqual([manifestSlides[1]]);
  });

  test("resolves selected manifest slide files in requested order", () => {
    expect(
      planPdfExportSlides(manifestSlides, {
        mode: "slides",
        slideFiles: ["slides/03.html", "slides/01.html"],
      })
    ).toEqual([manifestSlides[2], manifestSlides[0]]);
  });

  test("rejects missing or non-exact slide selections", () => {
    expect(() => planPdfExportSlides(manifestSlides, { mode: "slide" })).toThrow(
      "--slide requires a manifest slide file value"
    );
    expect(() => planPdfExportSlides(manifestSlides, { mode: "slide", slideFile: "2" })).toThrow(
      "--slide must match a manifest slide file exactly: 2"
    );
    expect(() =>
      planPdfExportSlides(manifestSlides, {
        mode: "slides",
        slideFiles: ["slides/01.html", "missing.html"],
      })
    ).toThrow("--slides must match manifest slide files exactly: missing.html");
  });
});
