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
  getInlineStyle,
  getSlideElementRect,
  gotoEditor,
  selectFontFamilyOption,
} from "./helpers";

test("full floating editor applies typography and paragraph controls", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
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
  const title = frame.locator('[data-editable-id="text-2"]');
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

async function expectToolbarButtonOrder(toolbar: Locator, labels: string[]) {
  const boxes = await Promise.all(
    labels.map(async (label) => {
      const box = await toolbar.getByRole("button", { name: label, exact: true }).boundingBox();
      if (!box) {
        throw new Error(`Expected ${label} toolbar button to have a bounding box.`);
      }
      return { box, label };
    })
  );

  for (let index = 1; index < boxes.length; index += 1) {
    expect(
      boxes[index]?.box.x,
      `${boxes[index]?.label} should follow ${boxes[index - 1]?.label}`
    ).toBeGreaterThan(boxes[index - 1]?.box.x ?? 0);
  }
}

test("full floating editor applies color and border controls", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
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

  await toolbar.getByTestId("floating-border-trigger").click();
  await expect(page.getByRole("tab", { name: "Style", exact: true })).toHaveAttribute(
    "data-state",
    "active"
  );
  await expect(page.getByText("Stroke Style", { exact: true })).toBeVisible();
  const solidBorder = page.getByRole("button", { name: "Solid", exact: true });
  await expect(solidBorder).toBeVisible();
  await expect(solidBorder).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Dashed", exact: true }).hover();
  await expectInlineStyle(editableHeading, "border-style", "dashed");
  await solidBorder.click();
  await expectInlineStyle(editableHeading, "border-style", "solid");
  await expect(solidBorder).toHaveAttribute("aria-pressed", "true");

  const strokeWeight = page.getByLabel("Stroke weight", { exact: true });
  await expect(strokeWeight).toBeVisible();
  await strokeWeight.fill("4");
  await expectInlineStyle(editableHeading, "border-width", "4px");
  const borderTriggerLine = toolbar.getByTestId("floating-border-trigger-line");
  await expect(borderTriggerLine).toHaveCSS("border-top-width", "4px");

  const cornerRadius = page.getByLabel("Corner radius", { exact: true });
  await cornerRadius.fill("18");
  await expectInlineStyle(editableHeading, "border-radius", "18px");

  const shadow = page.getByLabel("Shadow", { exact: true });
  await shadow.fill("12");
  await expectInlineStyle(editableHeading, "box-shadow", "rgba(15, 23, 42, 0.17) 0px 12px 28px");

  await page.getByRole("tab", { name: "Color", exact: true }).click();
  const blueBorderColor = page.getByRole("button", {
    name: "Use Border color #3B82F6",
    exact: true,
  });
  await expect(blueBorderColor).toBeVisible();
  await blueBorderColor.click();
  await expectInlineStyle(editableHeading, "border-color", "rgb(59, 130, 246)");
  await expect(borderTriggerLine).toHaveCSS("border-top-color", "rgb(59, 130, 246)");
});

test("floating border menu reflects selected element styles on first open", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableHeading.click();
  await editableHeading.evaluate((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    node.style.border = "14px dashed rgb(197, 157, 157)";
    node.style.borderRadius = "22px";
    node.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.17)";
  });
  await toolbar.getByTestId("floating-border-trigger").click();

  const noneBorder = page.getByRole("button", { name: "None", exact: true });
  const dashedBorder = page.getByRole("button", { name: "Dashed", exact: true });
  await expect(noneBorder.locator('[data-testid="floating-toolbar-option-preview"]')).toHaveCount(
    0
  );
  await expect(dashedBorder).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Stroke weight", { exact: true })).toHaveValue("14");
  await expect(page.getByLabel("Corner radius", { exact: true })).toHaveValue("22");
  await expect(page.getByLabel("Shadow", { exact: true })).toHaveValue("12");
  const borderTriggerLine = toolbar.getByTestId("floating-border-trigger-line");
  await expect(borderTriggerLine).toHaveCSS("border-top-style", "dashed");
  await expect(borderTriggerLine).toHaveCSS("border-top-width", "5px");
  await expect(borderTriggerLine).toHaveCSS("border-top-color", "rgb(197, 157, 157)");
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

