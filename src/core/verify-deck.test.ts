import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  blockElement,
  createTempDeck,
  slideHtml,
  slideHtmlWithCss,
  slideHtmlWithoutCss,
  textElement,
  writeDeck,
} from "../../tests/helpers/deck-fixtures";
import { type VerifyIssue, createVerifyIssue, verifyDeck } from "./verify-deck";

const decks: Array<{ cleanup: () => void }> = [];

function createDeck() {
  const deck = createTempDeck();
  decks.push(deck);
  return deck.root;
}

function issueCodes(issues: VerifyIssue[]) {
  return issues.map((issue) => issue.code);
}

afterEach(() => {
  for (const deck of decks.splice(0)) {
    deck.cleanup();
  }
});

describe("verifyDeck core verifier", () => {
  test("missing deck path returns structure.missing-deck", () => {
    const deck = path.join(createDeck(), "missing");
    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("structure.missing-deck");
  });

  test("missing deck.html returns structure.missing-deck", () => {
    const deck = createDeck();
    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("structure.missing-deck");
  });

  test("invalid deck html returns structure.invalid-deck", () => {
    const deck = createDeck();
    fs.writeFileSync(path.join(deck, "deck.html"), "<html><body>bad</body></html>");

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("structure.invalid-deck");
  });

  test("empty deck returns structure.empty-deck", () => {
    const deck = createDeck();
    fs.writeFileSync(
      path.join(deck, "deck.html"),
      '<!DOCTYPE html><html><body><slides title="Deck"></slides></body></html>'
    );

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("structure.empty-deck");
  });

  test("legacy data-editable attributes return structure.legacy-editable-attr", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        id: "slide-1",
        html: slideHtml('<div data-editable="block" data-editor-id="shape-1">Bad</div>'),
      },
    ]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("structure.legacy-editable-attr");
  });

  test("unsupported tags remain non-editable authored content", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        id: "slide-1",
        html:
          '<!DOCTYPE html><html><head><style>*{box-sizing:border-box}body{margin:0}slides{display:block}slide{display:block;width:800px;height:600px;overflow:hidden;position:relative}</style></head><body><slides title="Deck"><slide id="slide-1" title="One"><main data-slide-root="true" data-editor-id="slide-root"><address data-editor-id="address-1">Bad</address></main></slide></slides></body></html>',
      },
    ]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(true);
    expect(issueCodes(result.issues)).not.toContain("structure.unsupported-tag");
  });

  test('invalid data-group="true" usage returns structure.invalid-group', () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        id: "slide-1",
        html: slideHtml('<h1 data-group="true" data-editor-id="text-1">Bad</h1>'),
      },
    ]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("structure.invalid-group");
  });

  test("empty slide returns structure.empty-slide warning", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        id: "slide-1",
        html: slideHtml(""),
      },
    ]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(true);
    expect(issueCodes(result.issues)).toContain("structure.empty-slide");
  });
});

