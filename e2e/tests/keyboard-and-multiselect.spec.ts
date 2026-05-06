import { expect, test } from "@playwright/test";
import {
  HERO_KICKER,
  MODIFIER,
  applyCustomCssProperty,
  coverFrame,
  expectInlineStyle,
  expectInlineStyleContains,
  getHistoryControls,
  getInlineStyle,
  getRequiredBoundingBox,
  getSlideElementRect,
  gotoEditor,
} from "./helpers";

test("keyboard delete removes selected element and undo restores it", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.click();
  await expect(selectionOverlay).toBeVisible();

  await page.keyboard.press("Backspace");
  await expect(editableHeading).toBeHidden();
  await expect(selectionOverlay).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
});

test("keyboard arrows move the selected element and preserve undo redo", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.click();
  await page.keyboard.press("ArrowRight");
  await expectInlineStyleContains(editableHeading, "transform", "translate(5px, 0px)");

  await page.keyboard.press("Shift+ArrowDown");
  await expectInlineStyleContains(editableHeading, "transform", "translate(5px, 10px)");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expectInlineStyleContains(editableHeading, "transform", "translate(5px, 0px)");
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expectInlineStyleContains(editableHeading, "transform", "translate(5px, 10px)");
});

test("keyboard copy paste duplicates the selected element and selects the copy", async ({
  page,
}) => {
  await gotoEditor(page);
  await page.evaluate(() => {
    const clipboard = {
      writeText: () => {
        throw new Error("Object copy should not write to the system clipboard.");
      },
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });
  });

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const copiedHeading = frame.locator('[data-editor-id="text-1-copy"]');

  await editableHeading.click();
  await page.keyboard.press(`${MODIFIER}+C`);
  await page.keyboard.press(`${MODIFIER}+V`);

  await expect(editableHeading).toHaveText(HERO_KICKER);
  await expect(copiedHeading).toHaveText(HERO_KICKER);
  await expect(page.getByTestId("selection-overlay")).toBeVisible();
  const originalRect = await getSlideElementRect(editableHeading);
  const copiedRect = await getSlideElementRect(copiedHeading);
  expect(copiedRect.x - originalRect.x).toBeCloseTo(24, 0);
  expect(copiedRect.y - originalRect.y).toBeCloseTo(24, 0);

  await page.keyboard.press("ArrowRight");
  await expectInlineStyleContains(copiedHeading, "transform", "translate(5px, 0px)");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expectInlineStyle(copiedHeading, "transform", "");
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(copiedHeading).toBeHidden();
});

test("keyboard paste keeps repeated copies inside the slide bounds", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.click();
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");

  const movedRect = await getSlideElementRect(editableHeading);
  const targetRightEdge = movedRect.slideWidth - movedRect.width + 8;
  const additionalX = Math.max(0, Math.round(targetRightEdge - movedRect.x));
  await applyCustomCssProperty(page, "transform", `translate(${additionalX}px, 0px)`);

  await editableHeading.click();
  await page.keyboard.press(`${MODIFIER}+C`);

  for (const copyId of ["text-1-copy", "text-1-copy-2", "text-1-copy-3", "text-1-copy-4"]) {
    await page.keyboard.press(`${MODIFIER}+V`);
    const copyRect = await getSlideElementRect(frame.locator(`[data-editor-id="${copyId}"]`));

    expect(copyRect.x).toBeGreaterThanOrEqual(-0.5);
    expect(copyRect.y).toBeGreaterThanOrEqual(-0.5);
    expect(copyRect.right).toBeLessThanOrEqual(copyRect.slideWidth + 0.5);
    expect(copyRect.bottom).toBeLessThanOrEqual(copyRect.slideHeight + 0.5);
  }
});

