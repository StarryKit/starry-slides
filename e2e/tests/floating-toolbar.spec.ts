import { expect, test } from "@playwright/test";
import {
  MODIFIER,
  clickFloatingToolbarButton,
  coverFrame,
  createGroupFromSnapCards,
  expectInlineStyle,
  getComputedStyleValue,
  getHeaderControls,
  getHistoryControls,
  getSlideElementRect,
  gotoEditor,
  selectFontFamilyOption,
} from "./helpers";

test("full floating editor applies typography and paragraph controls", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableHeading.click();
  await expect(toolbar.getByLabel("Font", { exact: true })).toBeVisible();
  await selectFontFamilyOption(page, editableHeading, "Georgia", /Georgia|Times New Roman|serif/);

  const originalFontSize = Number.parseFloat(
    await getComputedStyleValue(editableHeading, "font-size")
  );
  await toolbar.getByRole("button", { name: "Increase font size", exact: true }).click();
  await expectInlineStyle(editableHeading, "font-size", `${originalFontSize + 2}px`);

  await toolbar.getByRole("button", { name: "Bold", exact: true }).click();
  await expectInlineStyle(editableHeading, "font-weight", "400");
  await toolbar.getByRole("button", { name: "Italic", exact: true }).click();
  await expectInlineStyle(editableHeading, "font-style", "italic");
  await toolbar.getByRole("button", { name: "Underline", exact: true }).click();
  await expectInlineStyle(editableHeading, "text-decoration-line", "underline");
  await toolbar.getByRole("button", { name: "Strikethrough", exact: true }).click();
  await expectInlineStyle(editableHeading, "text-decoration-line", "underline line-through");

  await toolbar.getByRole("button", { name: "Line height", exact: true }).click();
  await page.getByRole("button", { name: "Relaxed", exact: true }).click();
  await expectInlineStyle(editableHeading, "line-height", "1.45");
  await toolbar.getByRole("button", { name: "Line height", exact: true }).click();
  await page.getByLabel("Custom line height", { exact: true }).fill("1.33");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expectInlineStyle(editableHeading, "line-height", "1.33");

  await toolbar.getByRole("button", { name: "Text align", exact: true }).click();
  await page.getByRole("button", { name: "Center", exact: true }).click();
  await expectInlineStyle(editableHeading, "text-align", "center");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expectInlineStyle(editableHeading, "text-align", "");
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expectInlineStyle(editableHeading, "text-align", "center");
});

test("full floating editor applies color and border controls", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableHeading.click();
  await toolbar.getByRole("button", { name: "Text color", exact: true }).click();
  await page.getByRole("button", { name: "Use Text color #3B82F6", exact: true }).click();
  await expectInlineStyle(editableHeading, "color", "rgb(59, 130, 246)");

  await toolbar.getByRole("button", { name: "Background color", exact: true }).click();
  await page.getByRole("button", { name: "Use Background color gradient 1", exact: true }).click();
  await expectInlineStyle(
    editableHeading,
    "background-image",
    "linear-gradient(135deg, rgb(168, 85, 247), rgb(236, 72, 153))"
  );

  await toolbar.getByRole("button", { name: "Border style", exact: true }).click();
  await page.getByRole("button", { name: "Strong", exact: true }).click();
  await expectInlineStyle(editableHeading, "border", "2px solid rgba(15, 23, 42, 0.22)");
  await toolbar.getByRole("button", { name: "Border radius", exact: true }).click();
  await page.getByRole("button", { name: "Round", exact: true }).click();
  await expectInlineStyle(editableHeading, "border-radius", "18px");
  await toolbar.getByRole("button", { name: "Border radius", exact: true }).click();
  await page.getByLabel("Custom radius", { exact: true }).fill("24");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expectInlineStyle(editableHeading, "border-radius", "24px");

  await toolbar.getByRole("button", { name: "Shadow", exact: true }).click();
  await page.getByRole("button", { name: "Lifted", exact: true }).click();
  await expectInlineStyle(editableHeading, "box-shadow", "rgba(15, 23, 42, 0.18) 0px 18px 42px");
});