describe("verifyDeck CSS validation", () => {
  test("missing style block returns css.missing-style-block", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        id: "slide-1",
        html: slideHtmlWithoutCss(),
      },
    ]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("css.missing-style-block");
  });

  test("missing slides display returns css.slides-missing-display", () => {
    const deck = createDeck();
    const css = `body{margin:0}
slide{display:block;width:800px;height:600px;overflow:hidden;position:relative}`;
    writeDeck(deck, [{ id: "slide-1", html: slideHtmlWithCss(css) }]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("css.slides-missing-display");
  });

  test("missing slide display returns css.slide-missing-display", () => {
    const deck = createDeck();
    const css = `body{margin:0}
slides{display:block}
slide{width:800px;height:600px;overflow:hidden;position:relative}`;
    writeDeck(deck, [{ id: "slide-1", html: slideHtmlWithCss(css) }]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("css.slide-missing-display");
  });

  test("missing slide width returns css.slide-missing-width", () => {
    const deck = createDeck();
    const css = `body{margin:0}
slides{display:block}
slide{display:block;height:600px;overflow:hidden;position:relative}`;
    writeDeck(deck, [{ id: "slide-1", html: slideHtmlWithCss(css) }]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("css.slide-missing-width");
  });

  test("missing slide height returns css.slide-missing-height", () => {
    const deck = createDeck();
    const css = `body{margin:0}
slides{display:block}
slide{display:block;width:800px;overflow:hidden;position:relative}`;
    writeDeck(deck, [{ id: "slide-1", html: slideHtmlWithCss(css) }]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("css.slide-missing-height");
  });

  test("missing slide overflow returns css.slide-missing-overflow", () => {
    const deck = createDeck();
    const css = `body{margin:0}
slides{display:block}
slide{display:block;width:800px;height:600px;position:relative}`;
    writeDeck(deck, [{ id: "slide-1", html: slideHtmlWithCss(css) }]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("css.slide-missing-overflow");
  });

  test("missing slide position returns css.slide-missing-position", () => {
    const deck = createDeck();
    const css = `body{margin:0}
slides{display:block}
slide{display:block;width:800px;height:600px;overflow:hidden}`;
    writeDeck(deck, [{ id: "slide-1", html: slideHtmlWithCss(css) }]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("css.slide-missing-position");
  });

  test("missing body margin returns css.body-missing-margin", () => {
    const deck = createDeck();
    const css = `slides{display:block}
slide{display:block;width:800px;height:600px;overflow:hidden;position:relative}`;
    writeDeck(deck, [{ id: "slide-1", html: slideHtmlWithCss(css) }]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues)).toContain("css.body-missing-margin");
  });

  test("valid CSS passes all checks", () => {
    const deck = createDeck();
    writeDeck(deck, [{ id: "slide-1" }]);

    const result = verifyDeck(deck);

    const cssIssues = result.issues.filter((i) => i.code.startsWith("css."));
    expect(cssIssues).toHaveLength(0);
  });
});

describe("verifyDeck overflow validation", () => {
  test("static overflow catches explicit auto and scroll values", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        id: "slide-1",
        html: slideHtml(
          `${textElement("text-1", "Auto", "overflow:auto")}${blockElement(
            "block-1",
            "Scroll",
            "left:300px;overflow-y:scroll"
          )}`
        ),
      },
    ]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(false);
    expect(issueCodes(result.issues).filter((code) => code === "overflow.static")).toHaveLength(2);
  });

  test("data-allow-overflow on an element or ancestor exempts static overflow issues", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        id: "slide-1",
        html: slideHtml(
          `<section data-allow-overflow="true">${textElement(
            "text-1",
            "Allowed",
            "overflow:auto"
          )}</section>${blockElement(
            "block-1",
            "Allowed",
            'left:300px;overflow:scroll" data-allow-overflow="true'
          )}`
        ),
      },
    ]);

    const result = verifyDeck(deck);

    expect(result.ok).toBe(true);
    expect(issueCodes(result.issues)).not.toContain("overflow.static");
  });
});

describe("verifyDeck modes", () => {
  test("static mode reports structure, css, and static-overflow checks", () => {
    const deck = createDeck();
    writeDeck(deck, [{ id: "slide-1" }]);

    const result = verifyDeck(deck, { mode: "static" });

    expect(result.mode).toBe("static");
    expect(result.checks).toEqual(["structure", "css", "static-overflow"]);
    expect(result.ok).toBe(true);
  });

  test("complete mode merges structural, css, static, and rendered issues in one array", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        id: "slide-1",
        html: slideHtml(textElement("text-1", "Hello"), "overflow:scroll"),
      },
    ]);
    const renderedIssue = createVerifyIssue(
      "error",
      "overflow.element-bounds",
      "editable element renders outside slide bounds",
      { slideId: "slide-1", selector: '[data-editor-id="text-1"]' }
    );

    const result = verifyDeck(deck, { mode: "complete", renderedIssues: [renderedIssue] });

    expect(result.mode).toBe("complete");
    expect(result.checks).toEqual(["structure", "css", "static-overflow", "rendered-overflow"]);
    expect(issueCodes(result.issues)).toEqual(
      expect.arrayContaining(["overflow.static", "overflow.element-bounds"])
    );
  });

  test("summary counts and ok are derived only from issue severity", () => {
    const deck = createDeck();
    writeDeck(deck, [{ id: "slide-1" }]);
    const resultWithWarning = verifyDeck(deck);

    expect(resultWithWarning.ok).toBe(true);
    expect(resultWithWarning.summary).toEqual({ errorCount: 0, warningCount: 0 });

    fs.writeFileSync(
      path.join(deck, "deck.html"),
      `<!DOCTYPE html><html><head><style>*{box-sizing:border-box}body{margin:0}slides{display:block}slide{display:block;width:800px;height:600px;overflow:hidden;position:relative}</style></head><body><slides title="Deck"><slide id="slide-1" title="One"><main data-slide-root="true" data-editor-id="slide-root"><div data-editable="block" data-editor-id="bad-1">Bad</div></main></slide></slides></body></html>`
    );
    const resultWithError = verifyDeck(deck);

    expect(resultWithError.ok).toBe(false);
    expect(resultWithError.summary.errorCount).toBe(1);
    expect(resultWithError.summary.warningCount).toBe(0);
  });
});
