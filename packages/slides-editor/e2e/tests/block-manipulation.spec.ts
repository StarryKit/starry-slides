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
  getInlineStyle,
  getRequiredBoundingBox,
  gotoEditor,
  selectAllAndFill,
} from "./helpers";

test("double clicking a non-text element does not enter text editing", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editable-id="block-4"]');

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
  const blockCard = frame.locator('[data-editable-id="block-4"]');
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
  const blockCard = frame.locator('[data-editable-id="block-4"]');
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
    x: overlayBefore.x + 12,
    y: overlayBefore.y + 12,
  };
  const end = {
    x: start.x + 80,
    y: start.y + 60,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });

  const duringDrag = await blockCard.boundingBox();
  expect(duringDrag).not.toBeNull();
  if (!duringDrag) {
    throw new Error("Expected selected block to have bounds during dragging.");
  }
  expect(duringDrag.x).toBeGreaterThan(before.x + 30);
  expect(duringDrag.y).toBeGreaterThan(before.y + 20);

  await page.mouse.up();

  const after = await blockCard.boundingBox();
  const overlayAfter = await selectionOverlay.boundingBox();
  expect(after).not.toBeNull();
  expect(overlayAfter).not.toBeNull();

  if (!after || !overlayAfter) {
    throw new Error("Expected selected block and overlay to have bounds after dragging.");
  }

  expect(after.x).toBeGreaterThan(before.x + 30);
  expect(after.y).toBeGreaterThan(before.y + 20);
  expect(overlayAfter.x).toBeGreaterThan(overlayBefore.x + 30);
  expect(overlayAfter.y).toBeGreaterThan(overlayBefore.y + 20);
  await expect(page.getByTestId("selection-overlay")).toHaveCount(1);
});

test("selected text element can be moved by dragging the same selection overlay", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const textElement = frame.locator('[data-editable-id="text-1"]');
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

  await expect
    .poll(async () => getComputedStyleValue(textElement, "transform"), { timeout: 1000 })
    .not.toBe("none");
  const duringDrag = await textElement.boundingBox();
  expect(duringDrag).not.toBeNull();
  if (!duringDrag) {
    throw new Error("Expected selected text element to have bounds during dragging.");
  }
  expect(duringDrag.x).toBeGreaterThan(before.x + 25);
  expect(duringDrag.y).toBeGreaterThan(before.y + 12);

  await page.mouse.up();

  const after = await textElement.boundingBox();
  const overlayAfter = await selectionOverlay.boundingBox();
  expect(after).not.toBeNull();
  expect(overlayAfter).not.toBeNull();

  if (!after || !overlayAfter) {
    throw new Error("Expected selected text element and overlay to have bounds after dragging.");
  }

  expect(after.x).toBeGreaterThan(before.x + 25);
  expect(after.y).toBeGreaterThan(before.y + 12);
  expect(overlayAfter.x).toBeGreaterThan(overlayBefore.x + 25);
  expect(overlayAfter.y).toBeGreaterThan(overlayBefore.y + 12);
  await expect(page.getByTestId("selection-overlay")).toHaveCount(1);
});

test("selected image can be moved by dragging the same selection overlay", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await page.getByLabel("Slide 7").click();
  const imageElement = frame.locator('[data-editable-id="image-5"]');
  const { selectionOverlay } = getHistoryControls(page);

  await expect(imageElement).toBeVisible();
  await imageElement.click({ position: { x: 24, y: 24 } });
  await expect(selectionOverlay).toBeVisible();

  const before = await imageElement.boundingBox();
  const overlayBefore = await selectionOverlay.boundingBox();
  expect(before).not.toBeNull();
  expect(overlayBefore).not.toBeNull();

  if (!before || !overlayBefore) {
    throw new Error("Expected selected image and overlay to have bounds before dragging.");
  }

  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };
  const end = {
    x: start.x + 80,
    y: start.y + 44,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await expect
    .poll(async () => getComputedStyleValue(imageElement, "transform"), { timeout: 1000 })
    .not.toBe("none");
  await page.mouse.up();

  const after = await imageElement.boundingBox();
  const overlayAfter = await selectionOverlay.boundingBox();
  expect(after).not.toBeNull();
  expect(overlayAfter).not.toBeNull();

  if (!after || !overlayAfter) {
    throw new Error("Expected selected image and overlay to have bounds after dragging.");
  }

  expect(after.x).toBeGreaterThan(before.x + 30);
  expect(after.y).toBeGreaterThan(before.y + 15);
  expect(overlayAfter.x).toBeGreaterThan(overlayBefore.x + 30);
  expect(overlayAfter.y).toBeGreaterThan(overlayBefore.y + 15);
  await expect(page.getByTestId("selection-overlay")).toHaveCount(1);
});