test("image floating toolbar hides text and color tools and supports crop handles", async ({
  page,
}) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 16").click();

  const frame = coverFrame(page);
  const editableImage = frame.locator('[data-editable-id="crop-image"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableImage.click();
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
  await expect(toolbar.getByRole("button", { name: "Background color", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Text color", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Border", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Other", exact: true })).toBeVisible();

  await toolbar.getByRole("button", { name: "Crop image", exact: true }).click();
  await expectInlineStyle(editableImage, "object-fit", "cover");
  await expect(page.getByTestId("image-crop-overlay")).toBeVisible();
  await expect(page.getByTestId("image-crop-overlay")).toHaveCSS("border-radius", "48px");
  await expect(page.getByTestId("block-rotation-zone-top-left")).toBeHidden();
  await expect(page.getByTestId("block-resize-handle-top-left")).toBeHidden();

  const cropHandle = page.getByTestId("image-crop-handle-top-left");
  const handleBox = await cropHandle.boundingBox();
  if (!handleBox) {
    throw new Error("Expected crop handle to have bounds.");
  }
  await expect(cropHandle).toHaveCSS("cursor", /data:image\/svg\+xml.*nwse-resize/);
  const initialCropOverlay = await page.getByTestId("image-crop-overlay").boundingBox();
  if (!initialCropOverlay) {
    throw new Error("Expected crop overlay to have initial bounds.");
  }

  const handleCenter = {
    x: handleBox.x + handleBox.width / 2,
    y: handleBox.y + handleBox.height / 2,
  };

  await page.mouse.move(handleCenter.x, handleCenter.y);
  await page.mouse.down();
  await page.mouse.move(handleCenter.x + 72, handleCenter.y + 48, { steps: 6 });
  await expect
    .poll(
      async () => {
        const previewBox = await page.getByTestId("image-crop-overlay").boundingBox();
        return Boolean(
          previewBox &&
            previewBox.x > initialCropOverlay.x &&
            previewBox.y > initialCropOverlay.y &&
            previewBox.width < initialCropOverlay.width &&
            previewBox.height < initialCropOverlay.height
        );
      },
      { timeout: 1000 }
    )
    .toBe(true);
  const previewCropOverlay = await page.getByTestId("image-crop-overlay").boundingBox();
  if (!previewCropOverlay) {
    throw new Error("Expected crop overlay to update while dragging.");
  }
  expect(previewCropOverlay.x).toBeGreaterThan(initialCropOverlay.x);
  expect(previewCropOverlay.y).toBeGreaterThan(initialCropOverlay.y);
  expect(previewCropOverlay.width).toBeLessThan(initialCropOverlay.width);
  expect(previewCropOverlay.height).toBeLessThan(initialCropOverlay.height);
  await expect(page.getByText("saving...")).toBeHidden();
  await page.mouse.up();
  await expect(page.getByText("saving...")).toBeVisible();
  await expectInlineStyle(editableImage, "clip-path", "");
  await expect(page.getByTestId("image-crop-mask")).toBeVisible();
  await expect
    .poll(async () => parseInsetPercentages(await getInlineStyle(editableImage, "clip-path")), {
      timeout: 500,
    })
    .toBeNull();
  await frame.locator("body").click({ position: { x: 24, y: 24 } });
  await expect(page.getByTestId("image-crop-overlay")).toBeHidden();
  await expect
    .poll(async () => parseInsetPercentages(await getInlineStyle(editableImage, "clip-path")), {
      timeout: 2500,
    })
    .toEqual({
      top: expect.any(Number),
      right: 0,
      bottom: 0,
      left: expect.any(Number),
    });
  const topLeftCrop = parseInsetPercentages(await getInlineStyle(editableImage, "clip-path"));
  const croppedClipPath = await getInlineStyle(editableImage, "clip-path");
  expect(croppedClipPath).toContain("round 48px");
  expect(topLeftCrop.top).toBeGreaterThan(4);
  expect(topLeftCrop.left).toBeGreaterThan(4);
  await editableImage.click();
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole("button", { name: "Crop image", exact: true }).click();
  await expect(page.getByTestId("image-crop-overlay")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("image-crop-overlay")).toBeHidden();
  await expect(page.getByTestId("selection-overlay")).toBeVisible();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expectInlineStyle(editableImage, "clip-path", "");
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expectInlineStyle(editableImage, "clip-path", croppedClipPath);
});

function parseInsetPercentages(value: string) {
  const match = value.match(
    /^inset\((-?\d+(?:\.\d+)?)% (-?\d+(?:\.\d+)?)% (-?\d+(?:\.\d+)?)% (-?\d+(?:\.\d+)?)%(?: round .+)?\)$/
  );
  if (!match) {
    return null;
  }

  return {
    top: Number.parseFloat(match[1] ?? "0"),
    right: Number.parseFloat(match[2] ?? "0"),
    bottom: Number.parseFloat(match[3] ?? "0"),
    left: Number.parseFloat(match[4] ?? "0"),
  };
}

test("floating toolbar font family select changes the selected text font", async ({ page }) => {
  await gotoEditor(page);

  const editableHeading = coverFrame(page).locator('[data-editable-id="text-1"]');
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
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
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
  const reloadedHeading = coverFrame(page).locator('[data-editable-id="text-1"]');
  await expect(reloadedHeading).toHaveAttribute("data-link-url", "https://example.com/deck");
  await expect(reloadedHeading).toHaveAttribute("aria-label", "Hero kicker label");
});

test("locked element only exposes unlock and blocks direct manipulation", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
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
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
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
  const firstCard = frame.locator('[data-editable-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editable-id="snap-card-b"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const { selectionOverlay } = getHistoryControls(page);

  await firstCard.locator(".snap-drag-surface").click();
  await secondCard.locator(".snap-drag-surface").click({ modifiers: ["Shift"] });
  await expect(selectionOverlay).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Align", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Layer", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Distribute", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Group", exact: true })).toBeVisible();
  await expectToolbarButtonOrder(toolbar, ["Lock", "Group", "Align", "Layer", "Distribute"]);
  await expect(toolbar.getByRole("button", { name: "Duplicate", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Delete", exact: true })).toBeHidden();

  await toolbar.getByRole("button", { name: "Align", exact: true }).click();
  await page.getByRole("button", { name: "Align left", exact: true }).click();

  await toolbar.getByRole("button", { name: "Group", exact: true }).click();
  await expect(frame.locator('[data-editable-id="group-1"]')).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Ungroup", exact: true })).toBeVisible();
  await expectToolbarButtonOrder(toolbar, ["Lock", "Ungroup", "Other"]);
});

test("floating toolbar ungroup promotes snap cards without changing their dimensions", async ({
  page,
}) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 12").click();

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editable-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editable-id="snap-card-b"]');
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

  await expect(frame.locator('[data-editable-id="group-1"]')).toBeHidden();
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
  const cardA = frame.locator('[data-editable-id="snap-card-a"]');
  const cardB = frame.locator('[data-editable-id="snap-card-b"]');
  const cardC = frame.locator('[data-editable-id="snap-card-c"]');
  const cardD = frame.locator('[data-editable-id="snap-card-d"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const before = await Promise.all([cardA, cardB, cardC, cardD].map((card) => card.boundingBox()));
  for (const box of before) {
    expect(box).not.toBeNull();
  }

  await createGroupFromSnapCards(page, ["snap-card-a", "snap-card-b"]);
  const firstGroup = frame.locator('[data-editable-id="group-1"]');
  await createGroupFromSnapCards(page, ["snap-card-c", "snap-card-d"]);
  const secondGroup = frame.locator('[data-editable-id="group-2"]');

  await firstGroup.click({ position: { x: 8, y: 8 } });
  await secondGroup.click({ modifiers: ["Shift"], position: { x: 8, y: 8 } });
  await toolbar.getByRole("button", { name: "Group", exact: true }).click();

  await expect(frame.locator('[data-editable-id="group-3"]')).toBeVisible();
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
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
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

  const editableHeading = coverFrame(page).locator('[data-editable-id="text-1"]');
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