test("keyboard cut paste moves an element through history", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const copiedHeading = frame.locator('[data-editor-id="text-1-copy"]');

  await editableHeading.click();
  await page.keyboard.press(`${MODIFIER}+X`);
  await expect(editableHeading).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+V`);
  await expect(copiedHeading).toHaveText(HERO_KICKER);
  await expect(editableHeading).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(copiedHeading).toBeHidden();
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
});

test("keyboard layer shortcuts update z-index", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.click();
  await page.keyboard.press(`${MODIFIER}+]`);
  await expectInlineStyle(editableHeading, "z-index", "1");

  await page.keyboard.press(`${MODIFIER}+Shift+]`);
  await expectInlineStyle(editableHeading, "z-index", "999");

  await page.keyboard.press(`${MODIFIER}+Shift+[`);
  await expectInlineStyle(editableHeading, "z-index", "0");
});

test("shift click multi-select moves and deletes elements as one history entry", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstText = frame.locator('[data-editor-id="text-1"]');
  const secondText = frame.locator('[data-editor-id="text-2"]');
  const { selectionOverlay } = getHistoryControls(page);

  await firstText.click();
  await secondText.click({ modifiers: ["Shift"] });
  await expect(selectionOverlay).toBeVisible();
  const firstInitialTransform = await getInlineStyle(firstText, "transform");
  const secondInitialTransform = await getInlineStyle(secondText, "transform");

  await page.keyboard.press("ArrowRight");
  const firstMovedRect = await getSlideElementRect(firstText);
  const secondMovedRect = await getSlideElementRect(secondText);
  expect(firstMovedRect.x).toBeGreaterThan(0);
  expect(secondMovedRect.x).toBeGreaterThan(0);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expectInlineStyle(firstText, "transform", firstInitialTransform);
  await expectInlineStyle(secondText, "transform", secondInitialTransform);

  await page.keyboard.press("Backspace");
  await expect(firstText).toBeHidden();
  await expect(secondText).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(firstText).toHaveText(HERO_KICKER);
  await expect(secondText).toBeVisible();
});

test("multi-select copy paste duplicates the selected set", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstText = frame.locator('[data-editor-id="text-1"]');
  const secondText = frame.locator('[data-editor-id="text-2"]');
  const firstCopy = frame.locator('[data-editor-id="text-1-copy"]');
  const secondCopy = frame.locator('[data-editor-id="text-2-copy"]');

  await firstText.click();
  await secondText.click({ modifiers: ["Shift"] });
  const firstRect = await getSlideElementRect(firstText);
  const secondRect = await getSlideElementRect(secondText);
  await page.keyboard.press(`${MODIFIER}+C`);
  await page.keyboard.press(`${MODIFIER}+V`);

  await expect(firstCopy).toHaveText(HERO_KICKER);
  await expect(secondCopy).toBeVisible();
  const firstCopyRect = await getSlideElementRect(firstCopy);
  const secondCopyRect = await getSlideElementRect(secondCopy);
  const firstDelta = firstCopyRect.x - firstRect.x;
  const secondDelta = secondCopyRect.x - secondRect.x;
  expect(firstCopyRect.right).toBeLessThanOrEqual(firstCopyRect.slideWidth + 0.5);
  expect(secondCopyRect.right).toBeLessThanOrEqual(secondCopyRect.slideWidth + 0.5);
  expect(Math.abs(firstDelta - secondDelta)).toBeLessThanOrEqual(0.5);

  await page.keyboard.press("ArrowDown");
  const firstMovedCopyRect = await getSlideElementRect(firstCopy);
  const secondMovedCopyRect = await getSlideElementRect(secondCopy);
  expect(firstMovedCopyRect.y).toBeGreaterThan(firstCopyRect.y);
  expect(secondMovedCopyRect.y).toBeGreaterThan(secondCopyRect.y);

  await page.keyboard.press(`${MODIFIER}+Z`);
  const firstRestoredCopyRect = await getSlideElementRect(firstCopy);
  const secondRestoredCopyRect = await getSlideElementRect(secondCopy);
  expect(Math.abs(firstRestoredCopyRect.y - firstCopyRect.y)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(secondRestoredCopyRect.y - secondCopyRect.y)).toBeLessThanOrEqual(0.5);
});

test("multi-select keyboard arrows move sibling snap cards together", async ({ page }) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 12").click();

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editor-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editor-id="snap-card-b"]');
  const { selectionOverlay } = getHistoryControls(page);

  await firstCard.locator(".snap-drag-surface").click();
  await secondCard.locator(".snap-drag-surface").click({ modifiers: ["Shift"] });
  await expect(selectionOverlay).toBeVisible();

  const firstBefore = await getSlideElementRect(firstCard);
  const secondBefore = await getSlideElementRect(secondCard);

  await page.keyboard.press("ArrowDown");

  const firstAfter = await getSlideElementRect(firstCard);
  const secondAfter = await getSlideElementRect(secondCard);
  expect(firstAfter.y - firstBefore.y).toBeCloseTo(5, 0);
  expect(secondAfter.y - secondBefore.y).toBeCloseTo(5, 0);

  await page.keyboard.press(`${MODIFIER}+Z`);

  const firstRestored = await getSlideElementRect(firstCard);
  const secondRestored = await getSlideElementRect(secondCard);
  expect(firstRestored.y).toBeCloseTo(firstBefore.y, 0);
  expect(secondRestored.y).toBeCloseTo(secondBefore.y, 0);
});

test("multi-select overlay drag moves sibling snap cards together", async ({ page }) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 12").click();

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editor-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editor-id="snap-card-b"]');
  const { selectionOverlay } = getHistoryControls(page);

  await firstCard.locator(".snap-drag-surface").click();
  await secondCard.locator(".snap-drag-surface").click({ modifiers: ["Shift"] });
  await expect(selectionOverlay).toBeVisible();

  const firstBefore = await getSlideElementRect(firstCard);
  const secondBefore = await getSlideElementRect(secondCard);
  const overlayBefore = await getRequiredBoundingBox(selectionOverlay, "multi-selection overlay");
  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 50, start.y + 40, { steps: 8 });
  await page.mouse.up();

  const firstAfter = await getSlideElementRect(firstCard);
  const secondAfter = await getSlideElementRect(secondCard);
  expect(firstAfter.x).toBeGreaterThan(firstBefore.x + 20);
  expect(firstAfter.y).toBeGreaterThan(firstBefore.y + 15);
  expect(secondAfter.x).toBeGreaterThan(secondBefore.x + 20);
  expect(secondAfter.y).toBeGreaterThan(secondBefore.y + 15);
});
