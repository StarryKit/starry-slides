import { type FrameLocator, type Page, expect, test } from "@playwright/test";

const EDITING_HINT = "Editing text. Press Enter to save or Escape to cancel.";
const MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

async function gotoEditor(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Generated deck: E2E Regression Deck")).toBeVisible();
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

test("pressing Enter without content changes exits editing without creating undo history", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint, undoButton, redoButton } = getHistoryControls(page);
  const originalText = "Generated Slide Deck";

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

  await expect(page.getByText("Generated deck: HTML Slides Editor Project Overview")).toBeVisible();
  await expect(iframe).toBeVisible();
  await expect(editableHeading).toHaveText("HTML Slides Editor");

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(nextText);
  await expect(undoButton).toBeEnabled();
  await expect(redoButton).toBeDisabled();

  await undoButton.click();
  await expect(editableHeading).toHaveText("HTML Slides Editor");
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
  await expect(editableHeading).toHaveText("Generated Slide Deck");
  await expect(redoButton).toBeEnabled();

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(editableHeading).toHaveText(nextText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText("Generated Slide Deck");
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
  const originalSummary =
    "A generated deck used to verify the full editor pipeline from skill output through in-app editing.";

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
  await expect(heading).toHaveText("E2E Regression Deck");
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

  await expect(heading).toHaveText("E2E Regression Deck");
  await expect(summary).toHaveText(
    "A generated deck used to verify the full editor pipeline from skill output through in-app editing."
  );

  await heading.dblclick();
  await selectAllAndFill(heading, headingText);
  await heading.press("Enter");

  await summary.dblclick();
  await selectAllAndFill(summary, summaryText);
  await summary.press("Enter");

  await expect(undoButton).toBeEnabled();
  await expect(summary).toHaveText(summaryText);

  await undoButton.click();
  await expect(summary).toHaveText(
    "A generated deck used to verify the full editor pipeline from skill output through in-app editing."
  );
  await expect(heading).toHaveText(headingText);

  await undoButton.click();
  await expect(heading).toHaveText("E2E Regression Deck");
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
  const card = frame.locator('[data-editor-id="block-2"]');
  const title = frame.locator('[data-editor-id="text-4"]');
  const paragraph = frame.locator('[data-editor-id="text-5"]');
  const { editingHint } = getHistoryControls(page);

  await expect(card).toBeVisible();
  await expect(paragraph).toHaveText(
    "A concrete point about e2e regression deck that can be refined later."
  );

  await paragraph.dblclick();

  await expect(editingHint).toBeVisible();
  await expect(paragraph).toHaveAttribute("contenteditable", "plaintext-only");
  await expect(card).not.toHaveAttribute("contenteditable", /.+/);
  await expect(title).not.toHaveAttribute("contenteditable", /.+/);
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
  const originalText = "HTML Slides Editor";
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
