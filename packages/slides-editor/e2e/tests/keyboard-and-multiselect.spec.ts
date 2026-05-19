import { expect, test } from "@playwright/test";
import {
  HERO_KICKER,
  MODIFIER,
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
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.click();
  await expect(selectionOverlay).toBeVisible();

  await page.keyboard.press("Backspace");
  await expect(editableHeading).toBeHidden();
  await expect(selectionOverlay).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
});

test("keyboard Delete removes selected element like Backspace", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');

  await editableHeading.click();
  await page.keyboard.press("Delete");
  await expect(editableHeading).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
});

test("keyboard arrows move the selected element and preserve undo redo", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');

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

test("keyboard Alt arrows use the fine movement step", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');

  await editableHeading.click();
  await page.keyboard.press("Alt+ArrowRight");
  await expectInlineStyleContains(editableHeading, "transform", "translate(1px, 0px)");
});

test("keyboard arrows switch slides when no element is selected", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const stagePanel = page.getByTestId("stage-panel");
  const { selectionOverlay } = getHistoryControls(page);

  await expect(page.getByRole("button", { name: "Slide 1", exact: true })).toHaveAttribute(
    "aria-current",
    "true"
  );
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "Slide 2", exact: true })).toHaveAttribute(
    "aria-current",
    "true"
  );

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: "Slide 3", exact: true })).toHaveAttribute(
    "aria-current",
    "true"
  );

  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("button", { name: "Slide 2", exact: true })).toHaveAttribute(
    "aria-current",
    "true"
  );

  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("button", { name: "Slide 1", exact: true })).toHaveAttribute(
    "aria-current",
    "true"
  );

  await editableHeading.click();
  await expect(selectionOverlay).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "Slide 1", exact: true })).toHaveAttribute(
    "aria-current",
    "true"
  );
  await expectInlineStyleContains(editableHeading, "transform", "translate(5px, 0px)");

  await stagePanel.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeHidden();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "Slide 2", exact: true })).toHaveAttribute(
    "aria-current",
    "true"
  );
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
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const copiedHeading = frame.locator('[data-editable-id="text-1-copy"]');

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

test("keyboard paste with an empty object clipboard is a no-op", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');

  await editableHeading.click();
  const beforeHtml = await editableHeading.evaluate((node) => node.ownerDocument.body.innerHTML);
  await page.keyboard.press(`${MODIFIER}+V`);

  await expect(editableHeading).toHaveText(HERO_KICKER);
  await expect(frame.locator('[data-editable-id="text-1-copy"]')).toHaveCount(0);
  const afterHtml = await editableHeading.evaluate((node) => node.ownerDocument.body.innerHTML);
  expect(afterHtml).toBe(beforeHtml);
});

test("keyboard paste keeps repeated copies inside the slide bounds", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');

  await editableHeading.click();
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");

  const movedRect = await getSlideElementRect(editableHeading);
  const targetRightEdge = movedRect.slideWidth - movedRect.width + 8;
  const additionalX = Math.max(0, Math.round(targetRightEdge - movedRect.x));
  await page.keyboard.press("Escape");
  await editableHeading.evaluate((node, transform) => {
    (node as HTMLElement).style.transform = transform;
  }, `translate(${additionalX}px, 0px)`);
  await editableHeading.evaluate((node) => (node as HTMLElement).click());

  await page.keyboard.press(`${MODIFIER}+C`);

  for (const copyId of ["text-1-copy", "text-1-copy-2", "text-1-copy-3", "text-1-copy-4"]) {
    await page.keyboard.press(`${MODIFIER}+V`);
    const copyRect = await getSlideElementRect(frame.locator(`[data-editable-id="${copyId}"]`));

    expect(copyRect.x).toBeGreaterThanOrEqual(-0.5);
    expect(copyRect.y).toBeGreaterThanOrEqual(-0.5);
    expect(copyRect.right).toBeLessThanOrEqual(copyRect.slideWidth + 0.5);
    expect(copyRect.bottom).toBeLessThanOrEqual(copyRect.slideHeight + 0.5);
  }
});

