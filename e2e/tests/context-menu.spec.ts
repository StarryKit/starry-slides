import { type Locator, type Page, expect, test } from "@playwright/test";
import {
  HERO_KICKER,
  MODIFIER,
  coverFrame,
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

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
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
