import { type FrameLocator, type Page, expect, test } from "@playwright/test";

const EDITING_HINT = "Editing text. Press Enter to save or Escape to cancel.";
const MODIFIER = process.platform === "darwin" ? "Meta" : "Control";
const SOURCE_LABEL = "Generated deck: HTML Slides Editor Project Overview";
const HERO_KICKER = "HTML Slides Editor";
const HERO_TITLE = "HTML Slides Editor Project Overview";
const HERO_SUMMARY =
  "A generated project deck that doubles as a broad regression fixture for the HTML Slides Editor.";
const AGENDA_PARAGRAPH =
  "How html slides editor project overview handles problem framing in a browser-native workflow.";

async function gotoEditor(page: Page) {
  await page.goto("/");
  await expect(page.getByText(SOURCE_LABEL)).toBeVisible();
  await expect(page.getByTestId("slide-iframe")).toBeVisible();
}

function getHistoryControls(page: Page) {
  return {
    undoButton: page.getByTestId("undo-button"),
    redoButton: page.getByTestId("redo-button"),
    editingHint: page.getByText(EDITING_HINT),
    selectionOverlay: page.getByTestId("selection-overlay"),
  };
}

function coverFrame(page: Page): FrameLocator {
  return page.frameLocator('[data-testid="slide-iframe"]');
}

async function selectAllAndFill(locator: ReturnType<FrameLocator["locator"]>, value: string) {
  await locator.press(`${MODIFIER}+A`);
  await locator.fill(value);
}

test("plain click selects text only, and double click enters editing", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint, selectionOverlay, undoButton, redoButton } = getHistoryControls(page);

  await editableHeading.click();

  await expect(selectionOverlay).toBeVisible();
  await expect(editingHint).toBeHidden();
  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();

  await editableHeading.dblclick();

  await expect(editingHint).toBeVisible();
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");
});

test("selection overlay adds visible padding around the selected element", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.click();

  const [elementBox, overlayBox] = await Promise.all([
    editableHeading.boundingBox(),
    selectionOverlay.boundingBox(),
  ]);

  expect(elementBox).not.toBeNull();
  expect(overlayBox).not.toBeNull();

  if (!elementBox || !overlayBox) {
    throw new Error("Expected both the selected element and the selection overlay to have bounds.");
  }

  expect(overlayBox.x).toBeLessThan(elementBox.x);
  expect(overlayBox.y).toBeLessThan(elementBox.y);
  expect(overlayBox.width).toBeGreaterThan(elementBox.width);
  expect(overlayBox.height).toBeGreaterThan(elementBox.height);
  expect(overlayBox.height - elementBox.height).toBeGreaterThan(
    overlayBox.width - elementBox.width
  );
});

test("text editing commits on blur and keeps undo/redo disabled while editing", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { editingHint, undoButton, redoButton } = getHistoryControls(page);
  const nextText = "Blur committed heading";

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();

  await selectAllAndFill(editableHeading, nextText);
  await blockCard.click();

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(nextText);
  await expect(undoButton).toBeEnabled();
  await expect(redoButton).toBeDisabled();
});

test("single clicking outside the active text element exits editing mode", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { editingHint } = getHistoryControls(page);

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await blockCard.click();

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);
});

test("text editing preserves leading and trailing whitespace and keeps exact undo redo values", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { undoButton, redoButton } = getHistoryControls(page);
  const nextText = "  HTML Slides Editor  ";

  await editableHeading.dblclick();
  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");

  await expect(editableHeading).toHaveText(nextText);
  await expect(undoButton).toBeEnabled();
  await expect(redoButton).toBeDisabled();

  await undoButton.click();
  await expect(editableHeading).toHaveText(HERO_KICKER);

  await redoButton.click();
  await expect(editableHeading).toHaveText(nextText);
});

test("whitespace-only surrounding changes still create a committed edit", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { undoButton, redoButton } = getHistoryControls(page);
  const nextText = ` ${HERO_KICKER} `;

  await editableHeading.dblclick();
  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");

  await expect(editableHeading).toHaveText(nextText);
  await expect(undoButton).toBeEnabled();
  await expect(redoButton).toBeDisabled();
});

test("text editing allows deleting a partial keyboard selection before commit", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.dblclick();
  await editableHeading.press("End");

  for (let index = 0; index < "Editor".length; index += 1) {
    await editableHeading.press("Shift+ArrowLeft");
  }

  await editableHeading.press("Backspace");
  await editableHeading.press("Enter");

  await expect(editableHeading).toHaveText("HTML Slides ");
});