test("dragging a selected block snaps its edge to a sibling edge guide", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await page.getByLabel("Slide 12").click();
  const siblingBlock = frame.locator('[data-editable-id="snap-card-b"]');
  const movingBlock = frame.locator('[data-editable-id="snap-card-c"]');
  const { selectionOverlay } = getHistoryControls(page);

  await movingBlock.locator(".snap-drag-surface").click();
  await expect(selectionOverlay).toBeVisible();

  const siblingBefore = await getRequiredBoundingBox(siblingBlock, "sibling block");
  const movingBefore = await getRequiredBoundingBox(movingBlock, "moving block before snapping");
  await getRequiredBoundingBox(selectionOverlay, "selection overlay");
  const dragSurface = await getRequiredBoundingBox(
    movingBlock.locator(".snap-drag-surface"),
    "moving block drag surface"
  );
  const siblingRightEdge = siblingBefore.x + siblingBefore.width;
  const start = {
    x: dragSurface.x + dragSurface.width / 2,
    y: dragSurface.y + dragSurface.height / 2,
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
  const movingBlock = frame.locator('[data-editable-id="snap-card-d"]');
  const nearerBlock = frame.locator('[data-editable-id="snap-card-c"]');
  const fartherBlock = frame.locator('[data-editable-id="snap-card-b"]');
  const { selectionOverlay } = getHistoryControls(page);

  await movingBlock.locator(".snap-drag-surface").click();
  await expect(selectionOverlay).toBeVisible();

  const movingBefore = await getRequiredBoundingBox(movingBlock, "moving block before snapping");
  const nearerBefore = await getRequiredBoundingBox(nearerBlock, "nearer block before snapping");
  const fartherBefore = await getRequiredBoundingBox(fartherBlock, "farther block before snapping");
  await getRequiredBoundingBox(selectionOverlay, "selection overlay");
  const dragSurface = await getRequiredBoundingBox(
    movingBlock.locator(".snap-drag-surface"),
    "moving block drag surface"
  );

  const start = {
    x: dragSurface.x + dragSurface.width / 2,
    y: dragSurface.y + dragSurface.height / 2,
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
  const firstBlock = frame.locator('[data-editable-id="snap-card-a"]');
  const secondBlock = frame.locator('[data-editable-id="snap-card-b"]');
  const movingBlock = frame.locator('[data-editable-id="snap-card-c"]');
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
    x: overlayBefore.x + 12,
    y: overlayBefore.y + 12,
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
  const blockCard = frame.locator('[data-editable-id="block-4"]');
  const { selectionOverlay } = getHistoryControls(page);
  const { floatingToolbarAnchor } = getHeaderControls(page);
  const resizeHandle = page.getByTestId("block-resize-handle-bottom-right");
  const rotateZone = page.getByTestId("block-rotation-zone-bottom-right");

  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeVisible();
  await expect(floatingToolbarAnchor).toBeVisible();
  await expect(resizeHandle).toBeVisible();
  await expect(rotateZone).toBeVisible();

  const overlayBefore = await selectionOverlay.boundingBox();
  if (!overlayBefore) {
    throw new Error("Expected selection overlay to have bounds before dragging.");
  }

  const start = {
    x: overlayBefore.x + 12,
    y: overlayBefore.y + 12,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(floatingToolbarAnchor).toBeHidden();
  await page.mouse.move(start.x + 8, start.y + 6, { steps: 2 });
  await expect(resizeHandle).toHaveCount(0);
  await expect(rotateZone).toHaveCount(0);
  await page.mouse.move(start.x + 40, start.y + 30, { steps: 4 });
  await page.mouse.up();
  await expect(floatingToolbarAnchor).toBeVisible();
  await expect(resizeHandle).toBeVisible();
  await expect(rotateZone).toBeVisible();
});

test("after dragging and clearing selection, clicking the same element selects it again", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editable-id="block-4"]');
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

test("dragging a different element immediately after a drag moves the pointer target", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await page.getByLabel("Slide 12").click();
  const firstBlock = frame.locator('[data-editable-id="snap-card-a"]');
  const secondBlock = frame.locator('[data-editable-id="snap-card-b"]');
  const { selectionOverlay } = getHistoryControls(page);

  await firstBlock.locator(".snap-drag-surface").click();
  await expect(selectionOverlay).toBeVisible();

  const firstBefore = await getRequiredBoundingBox(firstBlock, "first block before first drag");
  await getRequiredBoundingBox(selectionOverlay, "first block overlay");
  const firstDragSurface = await getRequiredBoundingBox(
    firstBlock.locator(".snap-drag-surface"),
    "first block drag surface"
  );
  const firstDragStart = {
    x: firstDragSurface.x + firstDragSurface.width / 2,
    y: firstDragSurface.y + firstDragSurface.height / 2,
  };

  await page.mouse.move(firstDragStart.x, firstDragStart.y);
  await page.mouse.down();
  await page.mouse.move(firstDragStart.x + 70, firstDragStart.y + 25, { steps: 6 });
  await page.mouse.up();

  const firstAfterFirstDrag = await getRequiredBoundingBox(
    firstBlock,
    "first block after first drag"
  );
  const secondBefore = await getRequiredBoundingBox(secondBlock, "second block before direct drag");
  expect(firstAfterFirstDrag.x).toBeGreaterThan(firstBefore.x + 35);

  const secondDragSurface = await getRequiredBoundingBox(
    secondBlock.locator(".snap-drag-surface"),
    "second block drag surface"
  );
  const secondDragStart = {
    x: secondDragSurface.x + secondDragSurface.width / 2,
    y: secondDragSurface.y + secondDragSurface.height / 2,
  };

  await page.mouse.move(secondDragStart.x, secondDragStart.y);
  await page.mouse.down();
  await page.mouse.move(secondDragStart.x + 85, secondDragStart.y + 30, { steps: 8 });
  await page.mouse.up();

  const firstAfterSecondDrag = await getRequiredBoundingBox(
    firstBlock,
    "first block after second drag"
  );
  const secondAfter = await getRequiredBoundingBox(secondBlock, "second block after direct drag");

  expect(secondAfter.x).toBeGreaterThan(secondBefore.x + 40);
  expect(secondAfter.y).toBeGreaterThan(secondBefore.y + 12);
  expect(Math.abs(firstAfterSecondDrag.x - firstAfterFirstDrag.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(firstAfterSecondDrag.y - firstAfterFirstDrag.y)).toBeLessThanOrEqual(2);
});

test("all eight resize handles are visible for a selected element", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editable-id="block-4"]');

  await blockCard.click({ position: { x: 12, y: 12 } });

  await expect(page.getByTestId("block-resize-handle-top-left")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-top-center")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-top-right")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-right-center")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-bottom-right")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-bottom-center")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-bottom-left")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-left-center")).toBeVisible();
});