test("floating toolbar font family select changes the selected text font", async ({ page }) => {
  await gotoEditor(page);

  const editableHeading = coverFrame(page).locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableHeading.click();
  await expect(toolbar).toBeVisible();
  const beforeFont = await getComputedStyleValue(editableHeading, "font-family");

  await selectFontFamilyOption(page, editableHeading, "Georgia", /Georgia|Times New Roman|serif/);

  await expectInlineStyle(editableHeading, "font-family", 'Georgia, "Times New Roman", serif');
  const afterFont = await getComputedStyleValue(editableHeading, "font-family");
  expect(afterFont).not.toBe(beforeFont);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expectInlineStyle(editableHeading, "font-family", "");
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expectInlineStyle(editableHeading, "font-family", 'Georgia, "Times New Roman", serif');
});

test("full floating editor applies other attributes through dialogs", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableHeading.click();
  await toolbar.getByRole("button", { name: "Other", exact: true }).click();
  await page.getByRole("button", { name: "Lock", exact: true }).click();
  await expect(editableHeading).toHaveAttribute("data-editor-locked", "true");

  await toolbar.getByRole("button", { name: "Other", exact: true }).click();
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("https://example.com/deck");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editableHeading).toHaveAttribute("data-link-url", "https://example.com/deck");

  await toolbar.getByRole("button", { name: "Other", exact: true }).click();
  await page.getByRole("button", { name: "Alt text", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Hero kicker text");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editableHeading).toHaveAttribute("alt", "Hero kicker text");

  await toolbar.getByRole("button", { name: "Other", exact: true }).click();
  await page.getByRole("button", { name: "ARIA label", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Hero kicker label");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editableHeading).toHaveAttribute("aria-label", "Hero kicker label");

  const { savingBadge } = getHeaderControls(page);
  await expect(savingBadge).toBeVisible();
  await expect(savingBadge).toBeHidden();
  await page.reload();
  const reloadedHeading = coverFrame(page).locator('[data-editor-id="text-1"]');
  await expect(reloadedHeading).toHaveAttribute("data-link-url", "https://example.com/deck");
  await expect(reloadedHeading).toHaveAttribute("alt", "Hero kicker text");
  await expect(reloadedHeading).toHaveAttribute("aria-label", "Hero kicker label");
});

test("full floating editor is the only primary element tooling surface", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const stagePanel = page.getByTestId("stage-panel");
  const { floatingToolbarAnchor } = getHeaderControls(page);

  await expect(floatingToolbarAnchor).toBeHidden();
  await expect(page.getByTestId("sidebar-tool-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use tool panel mode", exact: true })).toHaveCount(
    0
  );

  await editableHeading.click();
  await expect(floatingToolbarAnchor).toBeVisible();
  await expect(floatingToolbarAnchor.getByLabel("Font", { exact: true })).toBeVisible();
  await expect(
    floatingToolbarAnchor.getByRole("button", { name: "Align", exact: true })
  ).toBeHidden();
  await expect(page.getByRole("button", { name: "Use tool panel mode", exact: true })).toHaveCount(
    0
  );
  await expect(page.getByTestId("sidebar-tool-panel")).toHaveCount(0);

  await stagePanel.click({ position: { x: 12, y: 12 } });
  await expect(floatingToolbarAnchor).toBeHidden();
});

test("multi selection exposes align, layer, distribute, and group controls", async ({ page }) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 12").click();

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editor-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editor-id="snap-card-b"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const { selectionOverlay } = getHistoryControls(page);

  await firstCard.locator(".snap-drag-surface").click();
  await secondCard.locator(".snap-drag-surface").click({ modifiers: ["Shift"] });
  await expect(selectionOverlay).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Align", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Layer", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Distribute", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Group", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Duplicate", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Delete", exact: true })).toBeHidden();

  await toolbar.getByRole("button", { name: "Align", exact: true }).click();
  await page.getByRole("button", { name: "Align left", exact: true }).click();

  await toolbar.getByRole("button", { name: "Group", exact: true }).click();
  await expect(frame.locator('[data-editor-id="group-1"]')).toBeVisible();
});

