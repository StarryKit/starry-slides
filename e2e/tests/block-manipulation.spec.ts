import { expect, test } from "@playwright/test";
import {
  HERO_KICKER,
  MODIFIER,
  coverFrame,
  createGroupFromGeometryCards,
  createGroupFromSnapCards,
  dragMouseInStepsUntil,
  getComputedStyleValue,
  getHeaderControls,
  getHistoryControls,
  getRequiredBoundingBox,
  gotoEditor,
  selectAllAndFill,
} from "./helpers";

test("double clicking a non-text element does not enter text editing", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');

  await expect(blockCard).toBeVisible();

  await blockCard.evaluate((node) => {
    node.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
  });

  await expect(blockCard).not.toHaveAttribute("contenteditable", /.+/);
});

test("clicking a block element outside editing only selects and does not create history", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { selectionOverlay } = getHistoryControls(page);

  await blockCard.click({ position: { x: 12, y: 12 } });

  await expect(selectionOverlay).toBeVisible();
  await expect(blockCard).not.toHaveAttribute("contenteditable", /.+/);
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(selectionOverlay).toBeVisible();
});

test("selected block can be moved by dragging the same selection overlay and keeps a single overlay", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { selectionOverlay } = getHistoryControls(page);

  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeVisible();
  await expect(page.getByTestId("block-manipulation-outline")).toHaveCount(0);

  const before = await blockCard.boundingBox();
  if (!before) {
    throw new Error("Expected selected block to have bounds before dragging.");
  }

  const overlayBefore = await selectionOverlay.boundingBox();
  if (!overlayBefore) {
    throw new Error("Expected selection overlay to have bounds before dragging.");
  }

  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };
  const end = {
    x: start.x + 80,
    y: start.y + 60,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();

  const after = await blockCard.boundingBox();
  const overlayAfter = await selectionOverlay.boundingBox();
  expect(after).not.toBeNull();
  expect(overlayAfter).not.toBeNull();

  if (!after || !overlayAfter) {
    throw new Error("Expected selected block and overlay to have bounds after dragging.");
  }

  expect(overlayAfter.x).toBeGreaterThan(overlayBefore.x + 30);
  expect(overlayAfter.y).toBeGreaterThan(overlayBefore.y + 20);
  await expect(page.getByTestId("selection-overlay")).toHaveCount(1);
});

test("selected text element can be moved by dragging the same selection overlay", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const textElement = frame.locator('[data-editor-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);

  await expect(textElement).toBeVisible();
  await textElement.click({ position: { x: 8, y: 8 } });
  await expect(selectionOverlay).toBeVisible();

  const before = await textElement.boundingBox();
  const overlayBefore = await selectionOverlay.boundingBox();
  expect(before).not.toBeNull();
  expect(overlayBefore).not.toBeNull();

  if (!before || !overlayBefore) {
    throw new Error("Expected selected text element and overlay to have bounds before dragging.");
  }

  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };
  const end = {
    x: start.x + 70,
    y: start.y + 40,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();

  const after = await textElement.boundingBox();
  const overlayAfter = await selectionOverlay.boundingBox();
  expect(after).not.toBeNull();
  expect(overlayAfter).not.toBeNull();

  if (!after || !overlayAfter) {
    throw new Error("Expected selected text element and overlay to have bounds after dragging.");
  }

  expect(overlayAfter.x).toBeGreaterThan(overlayBefore.x + 25);
  expect(overlayAfter.y).toBeGreaterThan(overlayBefore.y + 12);
  await expect(page.getByTestId("selection-overlay")).toHaveCount(1);
});

test("dragging a selected block snaps its edge to a sibling edge guide", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await page.getByLabel("Slide 12").click();
  const siblingBlock = frame.locator('[data-editor-id="snap-card-b"]');
  const movingBlock = frame.locator('[data-editor-id="snap-card-c"]');
  const { selectionOverlay } = getHistoryControls(page);

  await movingBlock.locator(".snap-drag-surface").click();
  await expect(selectionOverlay).toBeVisible();

  const siblingBefore = await getRequiredBoundingBox(siblingBlock, "sibling block");
  const movingBefore = await getRequiredBoundingBox(movingBlock, "moving block before snapping");
  const overlayBefore = await getRequiredBoundingBox(selectionOverlay, "selection overlay");
  const siblingRightEdge = siblingBefore.x + siblingBefore.width;
  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };
  const target = {
    x: start.x + (siblingRightEdge - movingBefore.x) + 24,
    y: start.y,
  };
  const siblingEdgeGuide = page
    .locator('[data-testid="snap-guide-vertical"][data-variant="alignment"]')
    .first();

  const sawGuide = await dragMouseInStepsUntil(
    page,
    start,
    target,
    async () => (await siblingEdgeGuide.count()) > 0,
    80
  );
  expect(sawGuide).toBeTruthy();

  await expect(siblingEdgeGuide).toHaveCount(1);
  await expect
    .poll(() => getComputedStyleValue(siblingEdgeGuide, "border-left-color"), {
      timeout: 2500,
    })
    .toBe("rgb(239, 68, 68)");

  await page.mouse.up();

  const movingAfter = await getRequiredBoundingBox(movingBlock, "moving block after snapping");
  expect(Math.abs(movingAfter.x - siblingRightEdge)).toBeLessThan(
    Math.abs(movingBefore.x - siblingRightEdge)
  );
});

