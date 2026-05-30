import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createTempDeck, writeDeck } from "../../tests/helpers/deck-fixtures";
import { exportHtml } from "./html-export";

const decks: Array<{ cleanup: () => void }> = [];

function createDeck() {
  const deck = createTempDeck("starry-slides-html-export-");
  decks.push(deck);
  return deck.root;
}

afterEach(() => {
  for (const deck of decks.splice(0)) {
    deck.cleanup();
  }
});

describe("HTML export runtime", () => {
  test("inlines deck-local CSS, images, and media resources into the single HTML file", async () => {
    const deck = createDeck();
    fs.mkdirSync(path.join(deck, "assets"), { recursive: true });
    fs.writeFileSync(path.join(deck, "assets", "shared.css"), ".hero{background:url('./bg.svg')}");
    fs.writeFileSync(path.join(deck, "assets", "bg.svg"), "<svg></svg>");
    fs.writeFileSync(path.join(deck, "assets", "photo.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    fs.writeFileSync(path.join(deck, "assets", "poster.jpg"), Buffer.from([0xff, 0xd8, 0xff]));
    fs.writeFileSync(path.join(deck, "assets", "demo.mp4"), Buffer.from("video"));
    writeDeck(deck, [
      {
        file: "slides/01.html",
        title: "One",
        html: `<!DOCTYPE html><html><head>
          <link rel="stylesheet" href="../assets/shared.css">
        </head><body style="margin:0;position:relative;width:800px;height:600px;overflow:hidden">
          <main class="hero">
            <img src="../assets/photo.png" alt="Photo">
            <video src="../assets/demo.mp4" poster="../assets/poster.jpg"></video>
            <img src="https://example.com/remote.png" alt="Remote">
          </main>
        </body></html>`,
      },
    ]);
    const outFile = path.join(deck, "single.html");

    const result = await exportHtml({ deckPath: deck, outFile });
    const html = fs.readFileSync(result.path, "utf8");

    expect(html).toContain("data:image/png;base64");
    expect(html).toContain("data:image/svg+xml;base64");
    expect(html).toContain("data:image/jpeg;base64");
    expect(html).toContain("data:video/mp4;base64");
    expect(html).toContain(".hero");
    expect(html).not.toContain("../assets/photo.png");
    expect(html).not.toContain("../assets/shared.css");
    expect(html).not.toContain("../assets/demo.mp4");
    expect(html).not.toContain("/deck/");
    expect(html).toContain("https://example.com/remote.png");
  });
});