test("edge handle resizes only horizontally", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editable-id="block-4"]');
  const rightHandle = page.getByTestId("block-resize-handle-right-center");

  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(rightHandle).toBeVisible();

  const before = await getRequiredBoundingBox(blockCard, "block before right-edge resize");
  const handleBefore = await getRequiredBoundingBox(rightHandle, "right edge resize handle");
  const resizeStart = {
    x: handleBefore.x + handleBefore.width / 2,
    y: handleBefore.y + handleBefore.height / 2,
  };

  await rightHandle.dispatchEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    clientX: resizeStart.x,
    clientY: resizeStart.y,
  });
  await page.keyboard.down("Alt");
  await page.mouse.move(resizeStart.x + 120, resizeStart.y + 80, { steps: 8 });
  await page.keyboard.up("Alt");
  await page.mouse.up();

  const afterHorizontal = await getRequiredBoundingBox(blockCard, "block after right-edge resize");
  expect(afterHorizontal.width).toBeGreaterThan(before.width + 60);
  expect(Math.abs(afterHorizontal.x - before.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(afterHorizontal.y - before.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(afterHorizontal.height - before.height)).toBeLessThanOrEqual(2);
});

test("edge handle resizes only vertically", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editable-id="block-4"]');

  const topHandle = page.getByTestId("block-resize-handle-top-center");
  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(topHandle).toBeVisible();
  const beforeVertical = await getRequiredBoundingBox(blockCard, "block before top-edge resize");
  const topHandleBefore = await getRequiredBoundingBox(topHandle, "top edge resize handle");
  const topResizeStart = {
    x: topHandleBefore.x + topHandleBefore.width / 2,
    y: topHandleBefore.y + topHandleBefore.height / 2,
  };

  await topHandle.dispatchEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    clientX: topResizeStart.x,
    clientY: topResizeStart.y,
  });
  await page.keyboard.down("Alt");
  await page.mouse.move(topResizeStart.x + 80, topResizeStart.y - 90, { steps: 8 });
  await page.keyboard.up("Alt");
  await page.mouse.up();

  const afterVertical = await getRequiredBoundingBox(blockCard, "block after top-edge resize");
  expect(afterVertical.height).toBeGreaterThan(beforeVertical.height + 45);
  expect(Math.abs(afterVertical.x - beforeVertical.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(afterVertical.width - beforeVertical.width)).toBeLessThanOrEqual(2);
  expect(
    Math.abs(afterVertical.y + afterVertical.height - (beforeVertical.y + beforeVertical.height))
  ).toBeLessThanOrEqual(2);
});