test("dragging a selected block snaps to the nearest sibling anywhere on the slide", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await page.getByLabel("Slide 12").click();
  const movingBlock = frame.locator('[data-editor-id="snap-card-d"]');
  const nearerBlock = frame.locator('[data-editor-id="snap-card-c"]');
  const fartherBlock = frame.locator('[data-editor-id="snap-card-b"]');
  const { selectionOverlay } = getHistoryControls(page);

  await movingBlock.locator(".snap-drag-surface").click();
  await expect(selectionOverlay).toBeVisible();

  const movingBefore = await getRequiredBoundingBox(movingBlock, "moving block before snapping");
  const nearerBefore = await getRequiredBoundingBox(nearerBlock, "nearer block before snapping");
  const fartherBefore = await getRequiredBoundingBox(fartherBlock, "farther block before snapping");
  const overlayBefore = await getRequiredBoundingBox(selectionOverlay, "selection overlay");

  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };
  const target = {
    x: start.x - (movingBefore.x - (nearerBefore.x + nearerBefore.width)),
    y: start.y + 520,
  };
  const siblingEdgeGuide = page
    .locator('[data-testid="snap-guide-vertical"][data-variant="alignment"]')
    .first();

  const sawGuide = await dragMouseInStepsUntil(
    page,
    start,
    target,
    async () => (await siblingEdgeGuide.count()) > 0,
    100
  );
  expect(sawGuide).toBeTruthy();

  await page.mouse.up();

  const movingAfter = await getRequiredBoundingBox(movingBlock, "moving block after snapping");
  expect(Math.abs(movingAfter.x - (nearerBefore.x + nearerBefore.width))).toBeLessThanOrEqual(2);
  expect(Math.abs(movingAfter.x - (fartherBefore.x + fartherBefore.width))).toBeGreaterThan(200);
});

test("spacing guides render capped end markers in the guide color", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await page.getByLabel("Slide 12").click();
  const firstBlock = frame.locator('[data-editor-id="snap-card-a"]');
  const secondBlock = frame.locator('[data-editor-id="snap-card-b"]');
  const movingBlock = frame.locator('[data-editor-id="snap-card-c"]');
  const { selectionOverlay } = getHistoryControls(page);

  await movingBlock.locator(".snap-drag-surface").click();
  await expect(selectionOverlay).toBeVisible();

  const firstBefore = await getRequiredBoundingBox(firstBlock, "first spacing source");
  const secondBefore = await getRequiredBoundingBox(secondBlock, "second spacing source");
  const movingBefore = await getRequiredBoundingBox(
    movingBlock,
    "moving block before spacing snap"
  );
  const overlayBefore = await getRequiredBoundingBox(selectionOverlay, "selection overlay");
  const existingGap = secondBefore.x - (firstBefore.x + firstBefore.width);
  const desiredMovingLeft = secondBefore.x + secondBefore.width + existingGap;
  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };
  const target = {
    x: start.x - (movingBefore.x - desiredMovingLeft),
    y: start.y,
  };
  const spacingGuide = page
    .locator('[data-testid="snap-guide-horizontal"][data-variant="spacing"]')
    .first();

  const sawGuide = await dragMouseInStepsUntil(
    page,
    start,
    target,
    async () => (await spacingGuide.count()) > 0,
    80
  );
  expect(sawGuide).toBeTruthy();

  const guideColor = await getComputedStyleValue(spacingGuide, "border-top-color");
  expect(guideColor).toBe("rgb(239, 68, 68)");
  await expect(spacingGuide.getByTestId("snap-guide-cap")).toHaveCount(2);
});

test("floating toolbar hides while dragging a selected element", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { selectionOverlay } = getHistoryControls(page);
  const { floatingToolbarAnchor } = getHeaderControls(page);

  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeVisible();
  await expect(floatingToolbarAnchor).toBeVisible();

  const overlayBefore = await selectionOverlay.boundingBox();
  if (!overlayBefore) {
    throw new Error("Expected selection overlay to have bounds before dragging.");
  }

  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(floatingToolbarAnchor).toBeHidden();
  await page.mouse.move(start.x + 40, start.y + 30, { steps: 4 });
  await page.mouse.up();
  await expect(floatingToolbarAnchor).toBeVisible();
});

test("after dragging and clearing selection, clicking the same element selects it again", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const stagePanel = page.getByTestId("stage-panel");
  const { selectionOverlay } = getHistoryControls(page);

  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeVisible();

  const overlayBefore = await selectionOverlay.boundingBox();
  if (!overlayBefore) {
    throw new Error("Expected selection overlay to have bounds before dragging.");
  }

  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 60, start.y + 45, { steps: 6 });
  await page.mouse.up();

  await stagePanel.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeHidden();

  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeVisible();
});

test("all four resize handles are visible for a selected element", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');

  await blockCard.click({ position: { x: 12, y: 12 } });

  await expect(page.getByTestId("block-resize-handle-top-left")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-top-right")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-bottom-right")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-bottom-left")).toBeVisible();
});

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