test("floating toolbar ungroup promotes snap cards without changing their dimensions", async ({
  page,
}) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 12").click();

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editor-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editor-id="snap-card-b"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  await expect(firstCard).toBeVisible();
  await expect(secondCard).toBeVisible();
  await firstCard.evaluate((node) => node.ownerDocument.fonts?.ready ?? Promise.resolve());

  await firstCard.locator(".snap-drag-surface").click();
  await secondCard.locator(".snap-drag-surface").click({ modifiers: ["Shift"] });
  const firstBefore = await getSlideElementRect(firstCard);
  const secondBefore = await getSlideElementRect(secondCard);

  await toolbar.getByRole("button", { name: "Group", exact: true }).click();
  await toolbar.getByRole("button", { name: "Ungroup", exact: true }).click();

  await expect(frame.locator('[data-editor-id="group-1"]')).toBeHidden();
  const firstAfter = await getSlideElementRect(firstCard);
  const secondAfter = await getSlideElementRect(secondCard);
  expect(firstAfter.width).toBeCloseTo(firstBefore.width, 0);
  expect(firstAfter.height).toBeCloseTo(firstBefore.height, 0);
  expect(secondAfter.width).toBeCloseTo(secondBefore.width, 0);
  expect(secondAfter.height).toBeCloseTo(secondBefore.height, 0);
});

test("floating toolbar flattens selected groups into a new group without resizing cards", async ({
  page,
}) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 12").click();

  const frame = coverFrame(page);
  const cardA = frame.locator('[data-editor-id="snap-card-a"]');
  const cardB = frame.locator('[data-editor-id="snap-card-b"]');
  const cardC = frame.locator('[data-editor-id="snap-card-c"]');
  const cardD = frame.locator('[data-editor-id="snap-card-d"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const before = await Promise.all([cardA, cardB, cardC, cardD].map((card) => card.boundingBox()));
  for (const box of before) {
    expect(box).not.toBeNull();
  }

  await createGroupFromSnapCards(page, ["snap-card-a", "snap-card-b"]);
  const firstGroup = frame.locator('[data-editor-id="group-1"]');
  await createGroupFromSnapCards(page, ["snap-card-c", "snap-card-d"]);
  const secondGroup = frame.locator('[data-editor-id="group-2"]');

  await firstGroup.click({ position: { x: 8, y: 8 } });
  await secondGroup.click({ modifiers: ["Shift"], position: { x: 8, y: 8 } });
  await toolbar.getByRole("button", { name: "Group", exact: true }).click();

  await expect(frame.locator('[data-editor-id="group-3"]')).toBeVisible();
  const after = await Promise.all([cardA, cardB, cardC, cardD].map((card) => card.boundingBox()));
  for (const [index, box] of after.entries()) {
    expect(box).not.toBeNull();
    expect(box?.width).toBeCloseTo(before[index]?.width ?? 0, 0);
    expect(box?.height).toBeCloseTo(before[index]?.height ?? 0, 0);
  }
});

test("floating toolbar font size buttons do not remount the toolbar", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableHeading.click();
  await expect(toolbar).toBeVisible();
  const originalFontSize = await getComputedStyleValue(editableHeading, "font-size");
  const expectedFontSize = `${Number.parseFloat(originalFontSize) + 2}px`;

  await toolbar.getByRole("button", { name: "Increase font size", exact: true }).click();
  await expectInlineStyle(editableHeading, "font-size", expectedFontSize);
  await editableHeading.click();
  await expect(toolbar.getByLabel("Font", { exact: true })).toBeVisible();
});
