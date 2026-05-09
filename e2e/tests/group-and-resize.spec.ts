import { expect, test } from "@playwright/test";
import {
  HERO_KICKER,
  MODIFIER,
  coverFrame,
  createGroupFromGeometryCards,
  createGroupFromSnapCards,
  getHistoryControls,
  getRequiredBoundingBox,
  gotoEditor,
  selectAllAndFill,
} from "./helpers";

test("escape cancels text editing without creating undo history", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const originalText = HERO_KICKER;
  const draftText = "Draft text that should be discarded";

  await editableHeading.dblclick();
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");

  await selectAllAndFill(editableHeading, draftText);
  await editableHeading.press("Escape");

  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);
  await expect(editableHeading).toHaveText(originalText);
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(originalText);
});

test("double clicking a group enters scope and Escape returns to the group", async ({ page }) => {
  await gotoEditor(page);
  const group = await createGroupFromSnapCards(page);

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editor-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editor-id="snap-card-b"]');
  const outsideCard = frame.locator('[data-editor-id="snap-card-c"]');
  const { selectionOverlay } = getHistoryControls(page);

  await selectionOverlay.dblclick();
  await expect(group).toHaveAttribute("data-hse-active-group-scope", "true");
  await expect(outsideCard).toHaveAttribute("data-hse-outside-group-scope", "true");

  await outsideCard.locator(".snap-drag-surface").click();
  await expect(selectionOverlay).toBeVisible();
  await expect(group).toHaveAttribute("data-hse-active-group-scope", "true");

  await firstCard.locator(".snap-drag-surface").click();
  const selectedChildOverlay = await getRequiredBoundingBox(selectionOverlay, "child selection");
  const childRect = await getRequiredBoundingBox(firstCard, "first grouped child");
  expect(Math.abs(selectedChildOverlay.width - childRect.width)).toBeLessThanOrEqual(3);

  await firstCard.locator('[data-editor-id="text-5"]').dblclick();
  const groupedText = firstCard.locator('[data-editor-id="text-5"]');
  await expect(groupedText).toHaveAttribute("contenteditable", "plaintext-only");
  await page.keyboard.press("Escape");
  await expect(groupedText).not.toHaveAttribute("contenteditable", /.+/);
  await expect(group).toHaveAttribute("data-hse-active-group-scope", "true");

  await page.keyboard.press("Escape");
  await expect(group).not.toHaveAttribute("data-hse-active-group-scope", "true");
  await expect(outsideCard).not.toHaveAttribute("data-hse-outside-group-scope", "true");

  const groupOverlay = await getRequiredBoundingBox(selectionOverlay, "group selection");
  const groupRect = await getRequiredBoundingBox(group, "group");
  const secondRect = await getRequiredBoundingBox(secondCard, "second grouped child");
  expect(Math.abs(groupOverlay.width - groupRect.width)).toBeLessThanOrEqual(3);
  expect(groupRect.width).toBeGreaterThan(secondRect.width);
});

test("group resize scales child geometry without scaling visual styling", async ({ page }) => {
  await gotoEditor(page);
  const group = await createGroupFromGeometryCards(page);

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editor-id="group-card-a"]');
  const firstLabel = frame.locator('[data-editor-id="group-card-a-title"]');
  const { selectionOverlay } = getHistoryControls(page);
  const resizeHandle = page.getByTestId("block-resize-handle-bottom-right");

  await expect(group).toBeVisible();
  await expect(resizeHandle).toBeVisible();

  const groupBefore = await getRequiredBoundingBox(group, "group before resize");
  const cardBefore = await getRequiredBoundingBox(firstCard, "group child before resize");
  const initialFontSize = await firstLabel.evaluate(
    (node) => node.ownerDocument.defaultView?.getComputedStyle(node).fontSize ?? ""
  );
  const initialPadding = await firstCard.evaluate(
    (node) => node.ownerDocument.defaultView?.getComputedStyle(node).paddingTop ?? ""
  );

  const handleBefore = await getRequiredBoundingBox(resizeHandle, "resize handle");
  const resizeStart = {
    x: handleBefore.x + handleBefore.width / 2,
    y: handleBefore.y + handleBefore.height / 2,
  };
  await resizeHandle.dispatchEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    clientX: resizeStart.x,
    clientY: resizeStart.y,
  });
  await page.keyboard.down("Alt");
  await page.mouse.move(resizeStart.x + 140, resizeStart.y + 80, { steps: 8 });
  await page.keyboard.up("Alt");
  await page.mouse.up();

  const groupAfter = await getRequiredBoundingBox(group, "group after resize");
  const cardAfter = await getRequiredBoundingBox(firstCard, "group child after resize");
  expect(groupAfter.width).toBeGreaterThan(groupBefore.width + 50);
  expect(groupAfter.height).toBeGreaterThan(groupBefore.height + 25);
  expect(cardAfter.width).toBeGreaterThan(cardBefore.width + 20);
  expect(cardAfter.height).toBeGreaterThan(cardBefore.height + 10);

  await expect(firstLabel).toHaveCSS("font-size", initialFontSize);
  await expect(firstCard).toHaveCSS("padding-top", initialPadding);
  await expect(selectionOverlay).toBeVisible();
});
