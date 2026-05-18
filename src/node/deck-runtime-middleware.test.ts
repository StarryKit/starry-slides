import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createTempDeck, writeDeck } from "../../tests/helpers/deck-fixtures";
import { createDeckRuntimeMiddleware, discoverLocalDecks } from "./deck-runtime-middleware";

const decks: Array<{ cleanup: () => void }> = [];

function createDeckRoot(prefix = "starry-slides-deck-library-") {
  const deck = createTempDeck(prefix);
  decks.push(deck);
  return deck.root;
}

function writeNamedDeck(deck: string, title: string, description = `${title} description`) {
  writeDeck(deck, [{ file: "slides/01.html", title: "One" }]);
  const manifestPath = path.join(deck, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        ...manifest,
        deckTitle: title,
        description,
      },
      null,
      2
    )
  );
}

function createRequest(method: string, url: string, body = "") {
  const chunks = body ? [Buffer.from(body)] : [];
  return {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      yield* chunks;
    },
  } as IncomingMessage;
}

function createResponse() {
  const headers = new Map<string, number | string | string[]>();
  let body = Buffer.alloc(0);
  let ended = false;

  return {
    response: {
      statusCode: 200,
      setHeader(name: string, value: number | string | string[]) {
        headers.set(name.toLowerCase(), value);
        return this;
      },
      end(chunk?: string | Uint8Array) {
        if (chunk) {
          body = Buffer.concat([body, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
        }
        ended = true;
        return this;
      },
    } as ServerResponse,
    get statusCode() {
      return (this.response as ServerResponse).statusCode;
    },
    get body() {
      return body.toString("utf8");
    },
    get headers() {
      return headers;
    },
    get ended() {
      return ended;
    },
  };
}

async function handleRuntimeRequest(
  runtime: ReturnType<typeof createDeckRuntimeMiddleware>,
  method: string,
  url: string,
  body = ""
) {
  const request = createRequest(method, url, body);
  const response = createResponse();
  let passedToNext = false;

  runtime.handleDevRequest(request, response.response, () => {
    passedToNext = true;
  });

  await expect.poll(() => response.ended || passedToNext).toBe(true);
  return { response, passedToNext };
}

afterEach(() => {
  for (const deck of decks.splice(0)) {
    deck.cleanup();
  }
});

describe("deck runtime middleware deck discovery", () => {
  test("discovers manifest-backed decks in the configured library and marks the current deck", async () => {
    const library = createDeckRoot();
    const currentDeck = path.join(library, "quarterly-plan");
    const secondDeck = path.join(library, "launch-review");
    const invalidDeck = path.join(library, "notes-only");

    writeNamedDeck(currentDeck, "Quarterly Plan", "Current local deck");
    writeNamedDeck(secondDeck, "Launch Review", "Another local deck");
    fs.mkdirSync(invalidDeck, { recursive: true });
    fs.writeFileSync(path.join(invalidDeck, "README.md"), "Not a deck");

    const decks = await discoverLocalDecks({
      libraryDir: library,
      currentDeckDir: currentDeck,
    });

    expect(decks.map((deck) => deck.id)).toEqual(["launch-review", "quarterly-plan"]);
    expect(decks.map((deck) => deck.title)).toEqual(["Launch Review", "Quarterly Plan"]);
    expect(decks.find((deck) => deck.id === "quarterly-plan")).toMatchObject({
      description: "Current local deck",
      directoryName: "quarterly-plan",
      relativePath: "quarterly-plan",
      isCurrent: true,
      deckDir: currentDeck,
    });
    expect(decks.find((deck) => deck.id === "launch-review")?.isCurrent).toBe(false);
  });

  test("includes the current deck even when it is outside the configured library", async () => {
    const library = createDeckRoot();
    const currentDeck = createDeckRoot("starry-slides-current-deck-");

    writeNamedDeck(path.join(library, "library-deck"), "Library Deck");
    writeNamedDeck(currentDeck, "Opened Directly");

    const decks = await discoverLocalDecks({
      libraryDir: library,
      currentDeckDir: currentDeck,
    });

    expect(decks.map((deck) => deck.id)).toEqual(["library-deck", "__current__"]);
    expect(decks.find((deck) => deck.id === "__current__")).toMatchObject({
      title: "Opened Directly",
      directoryName: path.basename(currentDeck),
      relativePath: path.basename(currentDeck),
      isCurrent: true,
      deckDir: currentDeck,
    });
  });

  test("selecting a discovered deck reroutes manifest assets and saves to that deck", async () => {
    const library = createDeckRoot();
    const initialDeck = path.join(library, "initial");
    const selectedDeck = path.join(library, "selected");
    writeNamedDeck(initialDeck, "Initial Deck");
    writeNamedDeck(selectedDeck, "Selected Deck");

    const runtime = createDeckRuntimeMiddleware({
      runtimeDeckDir: initialDeck,
      previewDeckDir: initialDeck,
      saveTargetDirs: [initialDeck],
      deckLibraryDir: library,
    });

    const selectResult = await handleRuntimeRequest(
      runtime,
      "POST",
      "/__editor/select-deck",
      JSON.stringify({ deckId: "selected" })
    );

    expect(selectResult.response.statusCode).toBe(200);
    expect(JSON.parse(selectResult.response.body)).toMatchObject({
      currentDeckId: "selected",
    });

    const manifestResult = await handleRuntimeRequest(runtime, "GET", "/deck/manifest.json");
    expect(manifestResult.response.statusCode).toBe(200);
    expect(JSON.parse(manifestResult.response.body)).toMatchObject({
      deckTitle: "Selected Deck",
    });

    const nextSlideHtml = "<!DOCTYPE html><html><body>Updated selected deck</body></html>";
    const saveResult = await handleRuntimeRequest(
      runtime,
      "POST",
      "/__editor/save-generated-deck",
      JSON.stringify({
        manifest: {
          deckTitle: "Selected Deck Updated",
          description: "Saved into selected deck",
          slides: [{ file: "slides/01.html", title: "One" }],
        },
        slides: [{ file: "slides/01.html", htmlSource: nextSlideHtml, title: "One" }],
      })
    );

    expect(saveResult.response.statusCode).toBe(200);
    expect(fs.readFileSync(path.join(selectedDeck, "slides/01.html"), "utf8")).toBe(nextSlideHtml);
    expect(
      JSON.parse(fs.readFileSync(path.join(selectedDeck, "manifest.json"), "utf8"))
    ).toMatchObject({
      deckTitle: "Selected Deck Updated",
    });
    expect(
      JSON.parse(fs.readFileSync(path.join(initialDeck, "manifest.json"), "utf8"))
    ).toMatchObject({
      deckTitle: "Initial Deck",
    });
  });

  test("imports a manifest-backed deck into the local library and selects it", async () => {
    const library = createDeckRoot();
    const initialDeck = path.join(library, "initial");
    writeNamedDeck(initialDeck, "Initial Deck");

    const runtime = createDeckRuntimeMiddleware({
      runtimeDeckDir: initialDeck,
      previewDeckDir: initialDeck,
      saveTargetDirs: [initialDeck],
      deckLibraryDir: library,
    });

    const importedManifest = {
      deckTitle: "Imported Deck",
      description: "Imported deck description",
      slides: [{ file: "slides/01.html", title: "Imported One" }],
    };
    const importedSlide = "<!DOCTYPE html><html><body>Imported selected deck</body></html>";
    const importResult = await handleRuntimeRequest(
      runtime,
      "POST",
      "/__editor/import-deck",
      JSON.stringify({
        files: [
          {
            path: "picked-folder/manifest.json",
            contentsBase64: Buffer.from(JSON.stringify(importedManifest), "utf8").toString(
              "base64"
            ),
          },
          {
            path: "picked-folder/slides/01.html",
            contentsBase64: Buffer.from(importedSlide, "utf8").toString("base64"),
          },
        ],
      })
    );

    expect(importResult.response.statusCode).toBe(200);
    expect(JSON.parse(importResult.response.body)).toMatchObject({
      currentDeckId: "imported-deck",
      decks: expect.arrayContaining([
        expect.objectContaining({
          id: "imported-deck",
          title: "Imported Deck",
          isCurrent: true,
        }),
      ]),
    });
    expect(fs.readFileSync(path.join(library, "imported-deck/slides/01.html"), "utf8")).toBe(
      importedSlide
    );

    const manifestResult = await handleRuntimeRequest(runtime, "GET", "/deck/manifest.json");
    expect(manifestResult.response.statusCode).toBe(200);
    expect(JSON.parse(manifestResult.response.body)).toMatchObject({
      deckTitle: "Imported Deck",
    });
  });
});
