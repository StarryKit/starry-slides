import { type Locator, type Page, expect, test } from "@playwright/test";
import {
  HERO_KICKER,
  MODIFIER,
  coverFrame,
  getComputedStyleValue,
  getHistoryControls,
  getInlineStyle,
  getRequiredBoundingBox,
  getSlideElementRect,
  gotoEditor,
} from "./helpers";

async function openSelectionContextMenu(page: Page) {
  const overlay = page.getByTestId("selection-overlay");
  await expect(overlay).toBeVisible();
  await overlay.click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Selection actions" });
  await expect(menu).toBeVisible();
  return menu;
}

test("context menu duplicates and deletes the selected element with undoable object semantics", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const copiedHeading = frame.locator('[data-editor-id="text-1-copy"]');

  await editableHeading.click();
  let menu = await openSelectionContextMenu(page);
  await menu.getByRole("menuitem", { name: /Duplicate/ }).click();

  await expect(copiedHeading).toHaveText(HERO_KICKER);
  await expect(page.getByTestId("selection-overlay")).toBeVisible();
  const originalRect = await getSlideElementRect(editableHeading);
  const copiedRect = await getSlideElementRect(copiedHeading);
  expect(copiedRect.x - originalRect.x).toBeCloseTo(24, 0);
  expect(copiedRect.y - originalRect.y).toBeCloseTo(24, 0);

  menu = await openSelectionContextMenu(page);
  await menu.getByRole("menuitem", { name: /Delete/ }).click();
  await expect(copiedHeading).toBeHidden();
  await expect(page.getByTestId("selection-overlay")).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(copiedHeading).toHaveText(HERO_KICKER);
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(copiedHeading).toBeHidden();
});

test("context menu layer and align commands mutate rendered order and position", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.click();
  let menu = await openSelectionContextMenu(page);
  await menu.getByText("Layer").hover();
  await page.getByRole("menuitem", { name: "Bring to front" }).click();
  await expectInlineStyleValue(editableHeading, "z-index", "999");

  menu = await openSelectionContextMenu(page);
  await menu.getByText("Align").hover();
  await page.getByRole("menuitem", { name: "Align left" }).click();

  const alignedRect = await getSlideElementRect(editableHeading);
  expect(alignedRect.x).toBeCloseTo(0, 0);

  await page.keyboard.press(`${MODIFIER}+Z`);
  const restoredRect = await getSlideElementRect(editableHeading);
  expect(restoredRect.x).toBeGreaterThan(0);
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  const redoneRect = await getSlideElementRect(editableHeading);
  expect(redoneRect.x).toBeCloseTo(0, 0);
});

test("context menu groups, ungroups, and preserves snap card dimensions", async ({ page }) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 12").click();

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editor-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editor-id="snap-card-b"]');
  await expect(firstCard).toBeVisible();
  await expect(secondCard).toBeVisible();
  await firstCard.evaluate((node) => node.ownerDocument.fonts?.ready ?? Promise.resolve());

  await firstCard.locator(".snap-drag-surface").click();
  await secondCard.locator(".snap-drag-surface").click({ modifiers: ["Shift"] });
  await expect(page.getByTestId("selection-overlay")).toBeVisible();
  const firstBefore = await getSlideElementRect(firstCard);
  const secondBefore = await getSlideElementRect(secondCard);
  let menu = await openSelectionContextMenu(page);
  await menu.getByRole("menuitem", { name: "Group", exact: true }).click();

  const group = frame.locator('[data-editor-id="group-1"]');
  await expect(group).toBeVisible();

  menu = await openSelectionContextMenu(page);
  await menu.getByRole("menuitem", { name: "Ungroup" }).click();

  await expect(group).toBeHidden();
  const firstAfter = await getSlideElementRect(firstCard);
  const secondAfter = await getSlideElementRect(secondCard);
  expect(firstAfter.width).toBeCloseTo(firstBefore.width, 0);
  expect(firstAfter.height).toBeCloseTo(firstBefore.height, 0);
  expect(secondAfter.width).toBeCloseTo(secondBefore.width, 0);
  expect(secondAfter.height).toBeCloseTo(secondBefore.height, 0);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(group).toBeVisible();
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(group).toBeHidden();
});