test("text editing preserves a real dragged partial selection inside the active element", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.dblclick();

  const box = await editableHeading.boundingBox();
  if (!box) {
    throw new Error("Expected editable heading to have a bounding box.");
  }

  const dragStart = {
    x: box.x + box.width * 0.26,
    y: box.y + box.height * 0.55,
  };
  const dragEnd = {
    x: box.x + box.width * 0.61,
    y: box.y + box.height * 0.55,
  };

  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 8 });
  await page.mouse.up();

  const selectedText = await editableHeading.evaluate((node) => {
    const selection = node.ownerDocument.getSelection();
    return selection?.toString() ?? null;
  });

  expect(selectedText).toMatch(/slides/i);
});

test("text editing deletes a real dragged partial selection with backspace", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const originalText = await editableHeading.textContent();

  await editableHeading.dblclick();

  const box = await editableHeading.boundingBox();
  if (!box) {
    throw new Error("Expected editable heading to have a bounding box.");
  }

  const dragStart = {
    x: box.x + box.width * 0.26,
    y: box.y + box.height * 0.55,
  };
  const dragEnd = {
    x: box.x + box.width * 0.61,
    y: box.y + box.height * 0.55,
  };

  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 8 });
  await page.mouse.up();
  const selectedText = await editableHeading.evaluate((node) => {
    return node.ownerDocument.getSelection()?.toString() ?? "";
  });

  await editableHeading.press("Backspace");
  await editableHeading.press("Enter");

  if (!originalText || !selectedText) {
    throw new Error("Expected original text and dragged selection to both be present.");
  }

  await expect(editableHeading).toHaveText("HTM Editor");
});

test("double clicking a word during text editing keeps editing active and allows deleting that word", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint } = getHistoryControls(page);
  const originalText = await editableHeading.textContent();

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  const box = await editableHeading.boundingBox();
  if (!box || !originalText) {
    throw new Error("Expected editable heading bounds and original text.");
  }

  const wordProbe = {
    x: box.x + box.width * 0.48,
    y: box.y + box.height * 0.55,
  };

  await page.mouse.dblclick(wordProbe.x, wordProbe.y);

  const selectedText = await editableHeading.evaluate((node) => {
    return node.ownerDocument.getSelection()?.toString() ?? "";
  });

  await expect(editingHint).toBeVisible();
  await editableHeading.press("Backspace");
  await expect(editingHint).toBeVisible();
  await editableHeading.press("Enter");

  if (!selectedText) {
    throw new Error("Expected double click to create a word selection.");
  }

  const nextText = await editableHeading.textContent();
  if (!nextText || !originalText) {
    throw new Error("Expected edited text and original text.");
  }

  expect(nextText).not.toBe(originalText);
  expect(nextText.length).toBeLessThan(originalText.length);
  expect(nextText).toContain("HTML");
  expect(nextText).toContain("Editor");
});

test("cursor returns to pointer after leaving text editing mode", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstText = frame.locator('[data-editor-id="text-1"]');
  const secondText = frame.locator('[data-editor-id="text-2"]');

  await expect(firstText).toHaveCSS("cursor", "pointer");

  await firstText.dblclick();
  await expect(firstText).toHaveCSS("cursor", "text");

  await secondText.click();

  await expect(firstText).toHaveCSS("cursor", "pointer");
  await expect(secondText).toHaveCSS("cursor", "pointer");

  await firstText.dblclick();
  await expect(firstText).toHaveCSS("cursor", "text");
});

test("pressing Enter without content changes exits editing without creating undo history", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint, undoButton, redoButton } = getHistoryControls(page);
  const originalText = HERO_KICKER;

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await editableHeading.press("Enter");

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(originalText);
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();
});

test("text editing supports toolbar undo/redo after commit", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint, undoButton, redoButton } = getHistoryControls(page);
  const nextText = "Edited by Playwright";

  await expect(page.getByText(SOURCE_LABEL)).toBeVisible();
  await expect(page.getByTestId("slide-iframe")).toBeVisible();
  await expect(editableHeading).toHaveText(HERO_KICKER);

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(nextText);
  await expect(undoButton).toBeEnabled();
  await expect(redoButton).toBeDisabled();

  await undoButton.click();
  await expect(editableHeading).toHaveText(HERO_KICKER);
  await expect(redoButton).toBeEnabled();

  await redoButton.click();
  await expect(editableHeading).toHaveText(nextText);
});

test("keyboard shortcuts trigger undo and redo", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { undoButton, redoButton } = getHistoryControls(page);
  const nextText = "Keyboard history";

  await editableHeading.dblclick();
  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");

  await expect(undoButton).toBeEnabled();
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
  await expect(redoButton).toBeEnabled();

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(editableHeading).toHaveText(nextText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
  await page.keyboard.press(`${MODIFIER}+Y`);
  await expect(editableHeading).toHaveText(nextText);
});

