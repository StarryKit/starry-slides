import { expect, test } from "@playwright/test";
import {
  MODIFIER,
  applyCustomCssProperty,
  clickFloatingToolbarButton,
  coverFrame,
  createGroupFromSnapCards,
  expectInlineStyle,
  getComputedStyleValue,
  getHeaderControls,
  getHistoryControls,
  gotoEditor,
  selectToolPanelOptionAndExpectInlineStyle,
} from "./helpers";

test("floating toolbar applies typography controls", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableHeading.click();
  await clickFloatingToolbarButton(page, "Font");
  await selectToolPanelOptionAndExpectInlineStyle(
    page,
    editableHeading,
    "Font family",
    'Georgia, "Times New Roman", serif',
    "font-family",
    'Georgia, "Times New Roman", serif'
  );

  await toolbar.getByLabel("Font size", { exact: true }).fill("44");
  await expectInlineStyle(editableHeading, "font-size", "44px");

  await toolbar.getByRole("button", { name: "Bold", exact: true }).click();
  await expectInlineStyle(editableHeading, "font-weight", "400");
  await toolbar.getByRole("button", { name: "Italic", exact: true }).click();
  await expectInlineStyle(editableHeading, "font-style", "italic");

  await page.keyboard.press("Escape");
  await editableHeading.click();
  await clickFloatingToolbarButton(page, "Paragraph");
  await toolbar.getByLabel("Line height", { exact: true }).fill("1.25");
  await expectInlineStyle(editableHeading, "line-height", "1.25");
  await toolbar.getByRole("button", { name: "Center", exact: true }).click();
  await expectInlineStyle(editableHeading, "text-align", "center");
});

test("floating toolbar applies appearance, layout, and custom css controls", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableHeading.click();
  await clickFloatingToolbarButton(page, "Size");
  await toolbar.getByLabel("Width", { exact: true }).fill("640px");
  await expectInlineStyle(editableHeading, "width", "640px");
  await toolbar.getByLabel("Height", { exact: true }).fill("120px");
  await expectInlineStyle(editableHeading, "height", "120px");

  await page.keyboard.press("Escape");
  await editableHeading.click();
  await clickFloatingToolbarButton(page, "Visibility");
  await toolbar.getByLabel("Opacity", { exact: true }).fill("0.75");
  await expectInlineStyle(editableHeading, "opacity", "0.75");

  await page.keyboard.press("Escape");
  await editableHeading.click();
  await clickFloatingToolbarButton(page, "Rotation");
  await toolbar.getByRole("spinbutton", { name: "Rotation", exact: true }).fill("12");
  await expectInlineStyle(editableHeading, "transform", "rotate(12deg)");

  await page.keyboard.press("Escape");
  await editableHeading.click();
  await clickFloatingToolbarButton(page, "Fill");
  await toolbar.getByRole("button", { name: "Use #EF4444", exact: true }).nth(1).click();
  await expectInlineStyle(editableHeading, "background-color", "rgb(239, 68, 68)");

  await page.keyboard.press("Escape");
  await editableHeading.click();
  await clickFloatingToolbarButton(page, "Border");
  await toolbar.getByRole("textbox", { name: "Border", exact: true }).fill("3px solid #112233");
  await expectInlineStyle(editableHeading, "border", "3px solid rgb(17, 34, 51)");
  await toolbar.getByRole("textbox", { name: "Border radius", exact: true }).fill("18px");
  await expectInlineStyle(editableHeading, "border-radius", "18px");

  await applyCustomCssProperty(page, "outline", "4px solid #445566");
  await expectInlineStyle(editableHeading, "outline", "rgb(68, 85, 102) solid 4px");
});

test("floating toolbar is the only primary element tooling surface", async ({ page }) => {
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
  await expect(
    floatingToolbarAnchor.getByRole("button", { name: "Font", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Use tool panel mode", exact: true })).toHaveCount(
    0
  );
  await expect(page.getByTestId("sidebar-tool-panel")).toHaveCount(0);

  await stagePanel.click({ position: { x: 12, y: 12 } });
  await expect(floatingToolbarAnchor).toBeHidden();
});

test("floating toolbar shows layout commands and omits duplicate/delete", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.click();
  await expect(toolbar).toBeVisible();

  await page.keyboard.press("Escape");
  await editableHeading.click();
  await clickFloatingToolbarButton(page, "Layer, Align, Distribute");
  await expect(toolbar.getByRole("button", { name: "Align left", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Bring to front", exact: true })).toBeVisible();
  await expect(
    toolbar.getByRole("button", { name: "Distribute horizontally", exact: true })
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await editableHeading.click();
  await clickFloatingToolbarButton(page, "Group");
  const groupMenu = toolbar.getByRole("menu");
  await expect(groupMenu.getByRole("button", { name: "Group", exact: true })).toBeDisabled();
  await expect(groupMenu.getByRole("button", { name: "Ungroup", exact: true })).toBeDisabled();
  await expect(groupMenu.getByRole("button", { name: "Duplicate", exact: true })).toBeHidden();
  await expect(groupMenu.getByRole("button", { name: "Delete", exact: true })).toBeHidden();

  await page.keyboard.press("Backspace");
  await expect(toolbar).toBeHidden();
  await expect(selectionOverlay).toBeHidden();
  await expect(editableHeading).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toBeVisible();
});

test("selected group toolbar only exposes layout and organization controls", async ({ page }) => {
  await gotoEditor(page);
  await createGroupFromSnapCards(page);

  const toolbar = page.getByTestId("floating-toolbar-anchor");
  await expect(toolbar.getByRole("button", { name: "Size", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Rotation", exact: true })).toBeVisible();
  await expect(
    toolbar.getByRole("button", { name: "Layer, Align, Distribute", exact: true })
  ).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Group", exact: true })).toBeVisible();
  await clickFloatingToolbarButton(page, "Group");
  await expect(
    toolbar.getByRole("menu").getByRole("button", { name: "Ungroup", exact: true })
  ).toBeEnabled();

  await expect(toolbar.getByRole("button", { name: "Font", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Paragraph", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Fill", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "Border", exact: true })).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "CSS", exact: true })).toBeHidden();
});

test("floating toolbar font size field does not remount the toolbar", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");

  await editableHeading.click();
  await expect(toolbar).toBeVisible();
  const originalFontSize = await getComputedStyleValue(editableHeading, "font-size");
  const expectedFontSize = `${Number.parseFloat(originalFontSize) + 2}px`;

  await editableHeading.click();
  await clickFloatingToolbarButton(page, "Font");
  const fontSizeField = toolbar.getByLabel("Font size", { exact: true });
  await fontSizeField.fill(String(Number.parseFloat(originalFontSize) + 2));
  await expectInlineStyle(editableHeading, "font-size", expectedFontSize);
  await editableHeading.click();
  await expect(toolbar.getByRole("button", { name: "Font", exact: true })).toBeVisible();
});