test("context menu ungroups a normal block by flattening direct editable children", async ({
  page,
}) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 15").click();

  const frame = coverFrame(page);
  const outerBlock = frame.locator('[data-editor-id="flatten-outer"]');
  const middleBlock = frame.locator('[data-editor-id="flatten-middle"]');
  const middleTitle = frame.locator('[data-editor-id="flatten-middle-title"]');
  const innerBlock = frame.locator('[data-editor-id="flatten-inner"]');
  const innerLabel = frame.locator('[data-editor-id="flatten-inner-label"]');
  await expect(outerBlock).toBeVisible();
  await expect(middleBlock).toBeVisible();
  await expect(innerBlock).toBeVisible();

  const outerBefore = await getSlideElementRect(outerBlock);
  const middleBefore = await getSlideElementRect(middleBlock);
  const middleTitleBefore = await getSlideElementRect(middleTitle);
  const innerBefore = await getSlideElementRect(innerBlock);
  const innerLabelBefore = await getSlideElementRect(innerLabel);
  const middleTitleStyleBefore = await getVisualStyle(middleTitle);
  const innerLabelStyleBefore = await getVisualStyle(innerLabel);

  await outerBlock.click({ position: { x: 12, y: 12 } });
  const menu = await openSelectionContextMenu(page);
  await expect(menu.getByRole("menuitem", { name: "Ungroup", exact: true })).not.toHaveAttribute(
    "data-disabled",
    ""
  );
  await menu.getByRole("menuitem", { name: "Ungroup", exact: true }).click();

  await expect
    .poll(async () =>
      middleBlock.evaluate(
        (node) =>
          node.parentElement ===
          node.ownerDocument.querySelector('[data-editor-id="flatten-outer"]')?.parentElement
      )
    )
    .toBe(true);
  await expect
    .poll(async () =>
      innerBlock.evaluate((node) => node.parentElement?.getAttribute("data-editor-id"))
    )
    .toBe("flatten-middle");
  await expect.poll(async () => outerBlock.evaluate((node) => node.children.length)).toBe(0);

  await expectSameRect(outerBlock, outerBefore);
  await expectSameRect(middleBlock, middleBefore);
  await expectSameRect(middleTitle, middleTitleBefore);
  await expectSameRect(innerBlock, innerBefore);
  await expectSameRect(innerLabel, innerLabelBefore);
  expect(await getVisualStyle(middleTitle)).toEqual(middleTitleStyleBefore);
  expect(await getVisualStyle(innerLabel)).toEqual(innerLabelStyleBefore);

  await page.getByTestId("stage-panel").click({ position: { x: 12, y: 12 } });
  await expect(page.getByTestId("selection-overlay")).toBeHidden();
  await middleBlock.click({ position: { x: 12, y: 12 } });
  await expect(page.getByTestId("selection-overlay")).toBeVisible();
  const secondMenu = await openSelectionContextMenu(page);
  await expect(
    secondMenu.getByRole("menuitem", { name: "Ungroup", exact: true })
  ).not.toHaveAttribute("data-disabled", "");
  await secondMenu.getByRole("menuitem", { name: "Ungroup", exact: true }).click();

  await expect
    .poll(async () =>
      innerBlock.evaluate(
        (node) =>
          node.parentElement ===
          node.ownerDocument.querySelector('[data-editor-id="flatten-middle"]')?.parentElement
      )
    )
    .toBe(true);
  await expect
    .poll(async () =>
      innerLabel.evaluate((node) => node.parentElement?.getAttribute("data-editor-id"))
    )
    .toBe("flatten-inner");

  await expectSameRect(outerBlock, outerBefore);
  await expectSameRect(middleBlock, middleBefore);
  await expectSameRect(middleTitle, middleTitleBefore);
  await expectSameRect(innerBlock, innerBefore);
  await expectSameRect(innerLabel, innerLabelBefore);
  expect(await getVisualStyle(middleTitle)).toEqual(middleTitleStyleBefore);
  expect(await getVisualStyle(innerLabel)).toEqual(innerLabelStyleBefore);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect
    .poll(async () =>
      innerBlock.evaluate((node) => node.parentElement?.getAttribute("data-editor-id"))
    )
    .toBe("flatten-middle");
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect
    .poll(async () =>
      middleBlock.evaluate((node) => node.parentElement?.getAttribute("data-editor-id"))
    )
    .toBe("flatten-outer");
});

