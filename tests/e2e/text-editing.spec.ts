import { expect, test } from "@playwright/test";

test("text editing commits and supports undo/redo", async ({ page }) => {
  await page.goto("/?deck=sample");

  const iframe = page.getByTestId("slide-iframe");
  const frame = page.frameLocator('[data-testid="slide-iframe"]');
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const undoButton = page.getByTestId("undo-button");
  const redoButton = page.getByTestId("redo-button");
  const nextText = "Edited by Playwright";

  await expect(iframe).toBeVisible();
  await expect(editableHeading).toHaveText("HTML Slides Editor");

  await editableHeading.dblclick();
  await expect(
    page.getByText("Editing text. Press Enter to save or Escape to cancel.")
  ).toBeVisible();

  await editableHeading.press(`${process.platform === "darwin" ? "Meta" : "Control"}+A`);
  await editableHeading.fill(nextText);
  await editableHeading.press("Enter");

  await expect(
    page.getByText("Editing text. Press Enter to save or Escape to cancel.")
  ).toBeHidden();
  await expect(editableHeading).toHaveText(nextText);
  await expect(undoButton).toBeEnabled();
  await expect(redoButton).toBeDisabled();

  await undoButton.click();
  await expect(editableHeading).toHaveText("HTML Slides Editor");
  await expect(redoButton).toBeEnabled();

  await redoButton.click();
  await expect(editableHeading).toHaveText(nextText);
});

test("double clicking a non-text element does not enter text editing", async ({ page }) => {
  await page.goto("/?deck=sample");

  const frame = page.frameLocator('[data-testid="slide-iframe"]');
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const undoButton = page.getByTestId("undo-button");
  const redoButton = page.getByTestId("redo-button");
  const editingHint = page.getByText("Editing text. Press Enter to save or Escape to cancel.");

  await expect(blockCard).toBeVisible();

  await blockCard.evaluate((node) => {
    node.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
  });

  await expect(editingHint).toBeHidden();
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();
});

test("escape cancels text editing without creating undo history", async ({ page }) => {
  await page.goto("/?deck=sample");

  const frame = page.frameLocator('[data-testid="slide-iframe"]');
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const undoButton = page.getByTestId("undo-button");
  const redoButton = page.getByTestId("redo-button");
  const editingHint = page.getByText("Editing text. Press Enter to save or Escape to cancel.");
  const originalText = "HTML Slides Editor";
  const draftText = "Draft text that should be discarded";

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await editableHeading.press(`${process.platform === "darwin" ? "Meta" : "Control"}+A`);
  await editableHeading.fill(draftText);
  await editableHeading.press("Escape");

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(originalText);
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();
});
