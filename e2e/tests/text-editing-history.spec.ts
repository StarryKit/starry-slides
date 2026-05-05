import { expect, test } from "@playwright/test";
import {
  HERO_KICKER,
  HERO_SUMMARY,
  HERO_TITLE,
  MODIFIER,
  SOURCE_LABEL,
  coverFrame,
  getHistoryControls,
  gotoEditor,
  selectAllAndFill,
} from "./helpers";

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
});

test("pressing Enter without content changes exits editing without creating undo history", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint } = getHistoryControls(page);
  const originalText = HERO_KICKER;

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await editableHeading.press("Enter");

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(originalText);
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(originalText);
});

test("text editing supports keyboard undo/redo after commit", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint } = getHistoryControls(page);
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

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(editableHeading).toHaveText(nextText);
});

test("keyboard shortcuts trigger undo and redo", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const nextText = "Keyboard history";

  await editableHeading.dblclick();
  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);

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

  await expect(summary).toHaveText(summaryText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(summary).toHaveText(HERO_SUMMARY);
  await expect(heading).toHaveText(headingText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(heading).toHaveText(HERO_TITLE);

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(heading).toHaveText(headingText);
  await expect(summary).not.toHaveText(summaryText);

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
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
