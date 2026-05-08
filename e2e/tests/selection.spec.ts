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
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
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

  expect(Math.abs(overlayBox.x - elementBox.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayBox.y - elementBox.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayBox.width - elementBox.width)).toBeLessThanOrEqual(6);
  expect(Math.abs(overlayBox.height - elementBox.height)).toBeLessThanOrEqual(6);
});

test("plain click selects nested text instead of its parent block", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const nestedText = frame.locator('[data-editor-id="text-5"]');
  const parentBlock = frame.locator('[data-editor-id="block-4"]');
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
  const nestedText = frame.locator('[data-editor-id="text-5"]');
  const { preselectionOverlay, selectionOverlay } = getHistoryControls(page);

  await nestedText.hover();

  await expect(preselectionOverlay).toBeVisible();
  await expect(selectionOverlay).toBeHidden();
  await expect(page.getByTestId("block-resize-handle-top-left")).toHaveCount(0);
  await expect(page.getByTestId("block-rotate-handle")).toHaveCount(0);

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
  const nestedText = frame.locator('[data-editor-id="text-5"]');
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
  const nestedText = frame.locator('[data-editor-id="text-5"]');
  const parentBlock = frame.locator('[data-editor-id="block-4"]');
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

test("floating toolbar is the only element tooling surface", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await frame.locator('[data-editor-id="text-1"]').click();

  const { floatingToolbarAnchor } = getHeaderControls(page);

  await expect(floatingToolbarAnchor).toBeVisible();
  await expect(floatingToolbarAnchor.getByLabel("Font", { exact: true })).toBeVisible();
});
