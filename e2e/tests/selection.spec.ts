import { expect, test } from "@playwright/test";
import { coverFrame, getHeaderControls, getHistoryControls, gotoEditor } from "./helpers";

test("plain click selects text only, and double click enters editing", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint, selectionOverlay } = getHistoryControls(page);
  const { floatingToolbarAnchor } = getHeaderControls(page);

  await editableHeading.click();

  await expect(selectionOverlay).toBeVisible();
  await expect(editingHint).toBeHidden();
  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);

  await editableHeading.dblclick();

  await expect(editingHint).toBeVisible();
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

test("floating toolbar is the only element tooling surface", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await frame.locator('[data-editor-id="text-1"]').click();

  const { floatingToolbarAnchor } = getHeaderControls(page);

  await expect(floatingToolbarAnchor).toBeVisible();
  await expect(page.getByTestId("sidebar-tool-panel")).toBeHidden();
  await expect(page.getByRole("button", { name: "Use tool panel mode", exact: true })).toBeHidden();
});
