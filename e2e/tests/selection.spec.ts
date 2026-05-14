import { expect, test } from "@playwright/test";
import {
  coverFrame,
  getHeaderControls,
  getHistoryControls,
  getRequiredBoundingBox,
  gotoEditor,
} from "./helpers";

test("plain click selects text only, and double click enters editing", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);
  const { floatingToolbarAnchor } = getHeaderControls(page);

  await editableHeading.click();

  await expect(selectionOverlay).toBeVisible();
  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);

  await editableHeading.dblclick();

  await expect(floatingToolbarAnchor).toBeHidden();
  await expect(selectionOverlay).toBeHidden();
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");
});

test("selection overlay stays aligned to the selected element bounds", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
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

  expect(Math.abs(overlayBox.x - elementBox.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayBox.y - elementBox.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayBox.width - elementBox.width)).toBeLessThanOrEqual(6);
  expect(Math.abs(overlayBox.height - elementBox.height)).toBeLessThanOrEqual(6);
});

test("plain click selects nested text instead of its parent block", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const nestedText = frame.locator('[data-editable-id="text-5"]');
  const parentBlock = frame.locator('[data-editable-id="block-4"]');
  const { selectionOverlay } = getHistoryControls(page);

  await nestedText.click();

  const [textBox, blockBox, overlayBox] = await Promise.all([
    nestedText.boundingBox(),
    parentBlock.boundingBox(),
    selectionOverlay.boundingBox(),
  ]);

  expect(textBox).not.toBeNull();
  expect(blockBox).not.toBeNull();
  expect(overlayBox).not.toBeNull();

  if (!textBox || !blockBox || !overlayBox) {
    throw new Error("Expected nested text, parent block, and overlay to all have bounds.");
  }

  expect(Math.abs(overlayBox.x - textBox.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayBox.y - textBox.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayBox.width - textBox.width)).toBeLessThanOrEqual(6);
  expect(Math.abs(overlayBox.height - textBox.height)).toBeLessThanOrEqual(6);
  expect(Math.abs(overlayBox.y - blockBox.y)).toBeGreaterThan(6);
  expect(Math.abs(overlayBox.height - blockBox.height)).toBeGreaterThan(24);
});

test("hovering an editable element shows a passive preselection overlay for the pointed target", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const nestedText = frame.locator('[data-editable-id="text-5"]');
  const { preselectionOverlay, selectionOverlay } = getHistoryControls(page);

  await nestedText.hover();

  await expect(preselectionOverlay).toBeVisible();
  await expect(selectionOverlay).toBeHidden();
  await expect(page.getByTestId("block-resize-handle-top-left")).toHaveCount(0);
  await expect(page.getByTestId("block-rotation-zone-top-left")).toHaveCount(0);

  const [textBox, preselectionBox] = await Promise.all([
    getRequiredBoundingBox(nestedText, "nested text"),
    getRequiredBoundingBox(preselectionOverlay, "preselection overlay"),
  ]);

  expect(Math.abs(preselectionBox.x - textBox.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(preselectionBox.y - textBox.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(preselectionBox.width - textBox.width)).toBeLessThanOrEqual(6);
  expect(Math.abs(preselectionBox.height - textBox.height)).toBeLessThanOrEqual(6);
});

test("dragging from a preselected editable element selects and moves it in one gesture", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const nestedText = frame.locator('[data-editable-id="text-5"]');
  const { preselectionOverlay, selectionOverlay } = getHistoryControls(page);

  await nestedText.hover();
  await expect(preselectionOverlay).toBeVisible();
  await expect(selectionOverlay).toBeHidden();

  const textBefore = await getRequiredBoundingBox(nestedText, "nested text before dragging");
  const preselectionBox = await getRequiredBoundingBox(preselectionOverlay, "preselection overlay");
  const start = {
    x: preselectionBox.x + preselectionBox.width / 2,
    y: preselectionBox.y + preselectionBox.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 80, start.y + 45, { steps: 8 });
  await page.mouse.up();

  await expect(selectionOverlay).toBeVisible();

  const [textAfter, overlayAfter] = await Promise.all([
    getRequiredBoundingBox(nestedText, "nested text after dragging"),
    getRequiredBoundingBox(selectionOverlay, "selection overlay after dragging"),
  ]);

  expect(textAfter.x).toBeGreaterThan(textBefore.x + 30);
  expect(textAfter.y).toBeGreaterThan(textBefore.y + 15);
  expect(Math.abs(overlayAfter.x - textAfter.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayAfter.y - textAfter.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayAfter.width - textAfter.width)).toBeLessThanOrEqual(6);
  expect(Math.abs(overlayAfter.height - textAfter.height)).toBeLessThanOrEqual(6);
});