test("keyboard undo and redo do not record themselves as new history entries", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const heading = frame.locator('[data-editor-id="text-2"]');
  const summary = frame.locator('[data-editor-id="text-3"]');
  const headingText = "Deck topic updated";
  const summaryText = "Summary updated after heading";
  const originalSummary = HERO_SUMMARY;

  await heading.dblclick();
  await selectAllAndFill(heading, headingText);
  await heading.press("Enter");

  await summary.dblclick();
  await selectAllAndFill(summary, summaryText);
  await summary.press("Enter");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(summary).toHaveText(originalSummary);
  await expect(heading).toHaveText(headingText);

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(summary).toHaveText(summaryText);
  await expect(heading).toHaveText(headingText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(summary).toHaveText(originalSummary);
  await expect(heading).toHaveText(headingText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(heading).toHaveText(HERO_TITLE);
  await expect(summary).toHaveText(originalSummary);
});

test("multiple edits maintain correct undo and redo stack order", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const heading = frame.locator('[data-editor-id="text-2"]');
  const summary = frame.locator('[data-editor-id="text-3"]');
  const { undoButton, redoButton } = getHistoryControls(page);
  const headingText = "Deck topic updated";
  const summaryText = "Summary updated after heading";

  await expect(heading).toHaveText(HERO_TITLE);
  await expect(summary).toHaveText(HERO_SUMMARY);

  await heading.dblclick();
  await selectAllAndFill(heading, headingText);
  await heading.press("Enter");

  await summary.dblclick();
  await selectAllAndFill(summary, summaryText);
  await summary.press("Enter");

  await expect(undoButton).toBeEnabled();
  await expect(summary).toHaveText(summaryText);

  await undoButton.click();
  await expect(summary).toHaveText(HERO_SUMMARY);
  await expect(heading).toHaveText(headingText);

  await undoButton.click();
  await expect(heading).toHaveText(HERO_TITLE);
  await expect(redoButton).toBeEnabled();

  await redoButton.click();
  await expect(heading).toHaveText(headingText);
  await expect(summary).not.toHaveText(summaryText);

  await redoButton.click();
  await expect(summary).toHaveText(summaryText);
});

test("clicking blank space clears the current selection", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const stagePanel = page.getByTestId("stage-panel");
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.click();
  await expect(selectionOverlay).toBeVisible();

  await stagePanel.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeHidden();
});

test("double clicking a text child enters editing on the correct element", async ({ page }) => {
  await gotoEditor(page);

  await page.getByLabel("Slide 2").click();

  const frame = coverFrame(page);
  const card = frame.locator('[data-editor-id="block-4"]');
  const title = frame.locator('[data-editor-id="text-6"]');
  const paragraph = frame.locator('[data-editor-id="text-7"]');
  const { editingHint } = getHistoryControls(page);

  await expect(card).toBeVisible();
  await expect(paragraph).toHaveText(AGENDA_PARAGRAPH);

  await paragraph.dblclick();

  await expect(editingHint).toBeVisible();
  await expect(paragraph).toHaveAttribute("contenteditable", "plaintext-only");
  await expect(card).not.toHaveAttribute("contenteditable", /.+/);
  await expect(title).not.toHaveAttribute("contenteditable", /.+/);
});

test("text editing reuses a single visible selection border and suppresses inline editing outline", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.dblclick();

  await expect(selectionOverlay).toBeVisible();
  await expect(editableHeading).toHaveAttribute("data-hse-editing", "true");
  await expect(editableHeading).toHaveJSProperty("contentEditable", "plaintext-only");
  await expect(editableHeading).toHaveCSS("outline-style", "none");
  await expect(editableHeading).toHaveCSS("box-shadow", "none");
  await expect(editableHeading).toHaveCSS("overflow", "visible");
});

test("double clicking a non-text element does not enter text editing", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { editingHint, undoButton, redoButton } = getHistoryControls(page);

  await expect(blockCard).toBeVisible();

  await blockCard.evaluate((node) => {
    node.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
  });

  await expect(editingHint).toBeHidden();
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();
});

test("clicking a block element outside editing only selects and does not create history", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { selectionOverlay, undoButton, redoButton, editingHint } = getHistoryControls(page);

  await blockCard.click();

  await expect(selectionOverlay).toBeVisible();
  await expect(editingHint).toBeHidden();
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();
});

test("escape cancels text editing without creating undo history", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const undoButton = page.getByTestId("undo-button");
  const redoButton = page.getByTestId("redo-button");
  const editingHint = page.getByText("Editing text. Press Enter to save or Escape to cancel.");
  const originalText = HERO_KICKER;
  const draftText = "Draft text that should be discarded";

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await selectAllAndFill(editableHeading, draftText);
  await editableHeading.press("Escape");

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(originalText);
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();
});