test("corner rotation zone triggers rotation", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editable-id="block-4"]');
  const rotateZone = page.getByTestId("block-rotation-zone-bottom-right");

  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(rotateZone).toBeVisible();

  const before = await getRequiredBoundingBox(blockCard, "block before corner rotation");
  const zoneBefore = await getRequiredBoundingBox(rotateZone, "corner rotation zone");
  const rotationStart = {
    x: zoneBefore.x + zoneBefore.width / 2,
    y: zoneBefore.y + zoneBefore.height / 2,
  };

  await rotateZone.dispatchEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    clientX: rotationStart.x,
    clientY: rotationStart.y,
  });
  await page.mouse.move(rotationStart.x - 120, rotationStart.y + 40, { steps: 8 });

  await expect
    .poll(async () => getComputedStyleValue(blockCard, "transform"), { timeout: 1000 })
    .not.toBe("none");
  await page.mouse.up();

  const after = await getRequiredBoundingBox(blockCard, "block after corner rotation");
  const transform = await getComputedStyleValue(blockCard, "transform");
  expect(transform).not.toBe("none");
  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(60);
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(60);
});

test("resizing a flow-layout title keeps it in document layout", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const title = frame.locator('[data-editable-id="text-2"]');
  const summary = frame.locator('[data-editable-id="text-3"]');
  const resizeHandle = page.getByTestId("block-resize-handle-bottom-right");

  await title.click({ position: { x: 16, y: 16 } });
  await expect(resizeHandle).toBeVisible();

  const titleBefore = await getRequiredBoundingBox(title, "title before resize");
  const summaryBefore = await getRequiredBoundingBox(summary, "summary before resize");
  const initialPositionStyle = await getInlineStyle(title, "position");
  const handleBefore = await getRequiredBoundingBox(resizeHandle, "title resize handle");
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
  await page.mouse.move(resizeStart.x + 160, resizeStart.y + 60, { steps: 8 });
  await page.keyboard.up("Alt");

  const titleDuring = await getRequiredBoundingBox(title, "title during resize");
  const summaryDuring = await getRequiredBoundingBox(summary, "summary during resize");
  expect(await getInlineStyle(title, "position")).toBe(initialPositionStyle);
  expect(Math.abs(titleDuring.x - titleBefore.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(titleDuring.y - titleBefore.y)).toBeLessThanOrEqual(2);
  expect(summaryDuring.y).toBeGreaterThanOrEqual(summaryBefore.y - 2);

  await page.mouse.up();

  const titleAfter = await getRequiredBoundingBox(title, "title after resize");
  const summaryAfter = await getRequiredBoundingBox(summary, "summary after resize");
  expect(await getInlineStyle(title, "position")).toBe(initialPositionStyle);
  expect(await getInlineStyle(title, "left")).toBe("");
  expect(await getInlineStyle(title, "top")).toBe("");
  expect(titleAfter.width).toBeGreaterThan(titleBefore.width + 50);
  expect(titleAfter.height).toBeGreaterThan(titleBefore.height + 20);
  expect(Math.abs(titleAfter.x - titleBefore.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(titleAfter.y - titleBefore.y)).toBeLessThanOrEqual(2);
  expect(summaryAfter.y).toBeGreaterThanOrEqual(summaryBefore.y - 2);
});
