import { type Locator, expect, test } from "@playwright/test";
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
  await toolbar.getByLabel("Font size", { exact: true }).fill("44");
  await expectInlineStyle(editableHeading, "font-size", "44px");

  await toolbar.getByRole("button", { name: "Bold", exact: true }).click();
  await expectInlineStyle(editableHeading, "font-weight", "400");
  await toolbar.getByRole("button", { name: "Italic", exact: true }).click();
  await expectInlineStyle(editableHeading, "font-style", "italic");
  await toolbar.getByRole("button", { name: "Underline", exact: true }).click();
  await expectInlineStyle(editableHeading, "text-decoration-line", "underline");
  await toolbar.getByRole("button", { name: "Strikethrough", exact: true }).click();
  await expectInlineStyle(editableHeading, "text-decoration-line", "underline line-through");

  await toolbar.getByRole("button", { name: "Line height", exact: true }).click();
  const lineHeightSlider = page.getByRole("slider", { name: "Line height", exact: true });
  await expect(lineHeightSlider).toBeVisible();
  await expect(page.getByRole("button", { name: "Relaxed", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Custom line height", { exact: true })).toHaveCount(0);
  await expect(lineHeightSlider).toHaveAttribute("min", "0.8");
  await expect(lineHeightSlider).toHaveAttribute("max", "2.4");
  await expect(lineHeightSlider).toHaveAttribute("step", "0.01");
  await expect(lineHeightSlider).not.toHaveValue("2.4");
  await lineHeightSlider.fill("1.35");
  await expectInlineStyle(editableHeading, "line-height", "1.35");
  await lineHeightSlider.press("ArrowRight");
  await expectInlineStyle(editableHeading, "line-height", "1.36");
  await page.keyboard.press("Escape");
  await expect(lineHeightSlider).toBeHidden();
  await toolbar.getByRole("button", { name: "Line height", exact: true }).click();
  await expect(lineHeightSlider).toHaveValue("1.36");

  await toolbar.getByRole("button", { name: "Text align", exact: true }).click();
  const centerAlign = page.getByRole("button", { name: "Center", exact: true });
  await expect(centerAlign).toBeVisible();
  await centerAlign.hover();
  await expectInlineStyle(editableHeading, "text-align", "center");
  await page.mouse.move(0, 0);
  await expectInlineStyle(editableHeading, "text-align", "");
  await centerAlign.hover();
  await centerAlign.click();
  await expectInlineStyle(editableHeading, "text-align", "center");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expectInlineStyle(editableHeading, "text-align", "");
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expectInlineStyle(editableHeading, "text-align", "center");
});

test("line height slider reflects computed and committed line-height state", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const title = frame.locator('[data-editor-id="text-2"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await title.click();
  await toolbar.getByRole("button", { name: "Line height", exact: true }).click();
  const lineHeightSlider = page.getByRole("slider", { name: "Line height", exact: true });
  await expect(lineHeightSlider).toBeVisible();
  await expect(lineHeightSlider).toHaveValue("0.92");

  await lineHeightSlider.fill("1.3");
  await expectInlineStyle(title, "line-height", "1.3");
  await page.keyboard.press("Escape");
  await expect(lineHeightSlider).toBeHidden();
  await toolbar.getByRole("button", { name: "Line height", exact: true }).click();
  await expect(lineHeightSlider).toHaveValue("1.3");
});

test("full floating editor applies color and border controls", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableHeading.evaluate((node) => {
    (node as HTMLElement).style.color = "rgba(59, 130, 246, 0.5)";
  });
  await editableHeading.click();
  await toolbar.getByRole("button", { name: "Text color", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Gradient", exact: true })).toHaveCount(0);
  const textColorPanel = page.locator('[data-slot="popover-content"]');
  await expect(textColorPanel.getByRole("textbox")).toHaveValue("3B82F6");
  await expect(textColorPanel.getByRole("slider", { name: "Opacity", exact: true })).toHaveValue(
    "50"
  );

  const opacitySlider = textColorPanel.getByRole("slider", { name: "Opacity", exact: true });
  const opacityBox = await opacitySlider.boundingBox();
  expect(opacityBox).not.toBeNull();
  if (!opacityBox) {
    throw new Error("Expected opacity slider to have bounds.");
  }
  await page.mouse.move(
    opacityBox.x + opacityBox.width * 0.5,
    opacityBox.y + opacityBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    opacityBox.x + opacityBox.width * 0.25,
    opacityBox.y + opacityBox.height / 2
  );
  await page.mouse.up();
  await expect.poll(async () => getColorAlpha(editableHeading)).toBeLessThan(0.3);
  await expect.poll(async () => getColorAlpha(editableHeading)).toBeGreaterThan(0.2);

  const blueTextColor = page.getByRole("button", {
    name: "Use Text color #3B82F6",
    exact: true,
  });
  await expect(blueTextColor).toBeVisible();
  await blueTextColor.click();
  await expect(page.locator('[data-slot="popover-content"]')).toBeVisible();
  await expect.poll(async () => getColorAlpha(editableHeading)).toBeLessThan(0.3);
  await expect.poll(async () => getColorAlpha(editableHeading)).toBeGreaterThan(0.2);

  await toolbar.getByRole("button", { name: "Background color", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Color", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Gradient", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Gradient", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  const colorPanel = page.getByRole("tabpanel", { name: "Color", exact: true });
  await expect(colorPanel.getByRole("slider", { name: "Hue", exact: true })).toBeVisible();
  const hueSlider = colorPanel.getByRole("slider", { name: "Hue", exact: true });
  const hueBox = await hueSlider.boundingBox();
  expect(hueBox).not.toBeNull();
  if (!hueBox) {
    throw new Error("Expected hue slider to have bounds.");
  }
  await page.mouse.click(hueBox.x + hueBox.width * 0.3, hueBox.y + hueBox.height / 2);
  await expect(colorPanel.getByRole("slider", { name: "Hue", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Gradient", exact: true }).click();
  const backgroundGradient = page.getByRole("button", {
    name: "Use Background color gradient 1",
    exact: true,
  });
  await expect(backgroundGradient).toBeVisible();
  await backgroundGradient.click();
  await expect(page.getByRole("tab", { name: "Gradient", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply gradient", exact: true })).toHaveCount(0);
  await expectInlineStyle(
    editableHeading,
    "background-image",
    "linear-gradient(135deg, rgb(168, 85, 247), rgb(236, 72, 153))"
  );
  await expect
    .poll(async () => getBackgroundIconStyle(toolbar))
    .toContain("linear-gradient(135deg, rgb(168, 85, 247), rgb(236, 72, 153))");

  const gradientAngle = page.getByRole("slider", { name: "Gradient angle", exact: true });
  await expect(gradientAngle).toHaveValue("135");
  await gradientAngle.fill("220");
  await expectInlineStyle(
    editableHeading,
    "background-image",
    "linear-gradient(220deg, rgb(168, 85, 247), rgb(236, 72, 153))"
  );
  await expect
    .poll(async () => getBackgroundIconStyle(toolbar))
    .toContain("linear-gradient(220deg, rgb(168, 85, 247), rgb(236, 72, 153))");

  const gradientStart = page.getByLabel("Gradient start", { exact: true });
  await gradientStart.fill("10B981");
  await expectInlineStyle(
    editableHeading,
    "background-image",
    "linear-gradient(220deg, rgb(16, 185, 129), rgb(236, 72, 153))"
  );

  await toolbar.getByRole("button", { name: "Border style", exact: true }).click();
  const strongBorder = page.getByRole("button", { name: "Strong", exact: true });
  await expect(strongBorder).toBeVisible();
  await strongBorder.click();
  await expectInlineStyle(editableHeading, "border", "2px solid rgba(15, 23, 42, 0.22)");
  await toolbar.getByRole("button", { name: "Border radius", exact: true }).click();
  const roundRadius = page.getByRole("button", { name: "Round", exact: true });
  await expect(roundRadius).toBeVisible();
  await roundRadius.click();
  await expectInlineStyle(editableHeading, "border-radius", "18px");
  await toolbar.getByRole("button", { name: "Border radius", exact: true }).click();
  const customRadius = page.getByLabel("Custom radius", { exact: true });
  await expect(customRadius).toBeVisible();
  await customRadius.fill("24");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expectInlineStyle(editableHeading, "border-radius", "24px");

  await toolbar.getByRole("button", { name: "Shadow", exact: true }).click();
  const liftedShadow = page.getByRole("button", { name: "Lifted", exact: true });
  await expect(liftedShadow).toBeVisible();
  await liftedShadow.click();
  await expectInlineStyle(editableHeading, "box-shadow", "rgba(15, 23, 42, 0.18) 0px 18px 42px");
});

async function getColorAlpha(locator: Locator) {
  const color = await locator.evaluate((node) => (node as HTMLElement).style.color);
  const match = /rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/i.exec(color);
  return match ? Number.parseFloat(match[1] ?? "1") : 1;
}

async function getBackgroundIconStyle(toolbar: Locator) {
  return toolbar.getByTestId("floating-toolbar-background-color-icon").evaluate((node) => {
    return (node as HTMLElement).style.background;
  });
}

test("image floating toolbar hides text tools and exposes crop plus appearance controls", async ({
  page,
}) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 7").click();

  const frame = coverFrame(page);
  const editableImage = frame.locator('[data-editor-id="image-5"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableImage.click({ position: { x: 24, y: 24 } });
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByLabel("Font", { exact: true })).toBeHidden();
  await expect(
    toolbar.getByRole("button", { name: "Increase font size", exact: true })
  ).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Bold", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Italic", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Line height", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Text align", exact: true })).toBeHidden();

  await expect(toolbar.getByRole("button", { name: "Crop image", exact: true })).toBeVisible();
  await expect(
    toolbar.getByRole("button", { name: "Background color", exact: true })
  ).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Border style", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Border radius", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Shadow", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Other", exact: true })).toBeVisible();

  await toolbar.getByRole("button", { name: "Crop image", exact: true }).click();
  await expectInlineStyle(editableImage, "object-fit", "cover");
});

test("floating toolbar font family select changes the selected text font", async ({ page }) => {
  await gotoEditor(page);

  const editableHeading = coverFrame(page).locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const fontInput = toolbar.getByLabel("Font", { exact: true });
  const fontMenu = page.getByTestId("floating-font-menu");
  const fontMenuScroll = page.getByTestId("floating-font-menu-scroll");

  await editableHeading.click();
  await expect(toolbar).toBeVisible();
  await expect(fontInput).toBeVisible();
  const fontInputBox = await fontInput.boundingBox();
  expect(fontInputBox?.width).toBeLessThanOrEqual(140);
  const beforeFont = await getComputedStyleValue(editableHeading, "font-family");

  await fontInput.click();
  await expect(fontMenu).toBeVisible();
  await expect(fontMenuScroll).toHaveCSS("height", "224px");

  const toolbarBox = await toolbar.boundingBox();
  const menuBox = await fontMenu.boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  if (!toolbarBox || !menuBox) {
    throw new Error("Expected toolbar and font menu bounds.");
  }
  expect(
    menuBox.y >= toolbarBox.y + toolbarBox.height || menuBox.y + menuBox.height <= toolbarBox.y
  ).toBeTruthy();

  await fontInput.fill("Geo");
  const georgiaOption = fontMenu.getByRole("button", { name: "Georgia", exact: true });
  await expect(georgiaOption).toBeVisible();
  await expect(fontMenu.getByRole("button", { name: "Inter", exact: true })).toBeHidden();
  await georgiaOption.hover();
  await expect(fontInput).toHaveValue("Georgia");
  await expectInlineStyle(editableHeading, "font-family", 'Georgia, "Times New Roman", serif');
  await page.mouse.move(menuBox.x + menuBox.width + 12, menuBox.y + 12);
  await expect(fontInput).toHaveValue("Geo");
  await expectInlineStyle(editableHeading, "font-family", "");
  await georgiaOption.hover();
  await georgiaOption.click();

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
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("https://example.com/deck");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editableHeading).toHaveAttribute("data-link-url", "https://example.com/deck");

  await toolbar.getByRole("button", { name: "Other", exact: true }).click();
  await expect(page.getByRole("button", { name: "Alt text", exact: true })).toBeHidden();
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
  await expect(reloadedHeading).toHaveAttribute("aria-label", "Hero kicker label");
});

test("locked element only exposes unlock and blocks direct manipulation", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.click();
  await expect(selectionOverlay).toBeVisible();
  await toolbar.getByRole("button", { name: "Lock", exact: true }).click();
  await expect(editableHeading).not.toHaveAttribute("data-editor-locked", "true");

  await expect(toolbar.getByRole("button", { name: "Unlock", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Lock", exact: true })).toBeHidden();
  await expect(toolbar.getByLabel("Font", { exact: true })).toBeHidden();
  await expect(
    toolbar.getByRole("button", { name: "Increase font size", exact: true })
  ).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Bold", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Other", exact: true })).toBeHidden();
  await expect(page.getByTestId("block-resize-handle-bottom-right")).toBeHidden();

  const before = await getSlideElementRect(editableHeading);
  const overlayBefore = await selectionOverlay.boundingBox();
  if (!overlayBefore) {
    throw new Error("Expected selection overlay to have bounds before locked drag.");
  }

  await page.mouse.move(overlayBefore.x + 12, overlayBefore.y + 12);
  await page.mouse.down();
  await page.mouse.move(overlayBefore.x + 92, overlayBefore.y + 72, { steps: 8 });
  await page.mouse.up();

  const after = await getSlideElementRect(editableHeading);
  expect(after.x).toBeCloseTo(before.x, 0);
  expect(after.y).toBeCloseTo(before.y, 0);

  await toolbar.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(toolbar.getByRole("button", { name: "Lock", exact: true })).toBeVisible();
  await expect(toolbar.getByLabel("Font", { exact: true })).toBeVisible();
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

test("floating toolbar font size input clamps manual values and keeps step buttons working", async ({
  page,
}) => {
  await gotoEditor(page);

  const editableHeading = coverFrame(page).locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const fontSizeInput = toolbar.getByLabel("Font size", { exact: true });

  await editableHeading.click();
  await expect(fontSizeInput).toBeVisible();

  await fontSizeInput.fill("12");
  await expectInlineStyle(editableHeading, "font-size", "12px");

  await toolbar.getByRole("button", { name: "Decrease font size", exact: true }).click();
  await expectInlineStyle(editableHeading, "font-size", "10px");

  await fontSizeInput.fill("2");
  await fontSizeInput.press("Enter");
  await expectInlineStyle(editableHeading, "font-size", "8px");
  await expect(fontSizeInput).toHaveValue("8");

  await fontSizeInput.fill("240");
  await fontSizeInput.press("Enter");
  await expectInlineStyle(editableHeading, "font-size", "200px");
  await expect(fontSizeInput).toHaveValue("200");

  await toolbar.getByRole("button", { name: "Increase font size", exact: true }).click();
  await expectInlineStyle(editableHeading, "font-size", "200px");
  await expect(fontSizeInput).toHaveValue("200");
});