test("keyboard cut paste moves an element through history", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const copiedHeading = frame.locator('[data-editable-id="text-1-copy"]');

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
  const editableHeading = frame.locator('[data-editable-id="text-1"]');

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
  const firstText = frame.locator('[data-editable-id="text-1"]');
  const secondText = frame.locator('[data-editable-id="text-2"]');
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

test("keyboard select all selects every top-level editable element on the active slide", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstText = frame.locator('[data-editable-id="text-1"]');
  const secondText = frame.locator('[data-editable-id="text-2"]');
  const nestedBlock = frame.locator('[data-editable-id="block-4"]');
  const nestedText = frame.locator('[data-editable-id="text-5"]');
  const { selectionOverlay } = getHistoryControls(page);

  const [firstBefore, secondBefore, blockBefore, nestedBefore] = await Promise.all([
    getRequiredBoundingBox(firstText, "first top-level text before select all"),
    getRequiredBoundingBox(secondText, "second top-level text before select all"),
    getRequiredBoundingBox(nestedBlock, "nested block before select all"),
    getRequiredBoundingBox(nestedText, "nested text before select all"),
  ]);

  await page.keyboard.press(`${MODIFIER}+A`);
  await expect(selectionOverlay).toBeVisible();

  const overlayBox = await getRequiredBoundingBox(selectionOverlay, "select-all overlay");
  expect(overlayBox.x).toBeLessThanOrEqual(firstBefore.x + 3);
  expect(overlayBox.y).toBeLessThanOrEqual(firstBefore.y + 3);
  expect(overlayBox.x + overlayBox.width).toBeGreaterThanOrEqual(
    blockBefore.x + blockBefore.width - 3
  );
  expect(overlayBox.y + overlayBox.height).toBeGreaterThanOrEqual(
    blockBefore.y + blockBefore.height - 3
  );

  await page.keyboard.press("ArrowRight");

  const [firstAfter, secondAfter, blockAfter, nestedAfter] = await Promise.all([
    getRequiredBoundingBox(firstText, "first top-level text after select-all move"),
    getRequiredBoundingBox(secondText, "second top-level text after select-all move"),
    getRequiredBoundingBox(nestedBlock, "nested block after select-all move"),
    getRequiredBoundingBox(nestedText, "nested text after select-all move"),
  ]);
  expect(firstAfter.x).toBeGreaterThan(firstBefore.x);
  expect(secondAfter.x).toBeGreaterThan(secondBefore.x);
  expect(blockAfter.x).toBeGreaterThan(blockBefore.x);
  expect(nestedAfter.x - blockAfter.x).toBeCloseTo(nestedBefore.x - blockBefore.x, 0);
});

test("keyboard select all keeps native text selection while text editing", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.dblclick();
  await expect(selectionOverlay).toBeHidden();
  await page.keyboard.press(`${MODIFIER}+A`);

  const selectedText = await page
    .locator('[data-testid="slide-iframe"]')
    .evaluate((iframe) => (iframe as HTMLIFrameElement).contentWindow?.getSelection()?.toString());
  expect(selectedText).toBe(HERO_KICKER.toUpperCase());
  await expect(selectionOverlay).toBeHidden();
});

test("multi-select copy paste duplicates the selected set", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstText = frame.locator('[data-editable-id="text-1"]');
  const secondText = frame.locator('[data-editable-id="text-2"]');
  const firstCopy = frame.locator('[data-editable-id="text-1-copy"]');
  const secondCopy = frame.locator('[data-editable-id="text-2-copy"]');

  await firstText.click();
  await secondText.click({ modifiers: ["Shift"] });
  const firstRect = await getSlideElementRect(firstText);
  const secondRect = await getSlideElementRect(secondText);
  await page.keyboard.press(`${MODIFIER}+C`);
  await page.keyboard.press(`${MODIFIER}+V`);

  await expect(firstCopy).toHaveText(HERO_KICKER);
  await expect(secondCopy).toBeVisible();
  await expect(firstCopy.locator('[data-editable-id="text-1-copy-text-1"]')).toHaveCount(0);
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
  const firstCard = frame.locator('[data-editable-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editable-id="snap-card-b"]');
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
  const firstCard = frame.locator('[data-editable-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editable-id="snap-card-b"]');
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