test("context menu ungroups a card with list bullets without moving the list", async ({ page }) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 3").click();

  const frame = coverFrame(page);
  const card = frame.locator(".problem-card").first();
  const title = card.locator("strong");
  const body = card.locator("p");
  const list = card.locator("ul");
  const firstItem = list.locator("li").nth(0);
  const secondItem = list.locator("li").nth(1);
  const thirdItem = list.locator("li").nth(2);
  await expect(card).toBeVisible();
  await expect(list).toBeVisible();
  const cardId = await card.getAttribute("data-editor-id");
  const titleId = await title.getAttribute("data-editor-id");
  const bodyId = await body.getAttribute("data-editor-id");
  if (!cardId || !titleId || !bodyId) {
    throw new Error("Expected problem card and text children to have editor ids.");
  }

  const cardBefore = await getSlideElementRect(card);
  const titleBefore = await getSlideElementRect(title);
  const bodyBefore = await getSlideElementRect(body);
  const listBefore = await getSlideElementRect(list);
  const firstItemBefore = await getSlideElementRect(firstItem);
  const secondItemBefore = await getSlideElementRect(secondItem);
  const thirdItemBefore = await getSlideElementRect(thirdItem);
  const firstItemStyleBefore = await getVisualStyle(firstItem);

  await card.click({ position: { x: 12, y: 12 } });
  const menu = await openSelectionContextMenu(page);
  await expect(menu.getByRole("menuitem", { name: "Ungroup", exact: true })).not.toHaveAttribute(
    "data-disabled",
    ""
  );
  await menu.getByRole("menuitem", { name: "Ungroup", exact: true }).click();

  const slideList = frame.locator('ul[data-editable="block"]').first();
  const slideFirstItem = slideList.locator("li").nth(0);
  const slideSecondItem = slideList.locator("li").nth(1);
  const slideThirdItem = slideList.locator("li").nth(2);
  await expect(slideList).toBeVisible();
  await expect
    .poll(async () =>
      slideList.evaluate(
        (node) =>
          node.parentElement === node.ownerDocument.querySelector(".problem-card")?.parentElement
      )
    )
    .toBe(true);
  await expect
    .poll(async () => slideFirstItem.evaluate((node) => node.parentElement?.tagName))
    .toBe("UL");

  const promotedCard = frame.locator(`[data-editor-id="${cardId}"]`);
  const promotedTitle = frame.locator(`[data-editor-id="${titleId}"]`);
  const promotedBody = frame.locator(`[data-editor-id="${bodyId}"]`);
  await expectSameRect(promotedCard, cardBefore);
  await expectSameRect(promotedTitle, titleBefore);
  await expectSameRect(promotedBody, bodyBefore);
  await expectSameRect(slideList, listBefore);
  await expectSameRect(slideFirstItem, firstItemBefore);
  await expectSameRect(slideSecondItem, secondItemBefore);
  await expectSameRect(slideThirdItem, thirdItemBefore);
  expect(await getVisualStyle(slideFirstItem)).toEqual(firstItemStyleBefore);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect
    .poll(async () => list.evaluate((node) => node.parentElement?.className))
    .toContain("problem-card");
});

test("context menu distributes three selected snap cards horizontally", async ({ page }) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 12").click();

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editor-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editor-id="snap-card-b"]');
  const thirdCard = frame.locator('[data-editor-id="snap-card-c"]');

  await firstCard.locator(".snap-drag-surface").click();
  await secondCard.locator(".snap-drag-surface").click({ modifiers: ["Shift"] });
  await thirdCard.locator(".snap-drag-surface").click({ modifiers: ["Shift"] });
  const secondBefore = await getSlideElementRect(secondCard);

  const menu = await openSelectionContextMenu(page);
  await menu.getByText("Distribute").hover();
  await page.getByRole("menuitem", { name: "Horizontally" }).click();

  const firstAfter = await getSlideElementRect(firstCard);
  const secondAfter = await getSlideElementRect(secondCard);
  const thirdAfter = await getSlideElementRect(thirdCard);
  const firstCenter = firstAfter.x + firstAfter.width / 2;
  const secondCenter = secondAfter.x + secondAfter.width / 2;
  const thirdCenter = thirdAfter.x + thirdAfter.width / 2;
  expect(Math.abs(secondCenter - (firstCenter + thirdCenter) / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(secondAfter.x - secondBefore.x)).toBeGreaterThan(1);

  await page.keyboard.press(`${MODIFIER}+Z`);
  const secondRestored = await getSlideElementRect(secondCard);
  expect(secondRestored.x).toBeCloseTo(secondBefore.x, 0);
});

test("context menu disables irrelevant group commands for a normal single block", async ({
  page,
}) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 5").click();

  const frame = coverFrame(page);
  const blockCard = frame.locator('table[data-editable="block"]');
  const { selectionOverlay } = getHistoryControls(page);

  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeVisible();
  const menu = await openSelectionContextMenu(page);

  await expect(menu.getByRole("menuitem", { name: "Group", exact: true })).toHaveAttribute(
    "data-disabled",
    ""
  );
  await expect(menu.getByRole("menuitem", { name: "Ungroup", exact: true })).toHaveAttribute(
    "data-disabled",
    ""
  );
});

async function expectInlineStyleValue(
  locator: Locator,
  propertyName: string,
  expectedValue: string
) {
  await expect
    .poll(async () => getInlineStyle(locator, propertyName), { timeout: 2500 })
    .toBe(expectedValue);
}

async function getVisualStyle(locator: Locator) {
  const [color, fontSize, fontWeight, lineHeight] = await Promise.all([
    getComputedStyleValue(locator, "color"),
    getComputedStyleValue(locator, "font-size"),
    getComputedStyleValue(locator, "font-weight"),
    getComputedStyleValue(locator, "line-height"),
  ]);

  return { color, fontSize, fontWeight, lineHeight };
}

async function expectSameRect(
  locator: Locator,
  expectedRect: Awaited<ReturnType<typeof getSlideElementRect>>
) {
  const actualRect = await getSlideElementRect(locator);
  expect(actualRect.x).toBeCloseTo(expectedRect.x, 0);
  expect(actualRect.y).toBeCloseTo(expectedRect.y, 0);
  expect(actualRect.width).toBeCloseTo(expectedRect.width, 0);
  expect(actualRect.height).toBeCloseTo(expectedRect.height, 0);
}