test("clicking a nested text target through a selected outer block retargets selection by pointer depth", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const nestedText = frame.locator('[data-editable-id="text-5"]');
  const parentBlock = frame.locator('[data-editable-id="block-4"]');
  const { preselectionOverlay, selectionOverlay } = getHistoryControls(page);

  await parentBlock.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeVisible();

  const [blockBox, initialOverlayBox] = await Promise.all([
    getRequiredBoundingBox(parentBlock, "parent block"),
    getRequiredBoundingBox(selectionOverlay, "initial selection overlay"),
  ]);

  expect(Math.abs(initialOverlayBox.x - blockBox.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(initialOverlayBox.y - blockBox.y)).toBeLessThanOrEqual(3);

  await nestedText.hover();
  await expect(preselectionOverlay).toBeVisible();

  await nestedText.click();

  const [textBox, finalOverlayBox] = await Promise.all([
    getRequiredBoundingBox(nestedText, "nested text"),
    getRequiredBoundingBox(selectionOverlay, "final selection overlay"),
  ]);

  expect(Math.abs(finalOverlayBox.x - textBox.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(finalOverlayBox.y - textBox.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(finalOverlayBox.width - textBox.width)).toBeLessThanOrEqual(6);
  expect(Math.abs(finalOverlayBox.height - textBox.height)).toBeLessThanOrEqual(6);
  expect(Math.abs(finalOverlayBox.y - blockBox.y)).toBeGreaterThan(6);
  expect(Math.abs(finalOverlayBox.height - blockBox.height)).toBeGreaterThan(24);
});

test("drag marquee selects every editable element it touches", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstText = frame.locator('[data-editable-id="text-1"]');
  const secondText = frame.locator('[data-editable-id="text-2"]');
  const untouchedText = frame.locator('[data-editable-id="text-3"]');
  const marqueeOverlay = page.getByTestId("marquee-selection-overlay");
  const { selectionOverlay } = getHistoryControls(page);

  const [firstBox, secondBox, untouchedBox] = await Promise.all([
    getRequiredBoundingBox(firstText, "first text"),
    getRequiredBoundingBox(secondText, "second text"),
    getRequiredBoundingBox(untouchedText, "untouched text"),
  ]);
  const start = {
    x: Math.min(firstBox.x, secondBox.x) - 48,
    y: Math.min(firstBox.y, secondBox.y) - 48,
  };
  const end = {
    x: Math.max(firstBox.x + firstBox.width, secondBox.x + secondBox.width) - 4,
    y: Math.max(firstBox.y + firstBox.height, secondBox.y + secondBox.height) - 4,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await expect(marqueeOverlay).toBeVisible();
  await page.mouse.up();

  await expect(marqueeOverlay).toBeHidden();
  await expect(selectionOverlay).toBeVisible();

  const selectionBox = await getRequiredBoundingBox(selectionOverlay, "selection overlay");
  expect(selectionBox.x).toBeLessThanOrEqual(firstBox.x + 3);
  expect(selectionBox.y).toBeLessThanOrEqual(firstBox.y + 3);
  expect(selectionBox.x + selectionBox.width).toBeGreaterThanOrEqual(
    secondBox.x + secondBox.width - 3
  );
  expect(selectionBox.y + selectionBox.height).toBeGreaterThanOrEqual(
    secondBox.y + secondBox.height - 3
  );
  expect(selectionBox.y + selectionBox.height).toBeLessThan(untouchedBox.y);

  await page.keyboard.press("ArrowRight");
  const [firstAfter, secondAfter, untouchedAfter] = await Promise.all([
    getRequiredBoundingBox(firstText, "first text after keyboard move"),
    getRequiredBoundingBox(secondText, "second text after keyboard move"),
    getRequiredBoundingBox(untouchedText, "untouched text after keyboard move"),
  ]);
  expect(firstAfter.x).toBeGreaterThan(firstBox.x);
  expect(secondAfter.x).toBeGreaterThan(secondBox.x);
  expect(Math.abs(untouchedAfter.x - untouchedBox.x)).toBeLessThanOrEqual(0.5);
});

test("drag marquee selects the outer editable element when nested editables are touched", async ({
  page,
}) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 10").click();

  const frame = coverFrame(page);
  const parentBlock = frame.locator('[data-editable-id="block-4"]');
  const nestedText = frame.locator('[data-editable-id="text-5"]');
  const marqueeOverlay = page.getByTestId("marquee-selection-overlay");
  const { selectionOverlay } = getHistoryControls(page);

  const blockBox = await getRequiredBoundingBox(parentBlock, "parent block");
  const nestedBox = await getRequiredBoundingBox(nestedText, "nested text");
  const start = {
    x: blockBox.x - 24,
    y: nestedBox.y + nestedBox.height / 2,
  };
  const end = {
    x: blockBox.x + blockBox.width - 12,
    y: blockBox.y + blockBox.height - 4,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await expect(marqueeOverlay).toBeVisible();
  await page.mouse.up();

  await expect(selectionOverlay).toBeVisible();
  const selectedBox = await getRequiredBoundingBox(selectionOverlay, "selection overlay");
  expect(Math.abs(selectedBox.x - blockBox.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(selectedBox.y - blockBox.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(selectedBox.width - blockBox.width)).toBeLessThanOrEqual(6);
  expect(Math.abs(selectedBox.height - blockBox.height)).toBeLessThanOrEqual(6);
  expect(Math.abs(selectedBox.y - nestedBox.y)).toBeGreaterThan(6);
  expect(Math.abs(selectedBox.height - nestedBox.height)).toBeGreaterThan(24);
});

test("multi-selection overlay drag can start from a nested child inside a selected outer element", async ({
  page,
}) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 10").click();

  const frame = coverFrame(page);
  const firstBlock = frame.locator('[data-editable-id="block-4"]');
  const secondBlock = frame.locator('[data-editable-id="block-10"]');
  const nestedText = frame.locator('[data-editable-id="text-5"]');
  const { selectionOverlay } = getHistoryControls(page);

  await firstBlock.click({ position: { x: 8, y: 8 } });
  await secondBlock.click({ position: { x: 8, y: 8 }, modifiers: ["Shift"] });
  await expect(selectionOverlay).toBeVisible();

  const [firstBefore, secondBefore, nestedBox] = await Promise.all([
    getRequiredBoundingBox(firstBlock, "first selected block before dragging"),
    getRequiredBoundingBox(secondBlock, "second selected block before dragging"),
    getRequiredBoundingBox(nestedText, "nested text drag start"),
  ]);
  const start = {
    x: nestedBox.x + nestedBox.width / 2,
    y: nestedBox.y + nestedBox.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 64, start.y + 48, { steps: 8 });
  await page.mouse.up();

  const [firstAfter, secondAfter] = await Promise.all([
    getRequiredBoundingBox(firstBlock, "first selected block after dragging"),
    getRequiredBoundingBox(secondBlock, "second selected block after dragging"),
  ]);
  expect(firstAfter.x).toBeGreaterThan(firstBefore.x + 20);
  expect(firstAfter.y).toBeGreaterThan(firstBefore.y + 15);
  expect(secondAfter.x).toBeGreaterThan(secondBefore.x + 20);
  expect(secondAfter.y).toBeGreaterThan(secondBefore.y + 15);
});

test("drag marquee does not leave native browser text selected", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstText = frame.locator('[data-editable-id="text-1"]');
  const secondText = frame.locator('[data-editable-id="text-2"]');
  const [firstBox, secondBox] = await Promise.all([
    getRequiredBoundingBox(firstText, "first text"),
    getRequiredBoundingBox(secondText, "second text"),
  ]);

  await page.mouse.move(firstBox.x - 40, firstBox.y - 40);
  await page.mouse.down();
  await page.mouse.move(secondBox.x + secondBox.width - 4, secondBox.y + secondBox.height - 4, {
    steps: 12,
  });
  await page.mouse.up();

  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() ?? "")).toBe("");
  await expect
    .poll(() =>
      page
        .locator('[data-testid="slide-iframe"]')
        .evaluate(
          (iframe) => (iframe as HTMLIFrameElement).contentWindow?.getSelection()?.toString() ?? ""
        )
    )
    .toBe("");
});

test("floating toolbar is the only element tooling surface", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await frame.locator('[data-editable-id="text-1"]').click();

  const { floatingToolbarAnchor } = getHeaderControls(page);

  await expect(floatingToolbarAnchor).toBeVisible();
  await expect(floatingToolbarAnchor.getByLabel("Font", { exact: true })).toBeVisible();
});
